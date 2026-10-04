import type { Behavior, GameState } from '../creatures/Creature';
import { changeStats } from './StatValues';
import { recordCareMistake } from './NeedsSystem';
import { personalityProfile, type RandomSource } from './PersonalitySystem';
import { tryTrainingRefusal, wakeCreature } from './EventSystem';
import { recordMoment } from './EventHistory';
import { TIMING } from '../data/config';
export type CareAction = 'feed' | 'train' | 'play' | 'sleep';
export interface ActionResult { message: string; behavior: Behavior; success: boolean }
export function performAction(state: GameState, action: CareAction, random: RandomSource = Math.random): ActionResult {
  const result = (message: string, behavior: Behavior = 'idle', success = false): ActionResult => ({ message, behavior, success });
  if (state.combat.encounter || state.combat.active || state.combat.result) return result('Finish the wild encounter first.');
  if (state.exploration.active) return result('Your beast is exploring. Wait for their return.');
  if (state.exploration.result) return result('Meet your returning beast first.');
  if (state.stage === 'egg') return result('Still growing. Keep your egg company.');
  if (action === 'sleep' && state.sleeping) {
    const refreshed = state.stats.energy >= 80;
    wakeCreature(state, refreshed);
    state.life.lastInteractionAge = state.age;
    recordMoment(state, 'wake', 'action', refreshed ? '{name} woke up refreshed.' : '{name} opened sleepy eyes.');
    return result('Rise and shine, little one!', 'celebrate', true);
  }
  if (state.sleeping) return result('Shhh… your beast is resting.', 'sleep');
  if (state.age - state.lastActionAge < TIMING.actionCooldown) return result('One little moment…');
  if ((action === 'train' || action === 'play') && state.stats.energy < 15) {
    state.lastActionAge = state.age;
    if (action === 'train') {
      recordCareMistake(state, 'exhaustedTraining');
      changeStats(state, { health: -3, mood: -3 });
    }
    return result('Too sleepy. A little rest first?', 'tired');
  }
  if (action === 'train' && state.stats.health < 25) {
    state.lastActionAge = state.age;
    return result('Feeling poorly. Gentle care before training.', 'sick');
  }
  state.lastActionAge = state.age;
  if (action === 'train') {
    const refusal = tryTrainingRefusal(state, random);
    if (refusal) return result(refusal.message, refusal.behavior);
  }
  state.careHistory.push({ action, age: state.age });
  state.careHistory = state.careHistory.slice(-100);
  state.development.successfulInteractions++;
  state.life.lastInteractionAge = state.age;
  const personality = personalityProfile(state);
  if (action === 'feed') {
    if (state.stats.hunger > 88) {
      recordCareMistake(state, 'overfeeding');
      changeStats(state, { hunger: 22, mood: -5, health: -3 });
      return result('Oof… a little too full!', 'upset', true);
    }
    changeStats(state, { hunger: 24, mood: 4, health: 1 });
    state.life.needTimers.hunger = 0;
    recordMoment(state, 'feed', 'action', '{name} enjoyed an emberberry.');
    return result('A tasty emberberry. Happy belly!', 'feed', true);
  }
  if (action === 'train') {
    state.development.trainingSessions++;
    changeStats(state, { training: 10, discipline: 8, energy: -personality.trainingEnergy, hunger: -7, mood: personality.trainingMood });
    recordMoment(state, 'train', 'action', `{name} practiced. ${personality.trainText}`);
    return result(personality.trainText, 'train', true);
  }
  if (action === 'play') {
    state.development.playSessions++;
    changeStats(state, { mood: personality.playMood, discipline: 2, energy: -personality.playEnergy, hunger: -3 });
    state.life.needTimers.mood = 0;
    recordMoment(state, 'play', 'action', `{name} played. ${personality.playText}`);
    return result(personality.playText, 'play', true);
  }
  state.sleeping = true;
  state.life.sleepStartedAge = state.age; state.life.sleepUntilAge = 0; state.life.needTimers.energy = 0;
  recordMoment(state, 'sleep', 'action', '{name} curled up for a little rest.');
  return result(personality.sleepText, 'sleep', true);
}
