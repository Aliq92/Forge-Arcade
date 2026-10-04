import { SPECIES, type GameState } from '../creatures/Creature';
import { statRows } from './StatusPresenter';
import { settingsMarkup, type SettingsModel } from './SettingsView';
import { icon } from '../assets/icons';
export const STATUS_PAGES = ['Vitals', 'Growth', 'Field notes', 'Device sound', 'Wellbeing', 'Recent moments', 'Settings'] as const;
export const LOG_PAGE = 5;
export const SETTINGS_PAGE = 6;
export function formatAge(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
function escape(text: string) {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function statusMarkup(s: GameState, page: number, progress: number, logOffset: number, settings?: SettingsModel) {
  let content = '';
  if (page === 0) content = statRows(s, ['hunger', 'energy', 'mood', 'training']);
  if (page === 1) content = `<div class="fb-status-growth"><span>${SPECIES[s.species].type}</span><strong>${formatAge(s.age)} TOGETHER</strong><div class="fb-status-track"><i style="width:${progress}%"></i></div><span>${s.stage === 'evolved' ? 'Your story keeps growing.' : s.stage === 'egg' ? 'A new spark is on its way.' : 'Care shapes what comes next.'}</span></div>`;
  if (page === 2) content = `<p class="fb-status-lore">${SPECIES[s.species].description}</p>`;
  if (page === 3) content = `<div class="fb-status-sound">${icon(s.muted ? 'mute' : 'sound')}<strong>${s.muted ? 'SOUND OFF' : 'SOUND ON'}</strong><span>B to ${s.muted ? 'unmute' : 'mute'}</span></div>`;
  if (page === 4) {
    const health = s.stats.health < 35 ? 'Feeling poorly. Rest and gentle care.' : s.stats.health < 70 ? 'A little worn out. Keep caring.' : 'Bright-eyed and feeling well.';
    const discipline = s.stats.discipline < 35 ? 'Restless. A little routine helps.' : s.stats.discipline < 70 ? 'Learning a little every day.' : 'Finding a steady rhythm.';
    content = `${statRows(s, ['discipline', 'health'])}<p class="fb-wellbeing-copy">${health}<br>${discipline}</p>`;
  }
  if (page === LOG_PAGE) {
    const index = Math.max(0, s.eventHistory.length - 1 - logOffset);
    const entry = s.eventHistory[index];
    content = entry
      ? `<div class="fb-event-entry"><div><span>${formatAge(entry.age)} TOGETHER</span><span>${index + 1}/${s.eventHistory.length}</span></div><p>${escape(entry.message)}</p></div>`
      : '<p class="fb-status-lore">A story waiting to begin.<br>Little moments appear after hatching.</p>';
  }
  if (page === SETTINGS_PAGE && settings) content = settingsMarkup(s, settings);
  return `<div class="fb-status-heading">${STATUS_PAGES[page]}<span>${page + 1}/${STATUS_PAGES.length}</span></div>${content}<div class="fb-status-help">A ${page === SETTINGS_PAGE ? 'CHOOSE' : 'NEXT'} ${page === 3 ? '' : page === SETTINGS_PAGE ? '· B CONFIRM' : page === LOG_PAGE ? '· B OLDER' : '· B NEXT'} · C BACK</div>`;
}
