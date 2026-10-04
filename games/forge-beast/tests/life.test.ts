import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/systems/Engine';
import { createCreature, type GameState } from '../src/creatures/Creature';
import { assignPersonality } from '../src/systems/PersonalitySystem';
import { PERSONALITIES, PERSONALITY_IDS, type PersonalityId } from '../src/data/personalities';
import { LIFE_EVENTS } from '../src/data/events';
import { updateLifeEvents, triggerLifeEvent, tryTrainingRefusal } from '../src/systems/EventSystem';
import { updateNeeds } from '../src/systems/NeedsSystem';
import { restingReaction } from '../src/systems/ReactionSystem';
import { HISTORY_LIMIT, recordMoment } from '../src/systems/EventHistory';
import { migrateSave, Persistence, validState, type SaveStorage } from '../src/systems/Persistence';
import { evolutionScores, chooseEvolution } from '../src/systems/Evolution';
import { statusMarkup } from '../src/components/StatusView';
function baby(personality: PersonalityId = 'calm') {
  const engine = new Engine(null, () => 0.99);
  engine.advance(45); engine.debugPersonality(personality); return engine;
}
function memory() {
  const data = new Map<string, string>();
  const storage: SaveStorage = {
    getItem: k => data.get(k) ?? null,
    setItem: (k, value) => { data.set(k, value); },
    removeItem: k => { data.delete(k); },
  };
  return { data, storage };
}
function legacy(stage: 'egg' | 'baby' | 'evolved' = 'baby', sleeping = false) {
  const s: any = structuredClone(baby().state);
  s.version = 1; s.stage = stage; s.species = stage === 'egg' ? 'cinder-egg' : stage === 'baby' ? 'pipkin' : 'runewisp';
  s.age = 200; s.stageAge = 120; s.sleeping = sleeping;
  s.development.trainingSessions = 3; s.careHistory = [{ action: 'train', age: 90 }];
  delete s.stats.health; delete s.stats.discipline;
  delete s.development.ignoredHunger; delete s.development.exhaustedTraining; delete s.development.neglectedMood;
  delete s.personality; delete s.eventHistory; delete s.life;
  return s;
}
test('all five personalities are assigned at hatch, never on eggs or on reloading', () => {
  const egg = createCreature(); assert.equal(assignPersonality(egg, () => 0), null);
  PERSONALITY_IDS.forEach((id, i) => {
    const engine = new Engine(null, () => i / 5 + 0.01);
    engine.advance(45); assert.equal(engine.state.personality, id);
    assignPersonality(engine.state, () => 0.99); assert.equal(engine.state.personality, id);
    const loaded = new Engine(structuredClone(engine.state), () => 0);
    loaded.advance(1); assert.equal(loaded.state.personality, id);
  });
});
test('personality changes need decay, play response, training response and sleep recovery', () => {
  const calm = baby('calm'), playful = baby('playful'), bold = baby('bold');
  calm.advance(10); playful.advance(10);
  assert.ok(calm.state.stats.energy > playful.state.stats.energy);
  assert.ok(calm.state.stats.mood > playful.state.stats.mood);
  for (const e of [calm, playful]) { e.state.stats.mood = 30; e.action('play'); }
  assert.ok(playful.state.stats.mood > calm.state.stats.mood);
  const calmTrain = baby('calm'); calmTrain.state.stats.mood = 50; bold.state.stats.mood = 50;
  assert.notEqual(calmTrain.action('train').message, bold.action('train').message);
  assert.ok(bold.state.stats.mood > calmTrain.state.stats.mood);
  const stubborn = baby('stubborn'), sleeper = baby('calm');
  for (const e of [stubborn, sleeper]) { e.state.stats.energy = 20; e.action('sleep'); e.advance(10); }
  assert.ok(sleeper.state.stats.energy > stubborn.state.stats.energy);
});
test('training refusal depends on temperament and condition, with cooldown and no successful training', () => {
  const s = baby('stubborn').state; s.stats.discipline = 10;
  assert.ok(tryTrainingRefusal(s, () => 0.5));
  assert.equal(s.development.trainingSessions, 0);
  assert.equal(s.eventHistory.at(-1)!.eventId, 'refuses-training');
  assert.equal(tryTrainingRefusal(s, () => 0), null);
  const calm = baby('calm').state; calm.stats.discipline = 10;
  assert.equal(tryTrainingRefusal(calm, () => 0.5), null);
  const healthy = baby('stubborn').state;
  assert.equal(tryTrainingRefusal(healthy, () => 0), null);
});
test('ambient events respect the clock, eligibility and persisted per-event cooldowns', () => {
  const engine = baby('curious'), s = engine.state;
  const history = s.eventHistory.length;
  assert.equal(updateLifeEvents(s, () => 0), null); assert.equal(s.eventHistory.length, history);
  s.age = s.life.nextEventAge; s.stats.hunger = 20;
  const event = updateLifeEvents(s, () => 0);
  assert.equal(event?.id, 'asks-food');
  assert.ok(s.life.nextEventAge > s.age);
  assert.equal(triggerLifeEvent(s, 'asks-food'), null);
  const restored = migrateSave(s)!;
  assert.equal(triggerLifeEvent(restored, 'asks-food'), null);
  restored.age += 46; assert.ok(triggerLifeEvent(restored, 'asks-food'));
  const egg = createCreature(); egg.age = 100;
  assert.equal(updateLifeEvents(egg, () => 0), null);
});
test('personality changes ambient event probability and selection weights', () => {
  const calm = baby('calm').state, playful = baby('playful').state;
  for (const s of [calm, playful]) { s.age = 60; s.life.nextEventAge = 60; }
  assert.equal(updateLifeEvents(calm, () => 0.45), null);
  assert.ok(updateLifeEvents(playful, () => 0.45));
  assert.ok(PERSONALITIES.curious.eventWeights['found-object']! > (PERSONALITIES.bold.eventWeights['found-object'] ?? 1));
});
test('every defined event can be forced and produces a timestamped visible moment', () => {
  for (const event of LIFE_EVENTS) {
    const engine = baby(); const count = engine.state.eventHistory.length;
    assert.equal(engine.debugEvent(event.id), true);
    assert.equal(engine.state.eventHistory.length, count + 1);
    assert.equal(engine.state.eventHistory.at(-1)!.eventId, event.id);
    assert.ok(engine.state.eventHistory.at(-1)!.timestamp > 0);
    assert.equal(engine.behavior, event.behavior);
    assert.ok(engine.message.includes('Pipkin'));
  }
  assert.equal(baby().debugEvent('unknown'), false);
});
test('event effects remain bounded and found objects are only moments, without inventory', () => {
  const engine = baby(); engine.state.stats.mood = 98;
  engine.debugEvent('found-object'); assert.equal(engine.state.stats.mood, 100);
  assert.equal(Object.hasOwn(engine.state, 'inventory'), false);
  engine.state.stats.hunger = 1; engine.debugEvent('oversleeps'); assert.equal(engine.state.stats.hunger, 0);
});
test('early waking, oversleeping, manual waking and refreshed waking all behave coherently', () => {
  const e = baby(); e.state.stats.energy = 60; e.action('sleep'); e.advance(16);
  assert.ok(triggerLifeEvent(e.state, 'wakes-early')); assert.equal(e.state.sleeping, false); assert.equal(e.state.life.sleepStartedAge, null);
  e.advance(2); e.action('sleep'); e.advance(20);
  e.debugEvent('oversleeps'); e.state.stats.energy = 100;
  e.advance(10); assert.equal(e.state.sleeping, true);
  e.advance(11); assert.equal(e.state.sleeping, false);
  assert.equal(e.state.eventHistory.at(-1)!.eventId, 'woke-refreshed');
  e.advance(2); e.action('sleep'); e.debugEvent('oversleeps');
  assert.equal(e.action('sleep').success, true); assert.equal(e.state.sleeping, false);
});
test('continuous neglect has a grace period and records each kind of ignored need', () => {
  const e = baby(); e.state.stats.hunger = 10; e.state.stats.energy = 10; e.state.stats.mood = 10;
  e.advance(24); assert.equal(e.state.development.careMistakes, 0);
  e.advance(1);
  assert.equal(e.state.development.ignoredHunger, 1);
  assert.equal(e.state.development.missedSleep, 1);
  assert.equal(e.state.development.neglectedMood, 1);
  assert.equal(e.state.development.careMistakes, 3);
  e.advance(25); assert.equal(e.state.development.missedSleep, 2);
});
test('meeting a need breaks the neglect streak and sleeping prevents missed-sleep mistakes', () => {
  const e = baby(); e.state.stats.hunger = 10; e.advance(20);
  e.action('feed'); assert.equal(e.state.life.needTimers.hunger, 0);
  e.advance(10); assert.equal(e.state.development.ignoredHunger, 0);
  e.state.stats.energy = 1; e.advance(2); e.action('sleep'); e.advance(24);
  assert.equal(e.state.development.missedSleep, 0);
});
test('overfeeding and exhausted training count mistakes while cooldown prevents button-spam penalties', () => {
  const e = baby(); e.state.stats.hunger = 100;
  e.action('feed'); assert.equal(e.state.development.overfeeding, 1); assert.equal(e.state.development.careMistakes, 1);
  e.advance(2); e.state.stats.energy = 1;
  assert.equal(e.action('train').success, false);
  assert.equal(e.state.development.exhaustedTraining, 1);
  assert.equal(e.action('train').success, false); assert.equal(e.state.development.exhaustedTraining, 1);
  assert.equal(e.state.development.trainingSessions, 0);
  e.advance(2); e.action('train'); assert.equal(e.state.development.exhaustedTraining, 2);
});
test('health declines with neglected needs and recovers through adequate care and rest', () => {
  const e = baby(); e.state.stats.hunger = 10; e.state.stats.health = 35;
  e.advance(10); assert.ok(e.state.stats.health < 35); assert.equal(restingReaction(e.state), 'sick');
  e.state.stats.hunger = 75; e.state.stats.mood = 75; e.state.stats.energy = 60;
  const low = e.state.stats.health; e.action('sleep'); e.advance(15); assert.ok(e.state.stats.health > low);
  e.action('sleep'); e.state.stats.health = 20; e.advance(2);
  assert.equal(e.action('train').success, false); assert.equal(e.behavior, 'sick');
});
test('each requested creature condition has a distinct resting reaction', () => {
  const cases = [
    [{ hunger: 10 }, 'hungry'], [{ energy: 10 }, 'tired'], [{ mood: 100 }, 'happy'],
    [{ mood: 10 }, 'upset'], [{ health: 10 }, 'sick'],
  ] as const;
  for (const [stats, expected] of cases) {
    const e = baby(); Object.assign(e.state.stats, stats); assert.equal(restingReaction(e.state), expected);
  }
  const e = baby(); e.action('sleep'); assert.equal(restingReaction(e.state), 'sleep');
  e.action('sleep'); e.debugEvent('excited'); assert.equal(e.behavior, 'excited');
  e.advance(6); assert.equal(e.message, ''); assert.equal(e.behavior, 'happy');
});
test('life history is bounded, chronological and safe to render as HTML', () => {
  const s = baby().state;
  for (let i = 0; i < 50; i++) { s.age++; recordMoment(s, 'test', 'life', `Moment ${i}`); }
  assert.equal(s.eventHistory.length, HISTORY_LIMIT);
  assert.ok(s.eventHistory.every((e, i, all) => !i || e.age >= all[i - 1].age));
  recordMoment(s, 'test', 'life', '<img src=x onerror=alert(1)>');
  const markup = statusMarkup(s, 5, 20, 0);
  assert.ok(markup.includes('&lt;img')); assert.equal(markup.includes('<img'), false);
});
test('personality and wellbeing affect evolution scoring while established care branches still work', () => {
  const s = baby('bold').state;
  const before = evolutionScores(s).cragox; s.personality = 'calm';
  assert.ok(before > evolutionScores(s).cragox);
  s.stats.health = 20; assert.equal(chooseEvolution(s), 'bramblejaw');
  s.stats.health = 100; s.stats.training = 50; s.development.trainingSessions = 5;
  assert.equal(chooseEvolution(s), 'cragox');
});
test('all V0.2 state including needs timers, cooldowns, personality and history round-trips', () => {
  const { storage } = memory(); const p = new Persistence(storage, 'slot');
  const e = baby('curious'); e.debugEvent('found-object'); e.state.stats.hunger = 5; e.advance(12);
  assert.equal(p.save(e.state), true); assert.deepEqual(p.load(), e.state);
  const restored = new Engine(p.load(), () => 0.99); restored.advance(13);
  assert.equal(restored.state.development.ignoredHunger, 1);
  assert.equal(restored.state.personality, 'curious');
});
test('V0.1 egg, baby, sleeping baby and evolved saves migrate without losing progress', () => {
  for (const [stage, sleeping] of [['egg', false], ['baby', false], ['baby', true], ['evolved', false]] as const) {
    const old = legacy(stage, sleeping); const untouched = JSON.stringify(old);
    const s = migrateSave(old, () => 0.4)!;
    assert.ok(validState(s)); assert.equal(s.version, 2);
    assert.equal(s.stage, old.stage); assert.equal(s.species, old.species); assert.equal(s.age, old.age); assert.equal(s.stageAge, old.stageAge);
    assert.equal(s.sleeping, sleeping); assert.equal(s.stats.hunger, old.stats.hunger); assert.equal(s.stats.training, old.stats.training);
    assert.deepEqual(s.careHistory, old.careHistory); assert.equal(s.development.trainingSessions, 3);
    assert.equal(s.stats.health, 100); assert.equal(s.stats.discipline, 55);
    assert.equal(s.personality, stage === 'egg' ? null : 'curious');
    assert.equal(JSON.stringify(old), untouched);
    assert.equal(s.createdAt, old.createdAt); assert.equal(s.savedAt, old.savedAt);
  }
});
test('migration backs up the original save and assigns personality just once', () => {
  const { storage } = memory(); const raw = JSON.stringify(legacy()); storage.setItem('slot', raw);
  const p = new Persistence(storage, 'slot', () => 0.01); const s = p.load()!;
  p.save(s); assert.equal(storage.getItem('slot:backup:v1'), raw);
  const another = new Persistence(storage, 'slot', () => 0.99).load()!;
  assert.equal(another.personality, 'bold'); assert.deepEqual(another, s);
  p.reset(); assert.equal(storage.getItem('slot'), null); assert.equal(storage.getItem('slot:backup:v1'), null);
});
test('failed migration writes preserve the original V0.1 save', () => {
  const raw = JSON.stringify(legacy());
  const storage: SaveStorage = { getItem: key => key === 'slot' ? raw : null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const p = new Persistence(storage, 'slot'); const s = p.load()!;
  assert.equal(p.save(s), false); assert.equal(storage.getItem('slot'), raw); assert.equal(p.available, false);
});
test('corrupt, partial and unsupported saves are rejected without throwing', () => {
  for (const invalid of [null, {}, { ...legacy(), version: 99 }, { ...legacy(), stats: { hunger: 10 } }, { ...baby().state, personality: 'unknown' }, { ...baby().state, life: null }, { ...baby().state, eventHistory: [{ message: 'bad' }] }]) {
    assert.equal(migrateSave(invalid), null);
  }
});
test('small clock ticks and debug advancement produce the same needs and event results', () => {
  const a = baby('curious'), b = new Engine(structuredClone(a.state), () => 0.99);
  a.advance(60); for (let i = 0; i < 240; i++) b.tick(0.25);
  assert.deepEqual(a.state.stats, b.state.stats); assert.deepEqual(a.state.development, b.state.development);
  assert.deepEqual(a.state.life, b.state.life);
});
