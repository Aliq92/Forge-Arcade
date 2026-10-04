import { startBattle, resolveTurn, finishBattle, acknowledgeBattle } from '../battle/BattleSystem';
import { battleFrame } from '../battle/BattlePresentation';
import { createEncounter, declineEncounter } from '../battle/EncounterSystem';
import type { BattleAction, BattleOutcome } from '../battle/BattleState';
import type { OpponentId } from '../data/opponents';
import { startExpedition, completeExpedition } from './ExpeditionSystem';
import { useItem } from './ItemSystem';
import type { ItemId } from '../data/items';
import type { ZoneId, OutcomeId } from '../data/expeditions';
import { createCreature, SPECIES, type GameState, type Behavior, type SpeciesId } from '../creatures/Creature';
import type { PersonalityId } from '../data/personalities';
import { PERSONALITY_IDS } from '../data/personalities';
import { performAction, type CareAction } from './Actions';
import { updateNeeds } from './NeedsSystem';
import { progressLifecycle, hatch, evolve } from './Evolution';
import { ReactionSystem } from './ReactionSystem';
import { updateLifeEvents, triggerLifeEvent } from './EventSystem';
import { recordMoment } from './EventHistory';
import type { RandomSource } from './PersonalitySystem';
import { AnimationSystem } from './AnimationSystem';
import type { AnimationKind } from '../data/animations';
import { TIMING } from '../data/config';
export class Engine {
  state: GameState;
  private reactions = new ReactionSystem();
  private animations = new AnimationSystem();
  private criticalNext = false;
  get battleFrame() { return this.state.combat.active ? battleFrame(this.state.combat.active, this.state.age) : null; }
  get animation() { return this.animations.frame(this.state.age); }
  event: 'hatch' | 'evolution' | 'expedition' | null = null;
  constructor(saved?: GameState | null, private random: RandomSource = Math.random) {
    this.state = saved ?? createCreature();
    this.reactions.update(this.state);
  }
  get message() { return this.reactions.message; }
  get behavior() { return this.reactions.behavior; }
  /** Substeps keep debug advances and real clock ticks on the same simulation path. */
  tick(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.event = null;
    let remaining = seconds;
    while (remaining > 0) {
      const step = Math.min(0.25, remaining);
      this.state.age += step; this.state.stageAge += step;
      const combatBusy = this.state.combat.encounter || this.state.combat.active;
      if (!combatBusy) updateNeeds(this.state, step);
      const returned = completeExpedition(this.state, this.random);
      if (returned) this.returnFeedback(returned);
      const occupied = this.state.exploration.active || this.state.exploration.result || combatBusy;
      const lifecycle = occupied ? null : progressLifecycle(this.state, this.random);
      if (lifecycle) {
        this.event = lifecycle;
        this.lifecycleFeedback(lifecycle);
      } else if (!occupied) {
        const moment = updateLifeEvents(this.state, this.random);
        if (moment) {
          this.feedback(moment.message, moment.behavior, 5);
          if (['wakes-early', 'woke-refreshed'].includes(moment.id)) this.animations.start('wake', this.state.age);
        }
      }
      this.reactions.update(this.state);
      remaining -= step;
    }
  }
  private lifecycleFeedback(kind: 'hatch' | 'evolution') {
    const message = kind === 'hatch' ? 'Hello, Pipkin! Your adventure begins.' : `Meet ${SPECIES[this.state.species].name}. A new spark!`;
    recordMoment(this.state, kind, 'lifecycle', message);
    this.feedback(message, 'celebrate', kind === 'hatch' ? 6 : 8);
    this.animations.start('evolution', this.state.age);
  }
  enterBattle() { const result = startBattle(this.state); this.feedback(result.message); return result; }
  battleAction(action: BattleAction) {
    const result = resolveTurn(this.state, action, this.random, { critical: this.criticalNext && (action === 'attack' || action === 'skill') ? true : undefined });
    if (result.success && (action === 'attack' || action === 'skill')) this.criticalNext = false;
    this.feedback(result.message); return result;
  }
  retreatEncounter() { return declineEncounter(this.state); }
  acknowledgeBattle() { return acknowledgeBattle(this.state); }
  debugBattle(id: OpponentId, rare = false, encounterOnly = false) {
    if (this.state.exploration.active || this.state.exploration.result || this.state.combat.active || this.state.combat.encounter) { this.feedback('Finish the current adventure first.'); return false; }
    if (!createEncounter(this.state, id, rare)) { this.feedback('An awake, hatched beast can meet wild creatures.'); return false; }
    return encounterOnly || this.enterBattle().success;
  }
  debugBattleResult(outcome: BattleOutcome) {
    const battle = this.state.combat.active;
    if (!battle) return false;
    battle.beats = []; battle.beatStartedAge = this.state.age;
    return finishBattle(this.state, outcome, this.random);
  }
  debugCritical() { this.criticalNext = true; this.feedback('Next player strike: critical.'); }
  explore(zone: ZoneId) {
    const result = startExpedition(this.state, zone, this.random);
    this.feedback(result.message, result.success ? 'excited' : 'idle', 4);
    if (result.success) this.animations.start('depart', this.state.age);
    return result;
  }
  private returnFeedback(result: NonNullable<GameState['exploration']['result']>) {
    this.event = 'expedition';
    this.feedback(result.message, result.failed ? 'tired' : 'excited', 6);
    this.animations.start(result.rare ? 'rare' : result.failed ? 'failure' : 'discover', this.state.age);
  }
  acknowledgeExpedition() { this.state.exploration.result = null; }
  useItem(id: ItemId) {
    const result = useItem(this.state, id);
    this.feedback(result.message, result.behavior, 4);
    if (result.success) {
      const kind = result.behavior === 'feed' ? 'feed' : result.behavior === 'train' ? 'train' : 'play';
      this.animations.start(kind, this.state.age);
    }
    return result;
  }
  debugCompleteExpedition(outcome?: OutcomeId) {
    const active = this.state.exploration.active;
    if (!active) { this.feedback('Send your beast exploring first.'); return false; }
    const result = completeExpedition(this.state, this.random, outcome, true);
    if (!result) return false;
    this.returnFeedback(result); return true;
  }
  action(action: CareAction) {
    const wasSleeping = this.state.sleeping;
    const result = performAction(this.state, action, this.random);
    this.feedback(result.message, result.behavior);
    if (result.success) {
      const kind = action === 'sleep' && wasSleeping ? 'wake' : action;
      this.animations.start(kind, this.state.age, result.behavior === 'upset' ? 'overfed' : action === 'train' && this.state.stats.energy < 25 ? 'fatigue' : action === 'train' ? 'success' : 'happy');
    }
    return result;
  }
  feedback(message: string, behavior: Behavior = 'idle', duration: number = TIMING.feedbackDuration) {
    this.reactions.show(this.state, message, behavior, duration);
  }
  debugHatch() { if (hatch(this.state, this.random)) this.lifecycleFeedback('hatch'); }
  debugEvolve(species?: SpeciesId) { this.debugHatch(); if (evolve(this.state, species)) this.lifecycleFeedback('evolution'); }
  debugPersonality(personality: PersonalityId) {
    if (!PERSONALITY_IDS.includes(personality) || this.state.stage === 'egg') return false;
    this.state.personality = personality; return true;
  }
  debugEvent(id: string) {
    const moment = triggerLifeEvent(this.state, id, true);
    if (!moment) { this.feedback('Hatch first to try a life event.'); return false; }
    this.feedback(moment.message, moment.behavior, 5);
    if (['wakes-early', 'woke-refreshed'].includes(moment.id)) this.animations.start('wake', this.state.age);
    return true;
  }
  debugNeglect() {
    if (this.state.stage === 'egg') this.debugHatch();
    this.state.sleeping = false; this.state.life.sleepStartedAge = null; this.state.life.sleepUntilAge = 0;
    this.state.stats.hunger = 10; this.state.stats.energy = 10; this.state.stats.mood = 10;
    this.advance(60);
  }
  debugAnimation(kind: AnimationKind) {
    if (this.state.stage === 'egg') { this.feedback('Hatch first to preview a creature action.'); return; }
    this.animations.start(kind, this.state.age);
  }
  debugAlert(kind: 'hungry' | 'tired' | 'upset' | 'sick' | 'restless') {
    if (this.state.stage === 'egg') this.debugHatch();
    this.animations.reset(); this.reactions.reset();
    const stat = { hungry: 'hunger', tired: 'energy', upset: 'mood', sick: 'health', restless: 'discipline' } as const;
    this.state.stats[stat[kind]] = 10; this.reactions.update(this.state);
  }
  advance(seconds: number) { this.tick(seconds); }
  reset(state = createCreature()) { this.state = state; this.reactions.reset(); this.animations.reset(); this.event = null; this.criticalNext = false; }
}
