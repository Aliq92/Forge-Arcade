# Orbit Breaker · Forge Arcade

One-touch gravitational pinball. Press and hold to create gravity, drag to move the attractor, release to slingshot. Includes Arcade Run, twelve Precision Chambers, and a three-to-five-ball Chaos sandbox.

This native static page launches from the Featured Collection and Games/Featured filters. The header returns to `../../index.html`. No iframe, framework, build step, remote assets, backend, or API is required.

Runtime files are copied from the completed standalone v1.0 build without gameplay changes. Only `index.html` adds native Arcade navigation and a small page-scoped `arcade.css`. Physics, input, rendering, sound, and the `orbitBreaker_save` namespace are preserved. On the same origin, existing progress continues; saves from a localhost preview cannot automatically transfer to GitHub Pages.

Controls: mouse/touch hold and drag; Space/P pause; R restart; M mute. Blur and document hiding pause automatically. Settings offer reduced motion and confirmed progress reset.

## Verify from repository root

```sh
node --test tests/orbit-breaker-integration.test.mjs
node --test games/orbit-breaker/tests/*.test.cjs
node --test tests/*.test.mjs
node build.mjs
```

The game suite has 33 tests, including 120,000 physics stress steps, a five-minute five-ball Chaos simulation, all twelve gravity-only chamber solutions, confetti attraction/cleanup, pointer cancellation, pause, restart, and save/load. Integration tests verify the registry, artwork isolation, native relative paths, save namespace, and three-mode startup.

Browser verification covers launcher card → game → Arcade return, category filtering, gameplay, pause and a mobile viewport. Physical-device audio/touch checks remain outside automated browser verification.
