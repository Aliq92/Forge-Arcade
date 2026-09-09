(() => {
  'use strict';
  const parts = ['script.part00', 'script.part01', 'script.part02'];
  Promise.all(parts.map((path) => fetch(path).then((response) => {
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.text();
  })))
    .then((chunks) => (0, eval)(chunks.join('')))
    .catch((error) => {
      console.error('Impossible Reef failed to start.', error);
      const hint = document.getElementById('hint');
      if (hint) hint.textContent = 'REEF FAILED TO LOAD';
    });
})();
