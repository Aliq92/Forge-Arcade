import type { GameState, Stats } from '../creatures/Creature';
import { icon, type IconName } from '../assets/icons';
const PRESENTATION: Record<keyof Stats, { label: string; icon: IconName; words: [string, string, string] }> = {
  hunger: { label: 'Fullness', icon: 'feed', words: ['Hungry', 'Peckish', 'Content'] },
  energy: { label: 'Energy', icon: 'energy', words: ['Spent', 'Sleepy', 'Ready'] },
  mood: { label: 'Mood', icon: 'play', words: ['Lonely', 'Okay', 'Happy'] },
  health: { label: 'health', icon: 'health', words: ['Poorly', 'Worn', 'Well'] },
  discipline: { label: 'discipline', icon: 'discipline', words: ['Restless', 'Learning', 'Steady'] },
  training: { label: 'Training', icon: 'train', words: ['Starting', 'Practicing', 'Strong'] },
};
export function presentStat(key: keyof Stats, value: number) {
  const p = PRESENTATION[key];
  return { ...p, description: p.words[value < 35 ? 0 : value < 70 ? 1 : 2] };
}
export function statRows(state: GameState, keys: (keyof Stats)[]) {
  return keys.map(key => {
    const p = presentStat(key, state.stats[key]);
    return `<div class="fb-stat-row"><span>${icon(p.icon)}${p.label}</span><small>${p.description}</small><div class="fb-stat-bar" role="img" aria-label="${key}: ${p.description}">${[0, 1, 2, 3, 4].map(i => `<i class="${state.stats[key] > i * 20 ? 'filled' : ''}"></i>`).join('')}</div></div>`;
  }).join('');
}
