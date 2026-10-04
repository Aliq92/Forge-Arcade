import { battleMarkup, battleMenuMarkup, battleMessage } from './BattleView';
import { expeditionMarkup, tripMarkup, type ExpeditionPage } from './ExplorationView';
import { inventoryMarkup } from './InventoryView';
import { SPECIES, type GameState } from '../creatures/Creature';
import { creatureSprite, landscape } from '../creatures/sprites';
import { icon } from '../assets/icons';
import { careAlert } from '../systems/Stats';
import { restingMessage } from '../systems/ReactionSystem';
import { statusMarkup, formatAge } from './StatusView';
import { MotionSystem } from './MotionSystem';
import type { SettingsModel } from './SettingsView';
import { MENU } from './DeviceNavigation';
export { MENU } from './DeviceNavigation';
import { debugMarkup, updateDebugPanel } from './DebugPanel';
export { STATUS_PAGES } from './StatusView';
import { TIMING } from '../data/config';
import type { Engine } from '../systems/Engine';
export interface ViewModel extends SettingsModel {
  selected: number;
  battleSelected: number;
  encounterChoice: number;
  expeditionPage: ExpeditionPage;
  zoneIndex: number;
  inventoryOpen: boolean;
  itemIndex: number;
  itemConfirm: boolean;
  statusPage: number | null;
  paused: boolean;
  saveAvailable: boolean;
  logOffset: number;
}
export class DeviceView {
  private mounted = false;
  private resizeObserver?: ResizeObserver;
  private lastSpecies = '';
  private lastStatusPage: number | null = null;
  private lastAlert = false;
  private combatMenu = false;
  private panelMarkup = '';
  private menuMarkup = '';
  private lastPanel = '';
  private motion = new MotionSystem();
  constructor(
    private root: HTMLElement,
    private debug: boolean,
    private embedded = false,
    private onError: (error: unknown) => void = error => console.error('[Forge Beast / layout]', error)
  ) {}
  mount() {
    this.mounted = true;
    this.root.classList.add('forge-beast');
    if (this.embedded) this.root.classList.add('fb-embedded');
    this.resetCaches();
    this.root.innerHTML = `
    <div class="fb-app">
      <header class="fb-header">
        <button class="fb-brand" data-command="exit" aria-label="Request Forge Arcade exit"><span class="fb-brand-mark"><i></i><i></i><i></i><i></i></span><span>FORGE<span class="fb-brand-sub">ARCADE</span></span></button>
        <span class="fb-header-center">SMALL GAMES. BIG WORLDS.</span>
        <div class="fb-header-tools"><button class="fb-guide-toggle" data-command="guide">Field guide <span class="fb-guide-arrow">${icon('arrow')}</span></button><span class="fb-header-divider"></span><button class="fb-sound-toggle" data-command="mute" aria-label="Mute device">${icon('sound')}</button></div>
      </header>
      <main class="fb-main">
        <div class="fb-intro"><div class="fb-eyebrow"><span></span> YOUR POCKET COMPANION</div><h1>A little life in your hands.</h1><p>Hatch a spark. Raise a beast. See who they become.</p></div>
        <div class="fb-workbench">
          <aside class="fb-left-note"><span class="fb-note-number">01 / THE BEGINNING</span><h2>Every legend<br>starts small.</h2><p>A little care, a little curiosity.<br>Your choices shape the<br>creature within.</p><div class="fb-note-line"></div><span class="fb-label">ONE EGG. FOUR POSSIBILITIES.</span><div class="fb-mini-beasts">${['cragox', 'zephlet', 'runewisp', 'bramblejaw'].map(s => `<div>${creatureSprite(s as keyof typeof SPECIES)}</div>`).join('')}</div><span class="fb-note-caption">Who will you discover?</span></aside>
          <section class="fb-device" aria-label="Forge Beast handheld device">
            <span class="fb-screw fb-screw-tl"></span><span class="fb-screw fb-screw-tr"></span><span class="fb-screw fb-screw-bl"></span><span class="fb-screw fb-screw-br"></span>
            <div class="fb-device-top"><div class="fb-device-wordmark">FORGE<span>BEAST</span><span class="fb-wordmark-dot">®</span></div><span class="fb-power"><i></i> LINK ACTIVE</span></div>
            <div class="fb-screen-bezel"><div class="fb-bezel-top"><span>VIRTUAL LIFE SYSTEM</span><span>FB—01</span></div>
              <div class="fb-lcd">
                <div class="fb-lcd-top"><span class="fb-stage"><i></i> EGG</span><span class="fb-lcd-age">00:00</span><span class="fb-battery"><i></i><i></i><i></i></span></div>
                <div class="fb-creature-label"><h2>CINDER EGG</h2><span>A NEW BEGINNING</span></div>
                <div class="fb-world">${landscape}<span class="fb-float fb-float-left">✦</span><div class="fb-sprite-wrap"></div><span class="fb-float fb-float-right">✦</span><span class="fb-zzz" aria-hidden="true"><i>z</i><i>Z</i><i>z</i></span><span class="fb-food" aria-hidden="true"></span><span class="fb-exertion" aria-hidden="true">· ·</span><span class="fb-joy" aria-hidden="true">✦</span><div class="fb-trip-display" hidden></div><span class="fb-trail-spark" aria-hidden="true">✦</span><span class="fb-reaction-cue" aria-hidden="true"></span><div class="fb-status-panel" hidden></div><div class="fb-pause-overlay" hidden>LINK PAUSED<span>Your little world is waiting.</span></div></div>
                <div class="fb-message" role="status" aria-live="polite"></div>
                <div class="fb-menu" aria-label="Care actions">${MENU.map((action, i) => `<div class="fb-menu-item${i === 0 ? ' is-selected' : ''}" data-menu="${i}">${icon(action)}<span>${action}</span><i></i></div>`).join('')}</div>
              </div>
              <div class="fb-bezel-bottom"><span class="fb-lcd-mark">DOT MATRIX DISPLAY</span><span class="fb-bezel-dots">● ● ●</span></div>
            </div>
            <div class="fb-buttons">${[
              ['A', 'SELECT', 'select'],
              ['B', 'CONFIRM', 'confirm'],
              ['C', 'BACK', 'back'],
            ]
              .map(
                ([letter, label, command]) =>
                  `<div class="fb-button-column"><button class="fb-device-button fb-button-${letter.toLowerCase()}" data-command="${command}" aria-label="${letter}: ${label.toLowerCase()}">${letter}</button><span>${label}</span></div>`
              )
              .join('')}</div>
            <div class="fb-device-bottom"><div class="fb-model">POCKET SERIES <b>01</b><span>BUILT TO BECOME.</span></div><div class="fb-speaker" aria-hidden="true">${'<i></i>'.repeat(5)}</div></div>
          </section>
          <aside class="fb-right-note"><div class="fb-live-label"><span></span> LITTLE WORLD, LIVE</div><h2 class="fb-side-title">Something's<br>stirring.</h2><p class="fb-side-description">Your egg is warm and safe.<br>Stay a while. A new friend<br>is almost here.</p><div class="fb-growth"><div><span class="fb-growth-label">HATCHING</span><span class="fb-growth-hint">IN PROGRESS</span></div><div class="fb-growth-track"><i></i></div></div><div class="fb-save-note">${icon('spark')}<span>Little moments, remembered.<small>Progress saves automatically.</small></span></div></aside>
        </div>
        <div class="fb-below-device"><span class="fb-connection"><i></i> <span class="fb-save-status">YOUR PROGRESS IS SAVED</span></span><span class="fb-version">V0.5.1 · ARCADE READY</span></div>
        <div class="fb-controls-guide"><span>THREE BUTTONS. A WORLD TO GROW.</span><div><b>A</b> Choose <i></i><b>B</b> Care <i></i><b>C</b> Go back</div></div>
      </main>
      <footer class="fb-footer"><span>MADE OF PIXELS. RAISED WITH CARE.</span><span>AN ORIGINAL FORGE ARCADE EXPERIENCE <span>+</span></span></footer>
      <dialog class="fb-guide"><button data-command="close-guide" class="fb-dialog-close" aria-label="Close field guide">${icon('close')}</button><div class="fb-eyebrow">FORGE BEAST / FIELD GUIDE</div><h2>A small spark.<br>A growing friendship.</h2><p>Your Cinder egg hatches after about 45 seconds together. Pipkin then grows for four minutes of active play before discovering a new form.</p><div class="fb-guide-actions">${MENU.map(action => `<div>${icon(action)}<b>${action}</b><span>${{ feed: 'Emberberries fill a hungry belly. Too many can be a little much.', train: 'Build strength. Training uses energy and works up an appetite.', play: 'Spend time together to brighten your beast’s mood.', sleep: 'Let your beast recharge. Choose Sleep again to wake them.', explore: 'Choose Greenfield, Scrap Yard or Dark Grove. B chooses a path, then B sends your beast. Trips use active time and energy. Wild encounters offer Battle or Run. In battle, A chooses Attack, Guard, Skill or Run; B acts, C chooses Run. Guard restores stamina. Good care helps; defeat never erases your beast.', items: 'Browse six little finds with A. B chooses an item; B again uses it. C backs out. Strange Fragments can be inspected and kept.', status: 'Check vitals, growth, sound, wellbeing, and recent moments. A changes pages; B browses older moments. Settings includes sound, optional haptics, and a confirmed new-egg reset.' }[action]}</span></div>`).join('')}</div><p>Every beast has a hidden temperament. Get to know their little habits. Training builds discipline; food, company and rest support health. There are four original forms to discover. Time pauses when you leave; your progress is saved on this device.</p><button class="fb-guide-done" data-command="close-guide">LET'S GROW ${icon('arrow')}</button></dialog>
      ${this.debug ? debugMarkup() : ''}
    </div>`;
    if (this.embedded && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => { try { this.fitContainer(); } catch (error) { this.onError(error); } });
      this.resizeObserver.observe(this.root);
      this.resizeObserver.observe(this.el('.fb-device'));
      this.fitContainer();
    }
  }
  private resetCaches() {
    this.lastSpecies = ''; this.lastStatusPage = null; this.lastAlert = false;
    this.combatMenu = false; this.panelMarkup = ''; this.menuMarkup = ''; this.lastPanel = '';
  }
  private fitContainer() {
    if (!this.mounted) return;
    const app = this.el('.fb-app'), device = this.el('.fb-device');
    const width = this.root.clientWidth, height = this.root.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(1, Math.max(0, (width - 16) / device.offsetWidth), Math.max(0, (height - 16) / device.offsetHeight));
    app.style.setProperty('--fb-device-scale', String(scale));
  }
  setPaused(paused: boolean) {
    this.root.classList.toggle('fb-paused', paused);
    this.motion.setPaused(paused);
  }
  private el<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.root.querySelector<T>(selector)!;
  }
  update(engine: Engine, model: ViewModel) {
    const s = engine.state,
      species = SPECIES[s.species];
    if (s.species !== this.lastSpecies) {
      this.el('.fb-sprite-wrap').innerHTML = creatureSprite(s.species);
      this.lastSpecies = s.species;
    }
    this.el('.fb-stage').innerHTML = `<i></i> ${s.stage.toUpperCase()}`;
    this.el('.fb-lcd-age').textContent = formatAge(s.age);
    this.el('.fb-creature-label h2').textContent = species.name.toUpperCase();
    this.el('.fb-creature-label > span').textContent =
      s.stage === 'egg'
        ? 'A NEW BEGINNING'
        : s.stage === 'baby'
          ? 'A LITTLE SPARK OF POTENTIAL'
          : `${species.type.toUpperCase()} · FULL OF POSSIBILITY`;
    this.el('.fb-world').dataset.behavior = s.sleeping
      ? 'sleep'
      : engine.behavior;
    this.el('.fb-world').dataset.stage = s.stage;
    const frame = engine.animation;
    const world = this.el('.fb-world');
    world.dataset.combat = String(!!(s.combat.encounter || s.combat.active));
    world.dataset.expedition = s.exploration.active ? frame?.kind === 'depart' ? 'leaving' : 'traveling' : '';
    world.dataset.zone = s.exploration.active?.zone ?? s.exploration.result?.zone ?? '';
    const tripDisplay = this.el('.fb-trip-display');
    tripDisplay.hidden = !s.exploration.active;
    tripDisplay.innerHTML = tripMarkup(s);
    world.dataset.action = frame?.kind ?? '';
    world.dataset.phase = frame?.phase ?? '';
    world.dataset.outcome = frame?.outcome ?? '';
    world.dataset.sequence = String(frame?.sequence ?? 0);
    const combatActive = !!(s.combat.encounter || s.combat.active);
    const message = combatActive ? (engine.message && !engine.battleFrame ? engine.message : battleMessage(s)) : engine.message || (s.exploration.active ? 'Small steps. A whole world of surprises.' : restingMessage(s));
    const cues: Partial<Record<string, string>> = { hungry: '…?', tired: 'z', happy: '♪', sick: '+', upset: '!', excited: '✦', restless: '↔' };
    this.el('.fb-reaction-cue').textContent = cues[engine.behavior] ?? '';
    if (this.el('.fb-message').textContent !== message)
      this.el('.fb-message').textContent = message;
    const alert = !combatActive && !s.exploration.active && !!careAlert(s);
    this.el('.fb-message').classList.toggle('is-alert', alert);
    if (alert && !this.lastAlert) this.motion.play(this.el('.fb-message'), 'appear');
    this.lastAlert = alert;
    const selected = model.selected;
    const combatMenu = battleMenuMarkup(s, model.battleSelected);
    const menu = this.el('.fb-menu');
    menu.setAttribute('aria-label', combatMenu !== null ? 'Battle actions' : 'Care actions');
    if (combatMenu !== null) {
      if (this.menuMarkup !== combatMenu) { menu.innerHTML = combatMenu; this.menuMarkup = combatMenu; }
      this.combatMenu = true;
    } else {
      if (this.combatMenu) {
        menu.innerHTML = MENU.map((action, i) => `<div class="fb-menu-item" data-menu="${i}">${icon(action)}<span>${action}</span><i></i></div>`).join('');
        this.combatMenu = false; this.menuMarkup = '';
      }
      this.root.querySelectorAll('.fb-menu-item').forEach((el, i) => {
        (el as HTMLElement).hidden = i < Math.max(0, selected - 4) || i >= Math.max(0, selected - 4) + 5;
        el.classList.toggle('is-selected', i === selected); el.setAttribute('aria-current', String(i === selected));
      });
      this.el('.fb-menu-item[data-menu="3"] span').textContent = s.sleeping ? 'wake' : 'sleep';
    }
    this.el('.fb-pause-overlay').hidden = !model.paused;
    this.el('.fb-power').classList.toggle('is-paused', model.paused);
    this.el('.fb-power').innerHTML =
      `<i></i> ${model.paused ? 'LINK PAUSED' : 'LINK ACTIVE'}`;
    this.el('.fb-sound-toggle').innerHTML = icon(s.muted ? 'mute' : 'sound');
    this.el('.fb-sound-toggle').setAttribute(
      'aria-label',
      s.muted ? 'Unmute device' : 'Mute device'
    );
    this.el('.fb-save-status').textContent = model.saveAvailable
      ? 'YOUR PROGRESS IS SAVED'
      : 'SAVE UNAVAILABLE · KEEP THIS TAB OPEN';
    this.el('.fb-side-title').innerHTML =
      s.stage === 'egg'
        ? "Something's<br>stirring."
        : s.stage === 'baby'
          ? 'Hello, little<br>spark.'
          : 'A new kind<br>of wonderful.';
    this.el('.fb-side-description').textContent =
      s.stage === 'egg'
        ? 'Your egg is warm and safe. Stay a while. A new friend is almost here.'
        : species.description;
    this.el('.fb-growth-label').textContent =
      s.stage === 'egg'
        ? 'HATCHING'
        : s.stage === 'baby'
          ? 'GROWING'
          : 'EVOLVED';
    this.el('.fb-growth-hint').textContent =
      s.stage === 'evolved' ? species.type.toUpperCase() : 'IN PROGRESS';
    const progress =
      s.stage === 'evolved'
        ? 100
        : Math.min(
            100,
            (s.stageAge /
              (s.stage === 'egg' ? TIMING.hatch : TIMING.evolution)) *
              100
          );
    this.el('.fb-growth-track i').style.width = `${progress}%`;
    this.renderPanel(s, model, progress);
    if (this.debug) updateDebugPanel(this.root, s);
  }
  private renderPanel(s: GameState, model: ViewModel, progress: number) {
    const panel = this.el('.fb-status-panel');
    const combat = s.combat.encounter || s.combat.active;
    const html = combat ? battleMarkup(s, model.encounterChoice, model.battleSelected) : model.inventoryOpen ? inventoryMarkup(s, model.itemIndex, model.itemConfirm)
      : model.expeditionPage ? expeditionMarkup(s, model.expeditionPage, model.zoneIndex)
      : model.statusPage !== null ? statusMarkup(s, model.statusPage, progress, model.logOffset, model) : null;
    panel.hidden = html === null;
    if (html === null) { if (this.panelMarkup) panel.replaceChildren(); this.panelMarkup = ''; this.lastStatusPage = null; this.lastPanel = ''; return; }
    panel.classList.toggle('fb-combat-panel', !!combat);
    if (this.panelMarkup !== html) { panel.innerHTML = html; this.panelMarkup = html; }
    const key = combat ? `combat:${s.combat.encounter ? 'encounter' : s.combat.active?.status}` : model.inventoryOpen ? `items:${model.itemIndex}:${model.itemConfirm}` : model.expeditionPage ? `${model.expeditionPage}:${model.zoneIndex}` : `status:${model.statusPage}`;
    if (key !== this.lastPanel || model.statusPage !== this.lastStatusPage) this.motion.play(panel, 'page');
    this.lastPanel = key; this.lastStatusPage = model.statusPage;
  }
  confirmFeedback() { this.motion.play(this.el('.fb-lcd'), 'confirm'); }
  guide(open: boolean) {
    const dialog = this.el<HTMLDialogElement>('.fb-guide');
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }
  destroy() {
    this.mounted = false;
    this.resizeObserver?.disconnect(); this.resizeObserver = undefined;
    this.motion.destroy();
    this.root.innerHTML = '';
    this.root.classList.remove('forge-beast', 'fb-embedded', 'fb-paused');
  }
}
