'use strict';
// Original SVG illustrations; unknown future entries keep the existing CSS artwork.
const CARD_THUMBNAILS = new Set([
  "digital-ant-colony",
  "comet-shepherd",
  "void-drifter",
  "echo-runner",
  "lantern-vale",
  "echo-miner",
  "bacteria-bloom",
  "beat-foundry",
  "button-that-judges-you",
  "gravity-garden",
  "gravity-sandbox",
  "molt",
  "particle-lab",
  "ripple-run",
  "starfall-garden",
  "wildfire-simulator",
  "terrain-flyover",
  "mandelbrot-explorer",
  "3d-maze",
  "impossible-reef",
  "kaleido-drift",
  "void-tap",
  "signal-garden",
  "tiny-excavator",
  "dont-let-go",
  "apogee",
  "aethel",
  "threadlight",
  "forge-beast",
  "night-run-forge",
  "outpost-orbit",
  "pop-parade",
  "orbit-breaker",
  "night-freight",
  "echo-tide"
]);
function cardArtworkHTML(game) {
  if (!CARD_THUMBNAILS.has(game.id)) return '<span class="art-code">' + game.title.charAt(0) + '</span>';
  return '<img class="game-thumbnail" src="assets/thumbnails/' + game.id + '.svg" alt="" width="640" height="360" loading="lazy" decoding="async">';
}
