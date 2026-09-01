import { UPGRADES } from './upgrades.js';

export function createUI(doc, actions) {
  const byId = (id) => doc.getElementById(id);
  const upgradeOverlay = byId('upgrade-overlay');
  const resultsOverlay = byId('results-overlay');
  const pauseOverlay = byId('pause-overlay');
  const upgradeOptions = byId('upgrade-options');

  byId('pause-button').addEventListener('click', actions.togglePause);
  byId('restart-button').addEventListener('click', actions.restart);
  byId('music-button').addEventListener('click', actions.toggleMusic);
  byId('effects-button').addEventListener('click', actions.toggleEffects);

  function renderUpgrades(run) {
    upgradeOptions.replaceChildren();
    for (const id of run.upgradeChoices ?? []) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = UPGRADES[id]?.name ?? id;
      button.addEventListener('click', () => actions.chooseUpgrade(id));
      upgradeOptions.append(button);
    }
  }

  return {
    update(run, profile, paused) {
      byId('score').textContent = String(run.score);
      byId('combo').textContent = `×${Math.max(1, run.combo)}`;
      byId('integrity').textContent = String(run.integrity);
      byId('energy').textContent = String(run.energy);
      byId('pause-button').textContent = paused ? 'Resume' : 'Pause';
      byId('pause-button').setAttribute('aria-pressed', String(paused));
      byId('music-button').setAttribute('aria-pressed', String(profile.musicMuted));
      byId('effects-button').setAttribute('aria-pressed', String(profile.effectsMuted));
      upgradeOverlay.hidden = run.phase !== 'upgrade';
      resultsOverlay.hidden = run.phase !== 'defeat' && run.phase !== 'victory';
      pauseOverlay.hidden = !paused;
      if (run.phase === 'upgrade') renderUpgrades(run);
      if (!resultsOverlay.hidden) {
        byId('results-title').textContent = run.phase === 'victory' ? 'Vault breached' : 'Run terminated';
        byId('result-score').textContent = String(run.score);
        byId('best-score').textContent = String(profile.bestScore);
        byId('chambers-cleared').textContent = String(run.chambersCleared);
      }
    },
    isBlocking() { return !upgradeOverlay.hidden || !resultsOverlay.hidden || !pauseOverlay.hidden; }
  };
}
