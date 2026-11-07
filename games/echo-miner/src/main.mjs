import { STEP_SECONDS, MAX_FRAME_SECONDS, TILE_SIZE, DIFFICULTIES } from './config.mjs';
import { createGameState, transition, createRun, updateRun, disposeRun } from './state.mjs';
import { createInputManager } from './input.mjs';
import { createRenderer, renderFrame, resizeRenderer } from './render.mjs';
import { createAudioManager } from './audio.mjs';
import { detectStorage, loadRecords, recordResult, saveSettings } from './storage.mjs';
import {createMapRenderer,renderMap} from './map.mjs';

const TUTORIAL_SEED = 777;
const TUTORIAL_COMPLETE_HOLD_SECONDS = 1.6;

// A small, hand-built open room so a first-time player can find the single
// crystal and provoke the Hunter quickly, instead of navigating a full cave.
function buildTutorialCave() {
  const width = 18;
  const height = 14;
  const tiles = new Uint8Array(width * height).fill(0);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) tiles[y * width + x] = 1;
  }
  return {
    width,
    height,
    tiles,
    lift: { x: 3, y: 7 },
    crystals: [{ x: 9, y: 7 }],
    hunterSpawn: { x: 14, y: 7 },
    seed: 'tutorial',
  };
}

const screenEls = {
  title: document.getElementById('screen-title'),
  tutorial: document.getElementById('screen-tutorial'),
  paused: document.getElementById('screen-paused'),
  victory: document.getElementById('screen-victory'),
  defeat: document.getElementById('screen-defeat'),
  map:document.getElementById('screen-map'),
};

const hudCrystals = document.getElementById('hud-crystals');
const hudStatus = document.getElementById('hud-status');
const hudAwarenessFill = document.getElementById('hud-awareness-fill');
const victorySummary = document.getElementById('victory-summary');
const defeatSummary = document.getElementById('defeat-summary');
const titleRecordsEl = document.getElementById('title-records');
const tutorialStepText = document.getElementById('tutorial-step-text');
const toggleSound = document.getElementById('toggle-sound');
const toggleVibration = document.getElementById('toggle-vibration');
const toggleReduced=document.getElementById('toggle-reduced');
const mapTools=document.getElementById('map-tools'),minimapButton=document.getElementById('minimap-button'),scanStatus=document.getElementById('scan-status'),warning=document.getElementById('tremor-warning');
const compactMap=createMapRenderer(document.getElementById('minimap')),expandedMap=createMapRenderer(document.getElementById('expanded-map'));
let mapVisible=true;

let gameState = createGameState();
let currentRun = null;
let gameplayInput = null;

let tutorialRun = null;
let tutorialSpawn = null;
let tutorialProgress = { moved: false, sonarUsed: false, crystalCollected: false, hunterReacted: false };
let tutorialCompleteAt = null;

const storage = detectStorage();
let records = loadRecords(storage);

const audio = createAudioManager();
audio.setMuted(!records.settings.sound);

function isSimScreen(screen) {
  return screen === 'playing' || screen === 'tutorial';
}

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

const idleInput = { moveX: 0, moveY: 0, sprint: false, sonarPressed: false, pausePressed: false };

function ensureGameplayInput() {
  if (gameplayInput) return;
  gameplayInput = createInputManager(document, {
    movePad: document.getElementById('move-pad'),
    sonarButton: document.getElementById('btn-sonar'),
    sprintButton: document.getElementById('btn-sprint'),
    scanButton:document.getElementById('btn-scan'),
  });
}

function teardownGameplayInput() {
  gameplayInput?.destroy();
  gameplayInput = null;
}

function vibrate(pattern) {
  if (!records.settings.vibration) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* vibration is a nice-to-have; failures must never affect play */
  }
}

