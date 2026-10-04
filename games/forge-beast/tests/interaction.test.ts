import test from 'node:test';
import assert from 'node:assert/strict';
import { ResetFlow, newEggState } from '../src/systems/ResetFlow';
import { DeviceNavigation } from '../src/components/DeviceNavigation';
import { SETTINGS_PAGE } from '../src/components/StatusView';
import { AnimationSystem } from '../src/systems/AnimationSystem';
import { ANIMATIONS, ACTION_ANIMATIONS } from '../src/data/animations';
import { SOUNDS } from '../src/data/sounds';
import { DeviceAudio } from '../src/systems/Audio';
import { DeviceHaptics } from '../src/systems/HapticsSystem';
import { Persistence, migrateSave } from '../src/systems/Persistence';
import { Engine } from '../src/systems/Engine';
import { presentStat } from '../src/components/StatusPresenter';
function baby() { const e = new Engine(null, () => .99); e.debugHatch(); return e; }
test('reset confirmation defaults to keep, supports cancel/back and requires deliberate reset selection', () => {
  const flow = new ResetFlow(); assert.equal(flow.confirm(), null);
  flow.begin(); assert.equal(flow.choice, 'keep'); assert.equal(flow.confirm(), 'keep'); assert.equal(flow.pending, false);
  flow.begin(); flow.select(); assert.equal(flow.confirm(), 'reset'); assert.equal(flow.pending, true);
  flow.cancel(); assert.equal(flow.pending, false);
  flow.begin(); flow.fail(); assert.equal(flow.choice, 'keep'); assert.ok(flow.error);
});
test('A/B/C reaches Settings and starts a confirmed reset without affecting care menu order', () => {
  const nav = new DeviceNavigation();
  for (let i = 0; i < 4; i++) nav.press('select', 0);
  nav.press('confirm', 0); assert.equal(nav.statusPage, 0);
  for (let i = 0; i < 6; i++) nav.press('select', 0);
  assert.equal(nav.statusPage, SETTINGS_PAGE);
  assert.equal(nav.press('confirm', 0).toggle, 'sound');
  nav.press('select', 0); assert.equal(nav.press('confirm', 0).toggle, 'haptics');
  nav.press('select', 0); nav.press('confirm', 0); assert.equal(nav.resetFlow.pending, true);
  assert.equal(nav.press('confirm', 0).reset, false); assert.equal(nav.resetFlow.pending, false);
  nav.press('confirm', 0); nav.press('select', 0); assert.equal(nav.press('confirm', 0).reset, true);
  nav.reset(); assert.equal(nav.statusPage, null); assert.equal(nav.resetFlow.pending, false);
});
test('new egg clears progress and moments while normal reset retains audio/haptic preferences', () => {
  const e = baby(); e.state.muted = true; e.state.hapticsEnabled = true; e.action('train');
  const fresh = newEggState(e.state, { keepSettings: true });
  assert.equal(fresh.stage, 'egg'); assert.equal(fresh.species, 'cinder-egg'); assert.equal(fresh.age, 0);
  assert.equal(fresh.personality, null); assert.deepEqual(fresh.eventHistory, []); assert.deepEqual(fresh.careHistory, []);
  assert.equal(fresh.development.trainingSessions, 0); assert.equal(fresh.sleeping, false);
  assert.equal(fresh.muted, true); assert.equal(fresh.hapticsEnabled, true);
  const hard = newEggState(e.state); assert.equal(hard.muted, false); assert.equal(hard.hapticsEnabled, false);
  assert.equal(e.state.stage, 'baby');
});
test('fresh lifecycle persists after reset, and old migration backup is removed only after a successful replacement', () => {
  const map = new Map<string,string>();
  const p = new Persistence({ getItem: k => map.get(k) ?? null, setItem: (k,v) => { map.set(k,v); }, removeItem: k => { map.delete(k); } }, 'slot');
  const e = baby(); p.save(e.state); map.set('slot:backup:v1','original');
  const fresh = newEggState(e.state); assert.equal(p.save(fresh), true); p.clearResetBackup();
  assert.deepEqual(p.load(), fresh); assert.equal(map.has('slot:backup:v1'), false);
  const raw = map.get('slot')!;
  const failing = new Persistence({ getItem: () => raw, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('must not remove'); } }, 'slot');
  assert.equal(failing.save(newEggState(e.state)), false); assert.equal(failing.load()!.stage, 'egg');
});
test('V0.2 saves receive haptics-off default without changing version, personality or needs', () => {
  const s: any = structuredClone(baby().state); delete s.hapticsEnabled;
  const migrated = migrateSave(s)!; assert.equal(migrated.hapticsEnabled, false);
  assert.equal(migrated.version, 2); assert.deepEqual(migrated.stats,s.stats); assert.equal(migrated.personality,s.personality);
  assert.equal(migrateSave({ ...s, hapticsEnabled:'yes' }), null);
});
test('every action animation progresses through its phases then expires', () => {
  for (const kind of ACTION_ANIMATIONS) {
    const animation = new AnimationSystem(); animation.start(kind,100);
    let offset = 0;
    for (const phase of ANIMATIONS[kind]) {
      assert.equal(animation.frame(100 + offset + .001)!.phase, phase.name);
      offset += phase.duration;
    }
    assert.equal(animation.frame(100 + offset + .1), null);
  }
});
test('animation replay starts a new sequence, interruptions replace old phases, and reset clears all animation', () => {
  const a = new AnimationSystem(); a.start('feed',0); const first = a.frame(0)!.sequence;
  a.start('feed',1); assert.ok(a.frame(1)!.sequence > first); assert.equal(a.frame(1)!.phase,'approach');
  a.start('wake',2); assert.equal(a.frame(2)!.kind,'wake'); a.reset(); assert.equal(a.frame(2),null);
});
test('accepted action changes stats once and animation phases never change care state', () => {
  const e = baby(); e.state.stats.hunger = 50; e.action('feed');
  assert.equal(e.animation!.kind,'feed'); const stats = { ...e.state.stats };
  for (let i=0;i<5;i++) { void e.animation; }
  assert.deepEqual(e.state.stats,stats);
  e.action('feed'); assert.equal(e.state.development.successfulInteractions,1);
  e.advance(1); assert.equal(e.animation!.phase,'chew');
  e.advance(2); assert.equal(e.animation,null);
});
test('overfed and fatigued action outcomes are distinct; wake previews and refresh do not replay care', () => {
  const e = baby(); e.state.stats.hunger = 100; e.action('feed'); assert.equal(e.animation!.outcome,'overfed');
  e.advance(3); e.state.stats.energy = 30; e.action('train'); assert.equal(e.animation!.outcome,'fatigue');
  e.advance(3); e.action('sleep'); e.advance(2); assert.equal(e.state.sleeping,true);
  const reload = new Engine(structuredClone(e.state), () => .99); assert.equal(reload.animation,null); assert.equal(reload.behavior,'sleep');
  e.action('sleep'); assert.equal(e.animation!.kind,'wake');
  const snapshot=structuredClone(e.state); e.debugAnimation('play'); assert.deepEqual(e.state,snapshot);
  e.reset(); assert.equal(e.animation,null);
});
function fakeAudio() {
  const calls: { starts: number[]; stops: number; closed: number } = {starts:[],stops:0,closed:0};
  const context = {
    currentTime:0, destination:{}, resume:async()=>{}, close:async()=>{calls.closed++;},
    createOscillator:()=>({type:'',frequency:{value:0},onended:null,connect:()=>{},disconnect:()=>{},start:(when:number)=>calls.starts.push(when),stop:()=>{calls.stops++;}}),
    createGain:()=>({gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},disconnect:()=>{}}),
  };
  return { calls, context: context as unknown as AudioContext };
}
test('muted audio does not create a context or schedule notes; muting stops active tones', () => {
  const f=fakeAudio(); let created=0; const audio=new DeviceAudio(()=>{created++;return f.context;});
  audio.muted=true; audio.play('confirm'); assert.equal(created,0); assert.equal(f.calls.starts.length,0);
  audio.muted=false; audio.play('feed'); assert.equal(created,1); assert.equal(f.calls.starts.length,SOUNDS.feed.notes.length);
  const before=f.calls.stops; audio.muted=true; assert.ok(f.calls.stops>before);
  audio.play('evolution'); assert.equal(f.calls.starts.length,SOUNDS.feed.notes.length); audio.destroy(); assert.equal(f.calls.closed,1);
});
test('every named audio event works and absent AudioContext never interrupts the game', () => {
  const f=fakeAudio(), audio=new DeviceAudio(()=>f.context);
  for(const event of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) audio.play(event);
  assert.equal(f.calls.starts.length,Object.values(SOUNDS).reduce((n,s)=>n+s.notes.length,0));
  assert.doesNotThrow(()=>new DeviceAudio(()=>{throw new Error('unsupported');}).play('button'));
  audio.destroy();
});
test('haptics are opt-in, short, cancellable and safely unsupported', () => {
  const patterns: (number|number[])[]=[]; const h=new DeviceHaptics(p=>{patterns.push(p);return true;},()=>false);
  assert.equal(h.play('confirm'),false); assert.deepEqual(patterns,[]);
  h.enabled=true; h.play('confirm'); h.play('alert'); h.play('evolution'); assert.equal(patterns.length,3);
  h.enabled=false; assert.equal(patterns.at(-1),0);
  const unsupported=new DeviceHaptics(null); unsupported.enabled=true; assert.equal(unsupported.play('confirm'),false);
  const reduced=new DeviceHaptics(()=>true,()=>true); reduced.enabled=true; assert.equal(reduced.play('evolution'),false);
});
test('status presenter communicates needs through words rather than exact values', () => {
  assert.equal(presentStat('hunger',10).description,'Hungry'); assert.equal(presentStat('health',80).description,'Well');
  assert.equal(presentStat('discipline',20).description,'Restless'); assert.equal(presentStat('energy',90).description,'Ready');
  assert.equal(presentStat('mood',50).description,'Okay');
});
