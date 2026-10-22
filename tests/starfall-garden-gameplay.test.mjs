import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function load() {
  const ctx = vm.createContext({ console, Math });
  for (const file of ['constants','utils','world','player','resources','plants','meteors','upgrades','game'])
    vm.runInContext(fs.readFileSync(new URL(`../games/starfall-garden/js/${file}.js`, import.meta.url), 'utf8'), ctx);
  return vm.runInContext('SG', ctx);
}
const particles = { burst() {} };
test('unlocked regions remain accessible after meteor damage', () => {
  const S = load(), w = new S.World(260);
  w.update(60, 50);
  w.update(60, 0);
  assert.equal(w.unlockedRadius, 260);
});
test('normal terrain recovers without paying for the same patch again', () => {
  const S = load(), w = new S.World(260);
  const p = w.patches.find(p => w.canRestore(p));
  w.restorePatch(p); w.scorchPatch(p);
  assert.equal(w.restoredCount, 0);
  w.update(S.CONFIG.scorchHealSeconds + 1, 0);
  assert.equal(w.restoredCount, 1);
  assert.equal(p.state, S.TERRAIN.RESTORED);
});
test('hard mode retains permanent scorch loss', () => {
  const S = load(), w = new S.World(260); w.hardMode = true;
  const p = w.patches.find(p => w.canRestore(p));
  w.restorePatch(p); w.scorchPatch(p); w.update(20, 0);
  assert.equal(w.restoredCount, 0); assert.equal(p.state, S.TERRAIN.DEAD);
});
test('a mature normal-mode garden can spread to full restoration without a fragment grind', () => {
  const S = load(), w = new S.World(260), player = new S.Player();
  const p = w.patchAtLocal(0, 0); w.restorePatch(p); player.fragments = 100;
  assert.equal(S.Plants.tryPlant(w, p, 'glowgrass', player).ok, true);
  // Plant a modest garden, then let its roots restore the whole reachable planet.
  for (const q of w.patches.filter(q => w.isUnlocked(q)).slice(0, 7)) {
    if (!q.plant) { w.restorePatch(q); S.Plants.tryPlant(w, q, 'glowgrass', player); }
  }
  for (let t = 0; t < 360; t++) { S.Plants.update(1, w, particles); w.update(1, w.restoreAreaPercent()); }
  assert.equal(w.restoreAreaPercent(), 100);
});
test('normal meteor pressure is lower than hard mode with longer recovery', () => {
  const S = load(), w = new S.World(260), m = new S.MeteorManager(w);
  const easy = m.phaseDurations(1.6, false), hard = m.phaseDurations(1.6, true);
  assert.ok(easy.calm > hard.calm); assert.ok(easy.night < hard.night); assert.ok(easy.recovery > hard.recovery);
});
test('two quick interactions restore then plant using current terrain', () => {
  const S = load(), g = Object.create(S.Game.prototype);
  g.world = new S.World(260); g.player = new S.Player(); g.player.fragments = 30;
  g.state = S.STATE.PLAYING; g.selectedPlant = 'glowgrass';
  g.runStats = { plantsGrown: 0 }; g.audio = { restore() {}, plant() {} };
  g.particles = particles; g._unlockAchievement = () => {};
  g.actionHint = g._computeActionHint();
  g._onInteract(); g._onInteract();
  assert.equal(g.world.plantsAlive, 1);
  assert.equal(g.player.fragments, 24);
});