function showScreenFor(screen) {
  for (const [key, el] of Object.entries(screenEls)) {
    if (!el) continue;
    el.classList.toggle('hidden', key !== screen);
  }
  const live=isSimScreen(screen);
  mapTools.hidden=!live;document.getElementById('expedition-tools').hidden=!live;
  document.getElementById('hud').hidden=!live;document.getElementById('touch-controls').hidden=!live;
  document.getElementById('hud').setAttribute('aria-hidden',String(!live));document.getElementById('touch-controls').setAttribute('aria-hidden',String(!live));
  document.getElementById('field-message').hidden=!live;
  document.getElementById('btn-restart').hidden=gameState.resumeScreen==='tutorial';
  if(screen==='map')document.getElementById('btn-map-close').focus();
  else if(live)document.getElementById('game-canvas').focus({preventScroll:true});
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderRecords() {
  if (!titleRecordsEl) return;
  const lines = Object.keys(DIFFICULTIES).map((key) => {
    const r = records.byDifficulty[key] ?? { bestTimeSeconds: null, highestHaul: 0 };
    const time = r.bestTimeSeconds === null ? '—' : formatTime(r.bestTimeSeconds);
    return `${DIFFICULTIES[key].label}: best ${time} · best haul ${r.highestHaul}`;
  });
  titleRecordsEl.textContent = lines.join('\n');
}

function updateOverlayContent() {
  if (gameState.screen === 'victory' && gameState.lastResult) {
    victorySummary.textContent = `${gameState.lastResult.crystals} crystals in ${formatTime(gameState.lastResult.timeSeconds)}.`;
  }
  if (gameState.screen === 'defeat' && gameState.lastResult) {
    defeatSummary.textContent = `The Hunter found you after ${formatTime(gameState.lastResult.timeSeconds)} with ${gameState.lastResult.crystals} crystals.`;
  }
}

function updateHud(run) {
  if (!run) return;
  hudCrystals.textContent = `Crystals: ${run.player.crystals} / ${run.quota}`;
  hudStatus.textContent = run.liftActive ? 'Lift active — return to the surface' : 'Descending';
  hudAwarenessFill.style.width = `${Math.round(run.hunter.awareness * 100)}%`;
  const cooldown=Math.max(0,run.scanner.cooldownUntil-run.elapsed);
  scanStatus.textContent=cooldown?`${Math.ceil(cooldown)}s`:'READY';
  document.getElementById('btn-scan').disabled=cooldown>0;
  const tremor=run.tremor,phase=tremor.phase;
  warning.hidden=phase==='quiet';
  document.body.classList.toggle('has-tremor',phase!=='quiet');
  const warningText=phase==='warning'?`TREMOR IN ${Math.ceil(tremor.until-run.elapsed)}s · Avoid violet markers`:phase==='active'?`FALLING DEBRIS · Clears in ${Math.ceil(tremor.until-run.elapsed)}s`:'TREMOR EASING · Passages restored';
  if(warning.textContent!==warningText)warning.textContent=warningText;
  const message=document.getElementById('field-message');
  const scanMessage=run.scanner.highlightUntil>run.elapsed?`SILENT SCAN · ${run.scanner.crystals.filter(c=>run.remainingCrystals.some(r=>r.id===c.id)).length} crystals · ${run.scanner.passages.length} uncharted passages`:'';
  if(message.textContent!==scanMessage)message.textContent=scanMessage;
  if(mapVisible)renderMap(compactMap,run);
  document.getElementById('map-caption').textContent=`CAVE MEMORY · ${Math.floor(run.exploration.indices.length/run.cave.tiles.length*100)}% charted`;
}

function updateTutorialText() {
  if (!tutorialStepText) return;
  if (!tutorialProgress.moved) tutorialStepText.textContent = 'Drag (mobile) or WASD/arrows (desktop) to move.';
  else if (!tutorialProgress.sonarUsed) tutorialStepText.textContent = 'Good. Trigger a sonar pulse — tap Sonar or press Space.';
  else if (!tutorialProgress.crystalCollected) tutorialStepText.textContent = 'The pulse reveals the cave. Walk into a crystal to collect it.';
  else if (!tutorialProgress.hunterReacted) tutorialStepText.textContent = 'Watch the awareness meter — something is listening.';
  else tutorialStepText.textContent = 'Tutorial complete! Returning to the surface.';
}

function applyEvent(event) {
  const prevScreen = gameState.screen;
  gameState = transition(gameState, event);
  const wasSim = isSimScreen(prevScreen);
  const isSim = isSimScreen(gameState.screen);
  if(prevScreen!==gameState.screen||event.type==='RESTART')accumulator=0;

  if (event.type === 'START' && gameState.screen === 'playing' && prevScreen !== 'playing') {
    disposeRun(currentRun);
    audio.disposeRun();
    currentRun = createRun({ difficulty: gameState.difficulty, seed: gameState.seed });
  } else if (event.type === 'RESTART' && gameState.screen === 'playing') {
    disposeRun(currentRun);
    audio.disposeRun();
    currentRun = createRun({ difficulty: gameState.difficulty, seed: gameState.seed });
  } else if (event.type === 'START_TUTORIAL' && gameState.screen === 'tutorial') {
    disposeRun(tutorialRun);
    tutorialRun = createRun({ difficulty: 'survey', seed: TUTORIAL_SEED, cave: buildTutorialCave(),tutorial:true });
    tutorialSpawn = { x: tutorialRun.player.x, y: tutorialRun.player.y };
    tutorialProgress = { moved: false, sonarUsed: false, crystalCollected: false, hunterReacted: false };
    tutorialCompleteAt = null;
    updateTutorialText();
  }
  if(event.type==='START'||event.type==='RESTART'||event.type==='START_TUTORIAL'){renderer.prevPlayer=null;renderer.prevHunter=null;}

  if (!wasSim && isSim) ensureGameplayInput();
  if (wasSim && !isSim) {
    teardownGameplayInput();
    audio.disposeRun();
  }

  if (event.type === 'WIN') {
    audio.playCue('victory');
    vibrate([40, 60, 40]);
    if (gameState.lastResult) {
      records = recordResult(gameState.lastResult, storage);
      renderRecords();
    }
  }
  if (event.type === 'LOSE') {
    audio.playCue('defeat');
    vibrate([220]);
  }

  if (event.type === 'QUIT_TO_TITLE') {
    disposeRun(currentRun);
    currentRun = null;
    disposeRun(tutorialRun);
    tutorialRun = null;
    renderRecords();
  }

  updateOverlayContent();
  showScreenFor(gameState.screen);
}

function wireButtons() {
  const openMap=()=>{if(isSimScreen(gameState.screen))applyEvent({type:'OPEN_MAP'});};
  const toggleMap=()=>{mapVisible=!mapVisible;minimapButton.hidden=!mapVisible;document.getElementById('btn-map-toggle').setAttribute('aria-pressed',String(mapVisible));canvas.focus({preventScroll:true});};
  document.getElementById('btn-map-toggle').addEventListener('click',toggleMap);
  document.getElementById('btn-map-expand').addEventListener('click',openMap);
  minimapButton.addEventListener('click',openMap);
  document.getElementById('btn-map-close').addEventListener('click',()=>applyEvent({type:'CLOSE_MAP'}));
  document.getElementById('btn-restart').addEventListener('click',()=>applyEvent({type:'RESTART',seed:currentRun?.seed}));
  document.getElementById('btn-start')?.addEventListener('click', () => {
    audio.unlock();
    applyEvent({ type: 'START', difficulty: gameState.difficulty, seed: randomSeed() });
  });
  document.getElementById('btn-tutorial')?.addEventListener('click', () => {
    audio.unlock();
    applyEvent({ type: 'START_TUTORIAL' });
  });
  document.getElementById('btn-tutorial-skip')?.addEventListener('click', () => {
    applyEvent({ type: 'START', difficulty: gameState.difficulty, seed: randomSeed() });
  });
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    applyEvent({ type: 'RESUME' });
  });
  document.getElementById('btn-quit')?.addEventListener('click', () => {
    applyEvent({ type: 'QUIT_TO_TITLE' });
  });
  document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
    applyEvent({ type: 'RESTART', seed: randomSeed() });
  });
  document.getElementById('btn-victory-title')?.addEventListener('click', () => {
    applyEvent({ type: 'QUIT_TO_TITLE' });
  });
  document.getElementById('btn-defeat-restart')?.addEventListener('click', () => {
    applyEvent({ type: 'RESTART', seed: randomSeed() });
  });
  document.getElementById('btn-defeat-title')?.addEventListener('click', () => {
    applyEvent({ type: 'QUIT_TO_TITLE' });
  });
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    if (isSimScreen(gameState.screen)) applyEvent({ type: 'PAUSE' });
  });

  for (const btn of document.querySelectorAll('.difficulty-btn')) {
    btn.addEventListener('click', () => {
      gameState = { ...gameState, difficulty: btn.dataset.difficulty };
      for (const other of document.querySelectorAll('.difficulty-btn')) {
        other.setAttribute('aria-pressed', String(other === btn));
      }
    });
  }

  toggleSound?.addEventListener('change', (e) => {
    audio.setMuted(!e.target.checked);
    records = saveSettings({ sound: e.target.checked }, storage);
  });
  toggleVibration?.addEventListener('change', (e) => {
    records = saveSettings({ vibration: e.target.checked }, storage);
  });
  toggleReduced.addEventListener('change',e=>{records=saveSettings({reducedMotion:e.target.checked},storage);renderer.reducedMotion=e.target.checked;document.body.classList.toggle('reduced-motion',e.target.checked);});

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.()?.catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    } catch {
      /* fullscreen is unsupported on some mobile browsers; ignore */
    }
  });

  document.addEventListener('keydown', (e) => {
    if(e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    if(e.code==='KeyM'&&isSimScreen(gameState.screen)){e.preventDefault();toggleMap();return;}
    if(e.key==='Tab'&&(isSimScreen(gameState.screen)||gameState.screen==='map')){e.preventDefault();applyEvent({type:gameState.screen==='map'?'CLOSE_MAP':'OPEN_MAP'});return;}
    if(e.key==='Escape'&&gameState.screen==='map'){applyEvent({type:'CLOSE_MAP'});return;}
    if(e.code==='KeyR'&&gameState.screen==='paused'&&gameState.resumeScreen!=='tutorial'){applyEvent({type:'RESTART',seed:currentRun?.seed});return;}
    if (e.key === 'Escape' && isSimScreen(gameState.screen)) {
      applyEvent({ type: 'PAUSE' });
    } else if (e.key === 'Escape' && gameState.screen === 'paused') {
      applyEvent({ type: 'RESUME' });
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&isSimScreen(gameState.screen))applyEvent({type:'PAUSE'});});
  window.addEventListener('blur',()=>{if(isSimScreen(gameState.screen))applyEvent({type:'PAUSE'});});
}

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);

