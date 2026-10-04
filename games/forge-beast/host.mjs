import { ArcadeGameHost } from '../../game-host.mjs';
import { createBeastStorage, SAVE_KEY } from './storage.mjs';
const viewport = document.getElementById('game-viewport');
const message = document.getElementById('game-message');
const pause = document.getElementById('arcade-pause');
const back = document.getElementById('arcade-back');
let host;
let hadError = false;
function open() {
  if (host && !host.closed) return;
  let storage;
  try { storage = createBeastStorage(); } catch { storage = null; }
  hadError = false;
  message.hidden = false;
  message.textContent = 'Loading game…';
  pause.disabled = true;
  pause.textContent = 'Pause';
  pause.setAttribute('aria-pressed', 'false');
  pause.setAttribute('aria-label', 'Pause Forge Beast');
  host = new ArcadeGameHost({
    container: viewport,
    load: () => import('./module/forge-beast.js'),
    // URL parameters deliberately cannot turn on debug tools in Arcade.
    options: { storage, saveKey: SAVE_KEY, debug: false },
    onExit: () => { window.location.href = back.href; },
    onError: (error, fatal) => {
      hadError = true;
      console.error('Forge Beast host:', error);
      message.hidden = false;
      message.textContent = fatal ? 'Game could not open. Return to Arcade and try again. Your save is kept.' : error.message || 'Game needs recovery. Your save is kept.';
      if (fatal) pause.disabled = true;
    },
  });
  host.open().then(summary => {
    if (!summary || host.closed) return;
    message.hidden = !hadError;
    pause.disabled = false;
  });
}
back.addEventListener('click', event => {
  event.preventDefault();
  if (host && !host.closed) host.exit();
  else window.location.href = back.href;
});
pause.addEventListener('click', () => {
  if (!host || host.closed) return;
  if (host.userPaused) host.resume(); else host.pause();
  pause.textContent = host.userPaused ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed', String(host.userPaused));
  pause.setAttribute('aria-label', `${host.userPaused ? 'Resume' : 'Pause'} Forge Beast`);
});
// Browser/Android back uses the Arcade's existing native document history.
window.addEventListener('pagehide', () => { host?.close(); });
window.addEventListener('pageshow', () => { if (!host || host.closed) open(); });
open();
