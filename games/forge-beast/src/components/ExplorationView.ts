import type { GameState } from '../creatures/Creature';
import { ZONE_IDS, ZONES } from '../data/expeditions';
import { expeditionBlock } from '../systems/ExpeditionSystem';
import { formatAge } from './StatusView';
export type ExpeditionPage = 'zones' | 'confirm' | 'trip' | 'result' | null;
export function expeditionMarkup(state: GameState, page: ExpeditionPage, zoneIndex: number): string | null {
  if (page === 'zones' || page === 'confirm') {
    const id = ZONE_IDS[zoneIndex], zone = ZONES[id];
    const blocked = expeditionBlock(state, id);
    return `<div class="fb-status-heading">${page === 'confirm' ? 'Set off?' : 'Explore'}<span>${zoneIndex + 1}/3</span></div>
      <div class="fb-zone-card" data-zone="${id}"><span class="fb-zone-symbol" aria-hidden="true">${['♧', '▥', '♤'][zoneIndex]}</span><strong>${zone.name}</strong><span>${zone.risk} · ${zone.energy < 10 ? 'Light' : zone.energy < 20 ? 'Moderate' : 'Heavy'} effort</span><small>${formatAge(zone.duration)} ACTIVE TRIP</small><p>${blocked ?? (page === 'confirm' ? 'Ready for a little adventure?' : zone.description)}</p></div>
      <div class="fb-status-help">A ${page === 'confirm' ? 'CHANGE' : 'ZONE'} · B ${page === 'confirm' ? 'SEND' : 'CHOOSE'} · C BACK</div>`;
  }
  if (page === 'result' && state.exploration.result) {
    const result = state.exploration.result;
    // Messages are original data, but escape persisted text before rendering.
    const message = result.message.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    return `<div class="fb-status-heading">${result.rare ? 'Rare discovery' : result.failed ? 'Home, at last' : 'Back from the trail'}<span>${result.rare ? '✦' : '↟'}</span></div><div class="fb-trip-result" data-outcome="${result.outcome}"><strong>${ZONES[result.zone].name}</strong><p>${message}</p><small>${result.item && result.stored ? 'TUCKED INTO ITEMS' : result.failed ? 'REST & CARE HELP' : 'A LITTLE STORY TO KEEP'}</small></div><div class="fb-status-help">B OKAY · C BACK</div>`;
  }
  return null;
}
export function tripMarkup(state: GameState) {
  const trip = state.exploration.active;
  if (!trip) return '';
  const remaining = Math.max(0, trip.endsAge - state.age);
  const progress = Math.min(100, Math.max(0, (state.age - trip.startedAge) / (trip.endsAge - trip.startedAge) * 100));
  return `<div class="fb-trip-label">${ZONES[trip.zone].name}<span>${formatAge(Math.ceil(remaining))}</span></div><div class="fb-trip-track"><i style="width:${progress}%"></i></div><span class="fb-trip-caption">${trip.detoured ? 'FOLLOWING THEIR OWN PATH' : 'A LITTLE ADVENTURE'}</span>`;
}