window.addEventListener('resize', () => resizeRenderer(renderer));

let accumulator = 0;
let lastTime = performance.now();

function frame(now) {
  let delta = (now - lastTime) / 1000;
  lastTime = now;
  if (delta > MAX_FRAME_SECONDS) delta = MAX_FRAME_SECONDS;
  if(isSimScreen(gameState.screen))accumulator+=delta;else accumulator=0;

  while (accumulator >= STEP_SECONDS) {
    const screen = gameState.screen;
    if (!isSimScreen(screen)) break;
    const run = screen === 'playing' ? currentRun : tutorialRun;
    if (!run) break;

    const input = gameplayInput ? gameplayInput.getInput() : idleInput;
    if (input.pausePressed && screen === 'playing') {
      applyEvent({ type: 'PAUSE' });
      break;
    }

    const prevPulseCount = run.pulses.length;
    const prevCrystals = run.player.crystals;
    const prevScan=run.scanner.serial,prevTremor=run.tremor.phase;
    let updated = updateRun(run, screen === 'tutorial' ? { ...input, pausePressed: false } : input, STEP_SECONDS);
    // The tutorial is a guided demo, not a real expedition: the Hunter may
    // still corner the player in its small room, but that must never end
    // or freeze the lesson — only the four tracked steps complete it.
    if (screen === 'tutorial' && updated.outcome) updated = { ...updated, outcome: null };

    if (updated.pulses.length > prevPulseCount) {
      audio.playCue('sonar');
      vibrate(15);
    }
    if (updated.player.crystals > prevCrystals) {
      audio.playCue('crystal');
      vibrate(25);
    }
    if(updated.scanner.serial!==prevScan)audio.playCue('scanner');
    if(updated.tremor.phase==='warning'&&prevTremor!=='warning')audio.playCue('tremor');

    if (screen === 'playing') {
      currentRun = updated;
      if (currentRun.outcome === 'victory') applyEvent({ type: 'WIN', result: currentRun.result });
      else if (currentRun.outcome === 'defeat') applyEvent({ type: 'LOSE', result: currentRun.result });
    } else {
      tutorialRun = updated;
      if (!tutorialProgress.moved && Math.hypot(updated.player.x - tutorialSpawn.x, updated.player.y - tutorialSpawn.y) > TILE_SIZE * 0.4) {
        tutorialProgress.moved = true;
      }
      if (!tutorialProgress.sonarUsed && updated.pulses.length > prevPulseCount) tutorialProgress.sonarUsed = true;
      if (!tutorialProgress.crystalCollected && updated.player.crystals > prevCrystals) tutorialProgress.crystalCollected = true;
      if (!tutorialProgress.hunterReacted && updated.hunter.state !== 'dormant') tutorialProgress.hunterReacted = true;
      updateTutorialText();

      const allDone = tutorialProgress.moved && tutorialProgress.sonarUsed && tutorialProgress.crystalCollected && tutorialProgress.hunterReacted;
      if (allDone) {
        if (tutorialCompleteAt === null) tutorialCompleteAt = updated.elapsed;
        else if (updated.elapsed - tutorialCompleteAt > TUTORIAL_COMPLETE_HOLD_SECONDS) {
          applyEvent({ type: 'QUIT_TO_TITLE' });
          break;
        }
      }
    }
    accumulator -= STEP_SECONDS;
  }

  const activeRun = gameState.screen === 'tutorial'||(gameState.screen==='map'&&gameState.mapReturn==='tutorial')||(gameState.screen==='paused'&&gameState.resumeScreen==='tutorial')?tutorialRun:currentRun;
  if (activeRun) {
    if(isSimScreen(gameState.screen)){updateHud(activeRun);audio.setAwareness(activeRun.hunter.awareness);}
    const alpha = isSimScreen(gameState.screen)?Math.min(1,accumulator / STEP_SECONDS):1;
    renderFrame(renderer, activeRun, alpha);
    if(gameState.screen==='map')renderMap(expandedMap,activeRun,true);
  }

  requestAnimationFrame(frame);
}

toggleSound && (toggleSound.checked = records.settings.sound);
toggleVibration && (toggleVibration.checked = records.settings.vibration);
toggleReduced.checked=records.settings.reducedMotion??window.matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.reducedMotion=toggleReduced.checked;document.body.classList.toggle('reduced-motion',toggleReduced.checked);
renderRecords();

wireButtons();
showScreenFor(gameState.screen);
requestAnimationFrame(frame);

// Read-only inspection hook for manual QA; never used by gameplay logic.
if (typeof window !== 'undefined') {
  window.__echoMinerDebug = () => ({ gameState, currentRun, tutorialRun });
}

