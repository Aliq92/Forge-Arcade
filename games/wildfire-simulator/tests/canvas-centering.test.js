const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {} };
const cameraPath = path.join(__dirname, '..', 'js', 'camera.js');
vm.runInNewContext(fs.readFileSync(cameraPath, 'utf8'), context);

const stage = { style: {} };
context.window.WF.positionCanvasStage(stage, 0.65, 0, 0);

const wrap = { width: 867, height: 520 };
const centerX = Number.parseFloat(stage.style.left) / 100 * wrap.width;
const centerY = Number.parseFloat(stage.style.top) / 100 * wrap.height;

assert.equal(centerX, wrap.width / 2, 'terrain center must match the black box center horizontally');
assert.equal(centerY, wrap.height / 2, 'terrain center must match the black box center vertically');
assert.equal(stage.style.position, 'absolute');
assert.match(stage.style.transform, /^translate\(-50%, -50%\)/);
console.log('canvas centering regression test passed');
