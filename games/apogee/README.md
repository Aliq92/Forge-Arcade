# APOGEE

A standalone Phaser 3 / TypeScript rocket game for Forge Arcade. All runtime assets are local; no backend, CDN, or external audio service.

## Play

Serve the Forge Arcade repository with an HTTP static server and open `games/apogee/index.html`, or select APOGEE from the arcade. The shipped `index.html` and `assets/` are ready to host. ES modules require HTTP; direct `file://` launch is not supported.

Click LAUNCH. The rocket lifts off after a short countdown. Click/tap the flight area or press Space to separate each booster. The final 3% of fuel is PERFECT; the marked window widens with Guidance. Beyond empty there is a short critical grace period, then failure. The last stage cuts off automatically and coasts to its apex. Escape or the pause button pauses; switching tabs also pauses.

Research, records, tiers, milestones and settings save to `forge-apogee-v1` in localStorage. Storage failure leaves the session playable and shows a warning. Reset Progress requires confirmation.

## Develop

From `source/`:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

The build compiles into `source/dist/`, then copies only APOGEE's static page/assets to the game folder. Phaser is split into a stable vendor chunk. `node_modules`, temporary tests and dist are ignored.

- `src/simulation.ts`: framework-independent physics, stages, grades, coasting and apex interpolation.
- `src/progression.ts`: validated saves, rewards, upgrades, tiers and milestones.
- `src/world.ts`: Phaser procedural world, rocket, camera, bounded effects and debris.
- `src/audio.ts`: gesture-unlocked WebAudio engine and cues.
- `src/main.ts`: input, fixed simulation steps, run flow, DOM menus/HUD and development tools.
- `src/style.css`: portrait-first responsive presentation.
- `tests/core.test.ts`: timing, fuel waste, failure, apogee, economy, invalid saves and balance coverage.

Development-only: backtick toggles telemetry; R adds RP, U increases upgrade levels, T previews tiers and A increases test altitude during a flight. Production builds eliminate these controls. To test distant scenery without affecting normal progress, use a separate browser profile.

## Balance and performance

Flights use SI-like physics with compressed distance and coast time for arcade pacing. Starter perfect runs last around 38 seconds (plus countdown/result hold); tested late-game configurations reach apogee within 90 seconds. Earth/Moon visuals indicate altitude, not an orbital simulation.

The particle pool is fixed at 180, stars at 95, and offscreen debris is culled. One Phaser scene and one AudioContext are reused across launches. Browser/device performance depends on hardware; desktop headless results are not proof of 60 FPS on Samsung A55 hardware.

## Integration

`apogee-register.js` follows the existing `GAMES.push` registration contract; the root launcher includes that one script. No other game's runtime is changed. The Echo Miner integration test uses portable file URL resolution and accepts the existing stylesheet query string.
