import test from 'node:test';import assert from 'node:assert/strict';import {LEVELS} from '../js/levels.js';
import {makeGame,tick} from './harness.mjs';
test('exactly five sequential handcrafted rooms extend the original fourteen',()=>{
 assert.equal(LEVELS.length,19);assert.deepEqual(LEVELS.slice(14).map(l=>l.id),[15,16,17,18,19]);
 assert.deepEqual(LEVELS.slice(14).map(l=>l.name),['First Contact','The Moving Line','Double Exposure','Fractured Timing','The Final Echo']);
});
test('new moving obstacles follow the deterministic clock and cause hazard resets',()=>{
 const {game:g}=makeGame(18);const h=g.levelDef.movingHazards[0];
 g.player.x=h.points[0].x;g.player.y=h.points[0].y;const before=g.attemptCount;
 tick(g);assert.equal(g.attemptCount,before+1);
});
