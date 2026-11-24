// Small, locally drawn instrument symbols.
const paths = {
  planet:
    '<circle cx="12" cy="12" r="8.6"/><ellipse cx="12" cy="12" rx="4" ry="8.6" transform="rotate(35 12 12)"/><path d="M2 14c3 1 15-3 20-8M4 18c5 0 13-3 16-6"/>',
  archive: '<path d="M3 7h7l2 2h9v11H3zM4 6V4h7l2 2h7v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.1"/>',
  exit: '<path d="M10 5H4v14h6m4-12 5 5-5 5m-6-5h11"/>',
  flag: '<path d="M5 21V4c4-3 9 3 14 0l-2 5 2 4c-5 3-9-3-14 0"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  tools:
    '<path d="M3 7h5m5 0h8M3 17h9m5 0h4"/><circle cx="10" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
  cursor: '<path d="m5 3 14 10-7 1-3 7z"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  layers: '<path d="m2 8 10-5 10 5-10 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  cross:
    '<path d="M3 9V4h5m8 0h5v5m0 6v5h-5m-8 0H3v-5"/><circle cx="12" cy="12" r="2"/>',
  pulse: '<path d="M1 13h5l3-8 5 15 3-8h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 5v5"/>',
  book: '<path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2zm9 2v14"/>',
  terrain: '<path d="m2 19 8-14 5 9 3-5 5 10zM7 10l3 2 2-3"/>',
  climate:
    '<path d="M7 15a4 4 0 1 1 6-4 3.5 3.5 0 1 1 3 6H7"/><path d="M15 4V2m4 4 2-2"/>',
  water:
    '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13zM8 15q0 3 3 4"/>',
  life: '<path d="M4 18C1 8 9 5 20 3c0 11-4 17-13 15m-4 3L16 8"/>',
  temperature: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0zm3-7v10"/>',
  elevation: '<path d="m2 19 7-10 3 4 4-9 6 15z"/>',
  pressure: '<path d="M2 9h13c5 0 4-6 1-5M2 13h17c4 0 4 6 0 6M4 17h6"/>',
  oxygen:
    '<circle cx="8" cy="12" r="4"/><circle cx="17" cy="8" r="3"/><path d="m13 11 2-1"/>',
  co2: '<circle cx="6" cy="14" r="3"/><circle cx="13" cy="8" r="3"/><circle cx="19" cy="15" r="3"/><path d="m8 12 3-2m4 0 2 3"/>',
  wildlife:
    '<path d="M5 15c1-3 4-6 7-6s6 4 6 7-4 2-6 1-6 2-7-2z"/><circle cx="5" cy="8" r="1.4"/><circle cx="10" cy="5" r="1.4"/><circle cx="16" cy="5" r="1.4"/><circle cx="20" cy="9" r="1.4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
};
export const icon = (name) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' +
  (paths[name] || paths.target) +
  "</svg>";
