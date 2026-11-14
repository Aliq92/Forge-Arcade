# DOMINO DISASTER

**One Push. Total Chaos.** A standalone, local-asset Canvas2D construction puzzle for Forge Arcade. Twelve handcrafted machines introduce dominoes, marbles, ramps, single-use springs, coupled gears, weight-driven seesaws, switches and physical finish targets. Also includes a120-gadget Sandbox, exact undo/redo, saved creations, stars, progression and sampled replay.

## Play locally

From the repository root run `node games/domino-disaster/tests/preview.cjs`, then open http://127.0.0.1:8441/games/domino-disaster/. JavaScript modules need an HTTP preview; opening index.html directly through file:// is not supported. There are no runtime packages, CDNs, network calls or backend services. Once the local files are served, the game runs without internet.

Choose **Play** for the first unfinished puzzle or **Level Select** for an unlocked machine. Complete each puzzle to unlock the next. Fixed toys show small locks. Choose a gadget, preview and place it; select a placed toy to move, rotate or delete. The inspector also supports precise keyboard coordinates and angles. Rotate a palette tool before placement with its arrow buttons or angle field. Use fewer editable gadgets to earn more stars. The hint explains the mechanism without changing the build.

**PUSH!** captures your setup and applies one starting action. No editing is possible until **Edit Setup**. Pause/Resume, Retry,0.25×/0.5×/1×/2× speed and Replay are available. Failed machines retain your layout and highlight the last meaningful physical interaction. Replay samples are recorded at15Hz, maximum901 complete view snapshots for60 simulated seconds; scrubbing selects recorded samples, not arbitrary physics rewind. Replay does not award progress again.

Desktop: click/place, drag/move, drag empty space/pan, wheel/zoom. R/E rotate+5°,Q−5°,Delete removes,Ctrl/⌘Z undo,ShiftZ redo,Space pushes,P pauses. Native controls work with Tab and Enter. Touch: choose a tool then tap or drag on the table; choose a toy then rotate/delete in the inspector; drag empty space to pan and pinch to zoom. Fit View restores a readable view after zooming/resizing.

Sandbox: all eight gadget types, selectable starting domino/marble/gear/spring, visible gear/switch-to-gear/spring links, spring strength and accepted-contact filters. Save up to three named machines; reuse a name to replace it. Export JSON text for backups/sharing and import validated Sandbox JSON. Layout JSON includes gravity, so low-gravity experiments can be imported (0–1400). All storage uses only `domino-disaster-save-v1`. Storage failures preserve play and permit export. Sound is off until enabled; volume, reduced motion and effects quality are adjustable.

## Source map

`physics.js`: deterministic120Hz rigid bodies, rotated SAT/contact manifolds, angular/linear impulses, friction, adaptive microsteps, sleep and bounded pivots. `gadgets.js`: validation, placement geometry, sensors, relays, springs and actual objective detection. `levels.js`: twelve puzzles and reference editor actions. `editor.js`: atomic changes and exact history. `game.js`: state/scheduling/scoring/replay. `renderer.js`: independent camera and toy visuals. `input.js`, `audio.js`, `storage.js`, `main.js`: browser integration.

See PHYSICS.md for the solver and its limits, PUZZLES.md for verified solutions, QA.md for execution evidence, and integration/README.md plus integration.patch for the prepared Arcade changes. BRIEF.md preserves the supplied request; API.md documents shared interfaces.

## Verify

Run `node --test games/domino-disaster/tests/*.test.mjs` from the repository root. The browser checks are `node games/domino-disaster/tests/browser.cjs`; they start their own local preview. The browser scripts use this workspace's bundled Playwright and installed Chrome paths; adjust those paths on another machine. `tests/performance.mjs` measures the complete72-domino CPU cascade/replay; `tests/browser-performance.cjs` measures the rendered stress case.

## Limits and publication

This is a playful lightweight sequential-impulse solver, not engineering software. Very dense stacks and tightly packed dominoes may require adjustments. Gear links are explicit simplified mechanical couplings, not simulated teeth. Springs provide predefined fictional energy to an actually nearby loaded object. Finish sensors always require moving physical contact. Camera decoration does not change collision geometry.

Maximum120 gadgets,16 platforms,120 links,32 forbidden zones,60 simulated seconds, bounded particle pools240/60/0 and eight concurrent audio voices. Large builds at2× can slow visibly; use1×, smaller arrangements or Low effects on slower devices. Browser performance figures are local headless Chrome measurements, not phone guarantees. Physical Android/iPhone and Safari/Firefox testing remain outstanding. Replays are memory-resident for the current test only; saved layouts preserve construction, not replay history.

**Forge Arcade integration authorized and applied on14 November2026.** The game appears in Games and Featured using the shared aligned pixel-card layout. The gallery contains40 registered /39 visible experiences; ELEMENTAL stays hidden behind its flask. See INTEGRATION.md for current integration validation. The original standalone brief and prepared patch remain as build history.
