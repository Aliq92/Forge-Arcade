import type { GameState } from '../creatures/Creature';
import type { ResetFlow } from '../systems/ResetFlow';
export interface SettingsModel { settingIndex: number; resetFlow: ResetFlow }
export function settingsMarkup(state: GameState, model: SettingsModel) {
  if (model.resetFlow.pending) {
    return `<div class="fb-reset-confirm" role="group" aria-label="Confirm start new egg">
      <strong>Start a new egg?</strong><p>${model.resetFlow.error || 'Current beast & moments cleared.<br>Sound & haptics kept.'}</p>
      <div class="fb-reset-choices"><span class="${model.resetFlow.choice === 'keep' ? 'chosen' : ''}">Keep beast</span><span class="${model.resetFlow.choice === 'reset' ? 'chosen' : ''}">New egg</span></div>
    </div>`;
  }
  const options = [`Sound <b>${state.muted ? 'OFF' : 'ON'}</b>`, `Haptics <b>${state.hapticsEnabled ? 'ON' : 'OFF'}</b>`, 'Start new egg <b>›</b>'];
  return `<div class="fb-settings-options">${options.map((label, i) => `<div class="${model.settingIndex === i ? 'chosen' : ''}">${label}</div>`).join('')}</div>`;
}
