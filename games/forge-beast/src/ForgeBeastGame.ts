import { HostObserver } from './integration/HostObserver';
import type { ForgeBeastEvent, ForgeBeastEventHandler } from './integration/HostEvents';
import { resolveStorage, type StorageOption } from './integration/StorageAdapter';
import { stateSummary } from './integration/StateSummary';
import { BattleNavigation } from './components/BattleNavigation';
import type { HapticEvent } from './systems/HapticsSystem';
import { DeviceView } from './components/DeviceView';
import { DeviceNavigation, type ButtonInput } from './components/DeviceNavigation';
import { debugCommand } from './components/DebugCommands';
import { STAT_KEYS } from './components/DebugPanel';
import { Engine } from './systems/Engine';
import { GameClock } from './systems/GameClock';
import { Persistence } from './systems/Persistence';
import { DeviceAudio, type SoundEvent } from './systems/Audio';
import { DeviceHaptics } from './systems/HapticsSystem';
import { newEggState, type ResetOptions } from './systems/ResetFlow';
import { clamp, careAlert } from './systems/Stats';
import type { PersonalityId } from './data/personalities';
import type { GameState, Stats } from './creatures/Creature';
import './styles/forge-beast.css';
export interface ForgeBeastOptions {
  mode?: 'standalone' | 'embedded';
  /** Compatibility alias; mode takes precedence. */
  embedded?: boolean;
  debug?: boolean;
  saveKey?: string;
  storage?: StorageOption;
  onEvent?: ForgeBeastEventHandler;
  onStateChange?: (state: GameState) => void;
}
/** Mount, feedback and host lifecycle orchestration; rules live in the systems. */
export class ForgeBeastGame {
  private engine: Engine;
  private view?: DeviceView;
  private root?: HTMLElement;
  private disposed = false;
  private tearingDown = false;
  private running = false;
  private runtimeFailed = false;
  private reportingError = false;
  private emitting = new Set<string>();
  private retainedUnsaved = false;
  private mountedBefore = false;
  private summaryKey = '';
  private observer = new HostObserver();
  private clock: GameClock;
  private persistence: Persistence;
  private navigation = new DeviceNavigation();
  private battleNavigation = new BattleNavigation();
  private lastBattleCue = '';
  private audio = new DeviceAudio(undefined, false);
  private haptics = new DeviceHaptics();
  private initialized = false;
  private hostPaused = false;
  private guideOpen = false;
  private autosaveAge = 0;
  private lastAlert: string | null = null;
  private lastStorageError = '';
  constructor(root?: HTMLElement, private options: ForgeBeastOptions = {}) {
    this.root = root;
    this.persistence = new Persistence(resolveStorage(options.storage), options.saveKey);
    this.engine = new Engine(this.persistence.load());
    this.observer.initialize(this.engine.state);
    this.clock = new GameClock(seconds => this.safely('clock', () => {
      this.engine.tick(seconds);
      if (this.engine.event === 'expedition') this.returnFeedback();
      else if (this.engine.event) {
        this.audio.play('evolution'); this.haptics.play('evolution');
      }
      const alert = careAlert(this.engine.state);
      if (alert && alert !== this.lastAlert && !this.engine.state.sleeping && !this.engine.state.exploration.active && !this.engine.state.combat.active && !this.engine.state.combat.encounter) {
        this.audio.play('alert'); this.haptics.play('alert');
      }
      this.lastAlert = alert;
      if (this.engine.state.age - this.autosaveAge >= 5) this.save();
      this.render();
    }));
  }
  /** Legacy constructor(container).init() and factory.mount(container) share one lifecycle. */
  init() {
    if (!this.root) throw new Error('Forge Beast requires a mount container.');
    return this.mount(this.root);
  }
  mount(container: HTMLElement) {
    if (this.disposed || this.tearingDown) throw new Error('Forge Beast is destroyed. Create a new instance.');
    if (this.initialized) {
      if (container !== this.root) throw new Error('Unmount before changing containers.');
      return this;
    }
    const owner = mountedContainers.get(container);
    if (owner && owner !== this) throw new Error('This container already hosts Forge Beast.');
    this.root = container;
    if (this.mountedBefore && (!this.retainedUnsaved || this.runtimeFailed)) {
      const saved = this.persistence.load();
      if (saved || this.runtimeFailed) this.engine.reset(saved ?? undefined);
    }
    this.mountedBefore = true; this.runtimeFailed = false;
    this.navigation.reset(); this.battleNavigation.reset(); this.guideOpen = false;
    this.lastBattleCue = ''; this.summaryKey = '';
    this.observer.initialize(this.engine.state);
    this.view = new DeviceView(container, this.options.debug === true, this.options.mode ? this.options.mode === 'embedded' : !!this.options.embedded, error => this.reportError('layout', error));
    this.view!.mount(); this.initialized = true; mountedContainers.set(container, this);
    container.addEventListener('click', this.onClick);
    container.addEventListener('input', this.onInput);
    container.addEventListener('close', this.onDialogClose, true);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
    this.audio.lock(); this.audio.pause(); this.haptics.pause();
    if (this.persistence.error) {
      this.lastStorageError = this.persistence.error;
      this.reportError('storage', this.persistence.error);
      this.engine.feedback('Save needs recovery. Original data kept. Reset in Settings.');
    }
    this.save(); this.emit({ type: 'ready', payload: this.getStateSummary() });
    this.syncClock('mount'); this.render(); return this;
  }
  pause() {
    if (this.disposed || this.hostPaused) return;
    this.hostPaused = true; this.syncClock('host');
    if (this.initialized) this.save();
    this.render();
  }
  resume() {
    if (this.disposed) return;
    this.hostPaused = false; this.syncClock('host'); this.render();
  }
  save() {
    if (this.disposed) return false;
    const success = this.persistence.save(this.engine.state);
    this.retainedUnsaved = !success && this.persistence.enabled;
    this.autosaveAge = this.engine.state.age;
    this.emit({ type: 'save', payload: { success, summary: this.getStateSummary() } });
    if (success) this.lastStorageError = '';
    else if (this.persistence.enabled && this.persistence.error && this.lastStorageError !== this.persistence.error) {
      this.lastStorageError = this.persistence.error; this.reportError('storage', this.persistence.error);
    }
    return success;
  }
  /** Normal reset keeps preferences; direct reset() retains the original full-reset default. */
  reset(options: ResetOptions = {}) {
    if (this.disposed) return false;
    const candidate = newEggState(this.engine.state, options);
    const saved = this.persistence.save(candidate, { replaceInvalid: true });
    if (!saved && this.persistence.enabled) {
      if (this.navigation.resetFlow.pending) this.navigation.resetFlow.fail();
      else this.engine.feedback('Could not save a new egg. Try again.');
      this.render(); return false;
    }
    this.persistence.clearResetBackup();
    this.engine.reset(candidate); this.navigation.reset(); this.battleNavigation.reset(); this.lastBattleCue = '';
    this.lastAlert = null; this.autosaveAge = 0; this.retainedUnsaved = false;
    this.observer.initialize(this.engine.state);
    this.emit({ type: 'reset', payload: this.getStateSummary() });
    this.syncClock(); this.render(); return true;
  }
  getState(): GameState { return structuredClone(this.engine.state); }
  getStateSummary() { return stateSummary(this.engine.state, this.persistence.hasSave); }
  requestExit() {
    if (!this.disposed) this.emit({ type: 'exit-requested', payload: this.getStateSummary() });
  }
  /** Reusable teardown. Mount again with a dedicated container to resume the save. */
  unmount() {
    if (this.tearingDown) return;
    if (!this.initialized) { this.root = undefined; return; }
    this.tearingDown = true;
    this.stopActivity('unmount'); this.save();
    const root = this.root!;
    root.removeEventListener('click', this.onClick);
    root.removeEventListener('input', this.onInput);
    root.removeEventListener('close', this.onDialogClose, true);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    this.view?.destroy(); mountedContainers.delete(root);
    this.audio.destroy(); this.haptics.destroy();
    this.view = undefined; this.root = undefined; this.initialized = false; this.guideOpen = false;
    this.navigation.reset(); this.battleNavigation.reset(); this.lastBattleCue = '';
    this.tearingDown = false;
  }
  /** Terminal teardown. Repeated calls are harmless; use a fresh instance afterwards. */
  destroy() {
    if (this.disposed) return;
    this.unmount(); this.clock.destroy(); this.audio.destroy(); this.haptics.destroy();
    this.persistence.dispose(); this.options = {}; this.disposed = true;
  }
  private stopActivity(reason: 'host' | 'visibility' | 'guide' | 'reset' | 'unmount' | 'error') {
    this.clock.pause(); this.audio.pause(); this.haptics.pause(); this.view?.setPaused(true);
    if (this.running) { this.running = false; this.emit({ type: 'pause', payload: { reason } }); }
  }
  private syncClock(reason: 'host' | 'visibility' | 'mount' | 'internal' = 'internal') {
    const canRun = this.initialized && !this.tearingDown && !this.disposed && !this.hostPaused && !document.hidden && !this.guideOpen && !this.navigation.resetFlow.pending && !this.runtimeFailed;
    if (canRun) {
      this.audio.resume(); this.haptics.resume(); this.view?.setPaused(false); this.clock.resume();
      if (!this.running) { this.running = true; this.emit({ type: 'resume', payload: { reason } }); }
    } else this.stopActivity(this.runtimeFailed ? 'error' : this.hostPaused ? 'host' : document.hidden ? 'visibility' : this.guideOpen ? 'guide' : 'reset');
  }
  private emit(event: ForgeBeastEvent) {
    if (!this.options.onEvent || this.disposed || this.emitting.has(event.type)) return;
    this.emitting.add(event.type);
    try { this.options.onEvent(structuredClone(event)); }
    catch (error) { this.reportError('host-callback', error); }
    finally { this.emitting.delete(event.type); }
  }
  private reportError(subsystem: string, error: unknown, recoverable = true) {
    if (this.reportingError) return;
    this.reportingError = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Forge Beast / ${subsystem}] ${message}`);
    try { this.options.onEvent?.({ type: 'error', payload: { subsystem, message, recoverable } }); }
    catch { /* A failing host error handler cannot recursively crash its own application. */ }
    finally { this.reportingError = false; }
  }
  private safely(subsystem: string, work: () => void) {
    try { work(); }
    catch (error) {
      this.runtimeFailed = true; this.stopActivity('error');
      this.reportError(subsystem, error, false);
      if (this.root) {
        const message = this.root.querySelector('.fb-message');
        if (message) message.textContent = 'Device paused after an error. Exit and reopen safely.';
      }
      this.save(); // Persistence validates before writing; an invalid mutation cannot replace the save.
    }
  }
  private onVisibility = () => {
    if (document.hidden) this.save(); this.syncClock('visibility'); this.render();
  };
  private onPageShow = () => { this.syncClock('visibility'); this.render(); };
  private onPageHide = () => { this.stopActivity('visibility'); this.save(); };
  private onDialogClose = () => { this.guideOpen = false; this.syncClock(); this.render(); };
  private onInput = (event: Event) => this.safely('input', () => this.handleInput(event));
  private handleInput(event: Event) {
    if (!this.options.debug || !this.running) return;
    const input = event.target as HTMLInputElement;
    if (input.dataset.battleHp) {
      const battle = this.engine.state.combat.active, value = Number(input.value);
      if (!battle || battle.status !== 'ongoing' || !Number.isFinite(value)) return;
      const side = input.dataset.battleHp === 'player' ? 'player' : 'enemy';
      battle[side].hp = Math.max(0, Math.min(battle[side].maxHP, Math.round(value)));
      battle.beats = [];
      if (battle[side].hp === 0) this.engine.debugBattleResult(side === 'player' ? 'defeat' : 'victory');
    } else if (input.matches('.fb-debug-personality')) this.engine.debugPersonality(input.value as PersonalityId);
    else {
      const stat = input.dataset.stat as keyof Stats;
      const value = Number(input.value);
      if (!STAT_KEYS.includes(stat) || !Number.isFinite(value)) return;
      this.engine.state.stats[stat] = clamp(value);
    }
    this.save(); this.render();
  };
  private onClick = (event: Event) => this.safely('input', () => this.handleClick(event));
  private handleClick(event: Event) {
    if (!this.initialized || this.hostPaused || document.hidden || this.runtimeFailed) return;
    const command = (event.target as Element).closest<HTMLElement>('[data-command]')?.dataset.command;
    if (!command) return;
    if (command === 'exit') { this.requestExit(); return; }
    if (command === 'guide') {
      this.guideOpen = true; this.syncClock(); this.view!.guide(true); this.render(); return;
    }
    if (command === 'close-guide') {
      this.guideOpen = false; this.view!.guide(false); this.syncClock(); this.render(); return;
    }
    if (command === 'mute') { this.audio.unlock(); this.toggleMute(); this.save(); this.render(); return; }
    this.audio.unlock(); this.configureFeedback();
    if (['select', 'confirm', 'back'].includes(command)) {
      this.audio.play(command === 'confirm' ? 'confirm' : 'button');
      if (command === 'confirm') { this.haptics.play('confirm'); this.view!.confirmFeedback(); }
      if (this.engine.state.combat.encounter || this.engine.state.combat.active) {
        this.onBattleInput(command as ButtonInput); this.save(); this.render(); return;
      }
      const result = this.navigation.press(command as ButtonInput, this.engine.state.eventHistory.length, !!this.engine.state.exploration.active);
      if (result.toggle === 'sound') this.toggleMute();
      if (result.toggle === 'haptics') {
        this.engine.state.hapticsEnabled = !this.engine.state.hapticsEnabled;
        this.configureFeedback(); this.haptics.play('confirm');
      }
      if (result.reset) this.reset({ keepSettings: true });
      if (result.acknowledge) { this.engine.acknowledgeExpedition(); this.navigation.expeditionPage = null; }
      if (result.explore) {
        const departure = this.engine.explore(result.explore);
        if (departure.success) { this.navigation.expeditionPage = 'trip'; this.audio.play('play', .13); }
      }
      if (result.item) {
        const use = this.engine.useItem(result.item);
        this.navigation.itemConfirm = false;
        if (use.success) { this.navigation.inventoryOpen = false; this.audio.play(use.behavior === 'feed' ? 'feed' : use.behavior === 'train' ? 'training' : 'play', .13); }
      }
      if (result.hint) this.engine.feedback('A to choose · B to care · C to return');
      if (result.action) {
        const wasSleeping = this.engine.state.sleeping;
        const outcome = this.engine.action(result.action);
        if (outcome.success) {
          const sound: SoundEvent = result.action === 'sleep' ? wasSleeping ? 'wake' : 'sleep' : result.action === 'train' ? 'training' : result.action;
          this.audio.play(sound, .13);
        }
      }
    }
    if (this.options.debug && command.startsWith('debug-')) {
      const species = this.engine.state.species;
      const previousResult = this.engine.state.exploration.result;
      debugCommand(command, this.root!, this.engine, () => { this.reset(); }, () => this.navigation.openReset());
      if (previousResult !== this.engine.state.exploration.result && this.engine.state.exploration.result) this.returnFeedback();
      if (species !== this.engine.state.species && command !== 'debug-reset') {
        this.audio.play('evolution'); this.haptics.play('evolution');
      }
    }
    this.syncClock(); this.save(); this.render();
  };
  private onBattleInput(input: ButtonInput) {
    const choice = this.battleNavigation.press(this.engine.state, input);
    if (choice.enter) { if (this.engine.enterBattle().success) this.battleNavigation.reset(); }
    if (choice.retreat) { this.engine.retreatEncounter(); this.battleNavigation.reset(); }
    if (choice.action) this.engine.battleAction(choice.action);
    if (choice.acknowledge) { this.engine.acknowledgeBattle(); this.navigation.reset(); this.battleNavigation.reset(); }
  }
  private battleFeedback() {
    if (!this.running) return;
    const active = this.engine.state.combat.active, frame = this.engine.battleFrame;
    if (!active || !frame) { this.lastBattleCue = ''; return; }
    const key = `${active.startedAt}:${active.beatStartedAge}:${active.turn}:${frame.index}`;
    if (key === this.lastBattleCue) return;
    this.lastBattleCue = key;
    const sounds: Record<string, SoundEvent> = { entry: 'battle-start', attack: 'attack', guard: 'guard', skill: 'skill', hit: 'hit', critical: 'critical', dodge: 'button', victory: 'victory', defeat: 'defeat', escape: 'wake' };
    this.audio.play(sounds[frame.beat.animation]);
    const haptic: HapticEvent | undefined = frame.beat.animation === 'critical' ? 'critical' : frame.beat.animation === 'victory' ? 'victory' : frame.beat.animation === 'attack' ? 'attack' : undefined;
    if (haptic) this.haptics.play(haptic);
  }
  private returnFeedback() {
    const result = this.engine.state.exploration.result;
    this.audio.play(result?.rare ? 'evolution' : result?.failed ? 'alert' : 'confirm');
    this.haptics.play(result?.rare ? 'evolution' : 'confirm');
    this.save();
  }
  private configureFeedback() {
    this.audio.muted = this.engine.state.muted;
    this.haptics.enabled = this.engine.state.hapticsEnabled;
  }
  private toggleMute() {
    this.engine.state.muted = !this.engine.state.muted;
    this.audio.muted = this.engine.state.muted;
    if (!this.audio.muted) this.audio.play('button');
  }
  private render() { this.safely('render', () => this.updateView()); }
  private updateView() {
    if (!this.initialized) return;
    this.configureFeedback();
    this.battleFeedback();
    const nav = this.navigation;
    if (this.engine.state.exploration.result && !this.engine.animation && !nav.resetFlow.pending && !this.engine.state.combat.active && !this.engine.state.combat.encounter) {
      nav.expeditionPage = 'result'; nav.statusPage = null; nav.inventoryOpen = false; nav.selected = 5;
    }
    this.view!.update(this.engine, {
      battleSelected: this.battleNavigation.actionIndex, encounterChoice: this.battleNavigation.encounterChoice,
      expeditionPage: nav.expeditionPage, zoneIndex: nav.zoneIndex, inventoryOpen: nav.inventoryOpen, itemIndex: nav.itemIndex, itemConfirm: nav.itemConfirm,
      selected: nav.selected, statusPage: nav.statusPage, logOffset: nav.logOffset,
      settingIndex: nav.settingIndex, resetFlow: nav.resetFlow,
      paused: !this.running,
      saveAvailable: this.persistence.available,
    });
    this.observer.observe(this.engine.state, event => this.emit(event));
    const summary = this.getStateSummary(), key = JSON.stringify(summary);
    if (key !== this.summaryKey) {
      this.summaryKey = key; this.emit({ type: 'game-state-change', payload: summary });
    }
    try { this.options.onStateChange?.(this.getState()); }
    catch (error) { this.reportError('host-callback', error); }
  }
}

/** Container ownership is weak: detached mounts are never retained globally. */
const mountedContainers = new WeakMap<HTMLElement, ForgeBeastGame>();
export function createForgeBeast(options: ForgeBeastOptions = {}) {
  return new ForgeBeastGame(undefined, options);
}
