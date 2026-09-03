import { STEP_SECONDS, MAX_FRAME_SECONDS, TILE_SIZE, DIFFICULTIES } from './config.mjs';
import { createGameState, transition, createRun, updateRun, disposeRun } from './state.mjs';
import { createInputManager } from './input.mjs';
import { createRenderer, renderFrame, resizeRenderer } from './render.mjs';
import { createAudioManager } from './audio.mjs';
import { detectStorage, loadRecords, recordResult, saveSettings } from './storage.mjs';

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
    pauseButton: document.getElementById('btn-pause'),
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
    tutorialRun = createRun({ difficulty: 'survey', seed: TUTORIAL_SEED, cave: buildTutorialCave() });
    tutorialSpawn = { x: tutorialRun.player.x, y: tutorialRun.player.y };
    tutorialProgress = { moved: false, sonarUsed: false, crystalCollected: false, hunterReacted: false };
    tutorialCompleteAt = null;
    updateTutorialText();
  }

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
    if (gameState.screen === 'playing') applyEvent({ type: 'PAUSE' });
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
    if (e.key === 'Escape' && gameState.screen === 'playing') {
      applyEvent({ type: 'PAUSE' });
    } else if (e.key === 'Escape' && gameState.screen === 'paused') {
      applyEvent({ type: 'RESUME' });
    }
  });
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
  // Only accrue simulation time while a sim screen is active. Otherwise (title,
  // paused, victory, defeat) the accumulator would silently build up every
  // animation frame — since the loop below exits immediately without ever
  // draining it — and unload as a burst of instant catch-up steps the moment
  // play resumes, freezing the game for as long as the player was idle.
  if (isSimScreen(gameState.screen)) {
    accumulator += delta;
  } else {
    accumulator = 0;
  }

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

  const activeRun = gameState.screen === 'playing' ? currentRun : gameState.screen === 'tutorial' ? tutorialRun : null;
  if (activeRun) {
    updateHud(activeRun);
    audio.setAwareness(activeRun.hunter.awareness);
    const alpha = accumulator / STEP_SECONDS;
    renderFrame(renderer, activeRun, alpha);
  }

  requestAnimationFrame(frame);
}

toggleSound && (toggleSound.checked = records.settings.sound);
toggleVibration && (toggleVibration.checked = records.settings.vibration);
renderRecords();

wireButtons();
showScreenFor(gameState.screen);
requestAnimationFrame(frame);

// Read-only inspection hook for manual QA; never used by gameplay logic.
if (typeof window !== 'undefined') {
  window.__echoMinerDebug = () => ({ gameState, currentRun, tutorialRun });
}

