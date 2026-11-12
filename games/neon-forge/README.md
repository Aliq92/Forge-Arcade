# NEON FORGE — Endless colour burst

**One Arena. Endless Combos.** One continuous Endless run, available immediately. Levels advance automatically, the patterns tighten gradually, and colourful Perfect/combo explosions bring the arena to life. There is no campaign gate or final victory screen.

Canvas2D, vanilla modules, fixed120Hz combat, procedural opt-in audio and versioned localStorage. No framework, CDN, song, backend or external runtime dependency. Combat remains separate from rendering.

## Play locally

Serve the repository root, then open `http://127.0.0.1:8428/games/neon-forge/`. The existing preview serves the whole project:

```
node tests/the-last-lighthouse-preview.cjs
```

ES modules require HTTP; `file://` opening is unsupported. A local server needs no internet connection.

## Controls

| Action | Desktop | Touch / button alternative |
| --- | --- | --- |
| Aim | Mouse; A/D or ←/→ rotation | Drag/tap arena; hold rotation buttons |
| Strike | Click arena or Space | STRIKE; Enter/Space on the focused button |
| Pause / resume | Escape or Pause/Resume | Pause/Resume buttons |
| Upgrade | Tab then Enter/Space | Tap one card |
| Restart / end run | Pause menu | Same menu |

One press gives one pulse. Holding Strike, Space or Enter does not autoattack. Touch aiming never attacks. Holding rotation continues through automatic level changes; pause, blur and upgrade menus clear held input. Hiding the tab pauses until explicit resume.

## Continuous progression

Clear all targets and fragments to earn a completion bonus. The arena takes a0.9-second breather, then automatically starts the next level. There is no Continue click or per-level summary dialog. Combo, shields and upgrades carry forward. The HUD always shows the current level; a brief nonblocking banner announces it.

Choose one of three upgrades every third cleared level. These are the only routine progression pauses. Every tenth level brings back the Forge Heart; defeating it shatters the core, clears the arena and continues the run. Boss health scales12/14/16/18 at levels10/20/30/40+, capped thereafter; phase thresholds scale with health. Telegraphed openings still bring the core inside actual strike reach.

Challenge increases through mixed types, more approach groups and shorter pair spacing: speed starts50 and caps78; pair beats tighten from2.8 toward2.0 seconds. At most one durable or fragmenting target is scheduled per two-lane burst. Active limits stay16 normal /8 boss. Splinter children are queued safely rather than dropped or piled beyond the cap. This is harder pressure with bounded reaction windows, not unlimited speed.

## Precision and upgrades

The center robot never moves. Each strike uses an exact50° arc /132-unit reach for0.10s, plus0.22s recovery. Attack direction freezes when activated; each target registers once. The inner86-unit band marks Perfect timing: ± nominal speed×0.05. Time Bend gives more decision time by slowing approach. Audio latency never controls hits.

Spark triangles take one hit; Drifter diamonds drift gently; Bulwark hexagons take two hits and crack; Splinter squares divide into two small outward sparks. Shape and markings supplement colour. Escapes remove that target and cost one shield outside0.7s invulnerability. A whiff or escape breaks combo unless Keeper protects it. Start with three shields; zero ends the run without automatic restart.

Six capped upgrades remain: Chain Lightning (at most2 extra nearby victims within90 units), Pulse Shield (capacity/repair, maximum5), Time Bend (60% approach for0.8/1.1s with3s cooldown), Wide Arc (up to70°), Energy Echo (delayed0.16s half-damage nonrecursive pulse), and Combo Keeper (up to2 charges, refreshed per level). Late-run choices include explicit repair/score maintenance instead of silently capped upgrades.

Hits score100, Perfects add100, multiplied by combo tiers ×1/×2 at5/×3 at10/×4 at20/×5 at35. Accuracy is successful primary strikes / attempts, not victim count. Persistent visual stages use best combo; decorations never alter hitboxes.

## Colour and records

Multi-hue fragments, larger Perfect/combo bursts, boss-shatter explosions and expanding shockwaves draw **behind** the targets. Arena accents shift every three levels. Pools cap particles at320/80/0 and shockwaves at8/3/0 for high/low/reduced effects. There are no rapid fullscreen flashes. System reduced-motion settings also apply.

Only `neon-forge-save-v1` is written. Old scores/settings remain intact; old locked saves can immediately play the new Endless run. Best run considers the old campaign record and new Endless scores. Highest completed level is saved separately from the level reached. Missing/corrupt/blocked storage fails safely. There is no cloud save or mid-run resume.

## Verification and integration

```
node --test games/neon-forge/tests/*.test.mjs
node --test tests/*.test.mjs games/lumenworks/tests/*.test.mjs games/neon-forge/tests/*.test.mjs
node games/neon-forge/tests/browser.cjs
node games/neon-forge/tests/performance.cjs
node build.mjs
```

See VERIFICATION.md / PERFORMANCE.json for executed checks, timings and limitations. Browser scripts use installed Windows Chrome/Playwright paths. Raw reports/screenshots live in ignored `test-results/neon-forge/`.

The user has now approved Forge Arcade integration. Root `neon-forge-register.js` and the shared pixel-thumbnail pipeline expose this latest Endless version in Games and Featured. See INTEGRATION.md for card alignment, publication checks and remaining device-test limitations. The user's Endless steering supersedes the original campaign design in BRIEF.md; ENDLESS-PLAN.md records the new contract.

Physical Android/iPhone, Safari/Firefox and controllers were unavailable or outside scope. Touch checks emulate devices in desktop Chrome. Automated seeded control policies establish feasibility, not a human difficulty study. Short headless timing/memory samples do not establish physical-device FPS, display latency, thermal performance or long-duration memory guarantees. The fixed-step safety cap slows play under sustained stalls instead of teleporting threats.
