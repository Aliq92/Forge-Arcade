export type IconName =
  | 'explore' | 'items'
  | 'feed'
  | 'train'
  | 'play'
  | 'sleep'
  | 'status'
  | 'sound'
  | 'mute'
  | 'arrow'
  | 'spark'
  | 'close' | 'energy' | 'health' | 'discipline';
const paths: Record<IconName, string> = {
  explore: '<path d="m12 3 8 18-8-4-8 4zM12 3v14"/>',
  items: '<path d="M5 7h14v14H5zM8 7V4h8v3M5 12h14m-9-2v4h4v-4"/>',
  energy: '<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
  health: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5z"/>',
  discipline: '<path d="M5 4h14v16H5zM8 8l2 2 5-4M8 15h8"/>',
  feed: '<path d="M5 12h14l-2 7H7zM8 5v3m4-5v5m4-3v3M3 12h18"/>',
  train: '<path d="M7 12h10M4 8v8m3-10v12m10-12v12m3-10v8"/>',
  play: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sleep:
    '<path d="M19 15.5A8 8 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5ZM15 3h5l-5 5h5"/>',
  status: '<path d="M5 18v-4m7 4V6m7 12v-8"/><path d="M3 21h18"/>',
  sound:
    '<path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  spark: '<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
export function icon(name: IconName, cls = '') {
  return `<svg class="fb-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

