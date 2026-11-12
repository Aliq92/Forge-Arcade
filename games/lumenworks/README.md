# LUMENWORKS — The City That Wakes

A complete standalone Canvas2D puzzle game for Forge Arcade. Restore thirteen miniature neighbourhoods, then build a city freely in Sandbox. Vanilla JavaScript modules, local SVG artwork, procedural Web Audio and localStorage; no framework, CDN, backend or external runtime dependency.

## Play locally

Serve the repository root with any static HTTP server, then open `/games/lumenworks/`. ES modules require HTTP; opening `index.html` directly with `file://` is not supported. Once served locally, the game needs no internet connection.

The repository's existing preview can be started from its root:

```
node tests/the-last-lighthouse-preview.cjs
```

Open `http://127.0.0.1:8428/games/lumenworks/`. The preview's Lighthouse name does not limit which repository files it serves.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Draw cable | Drag source port to destination; or tap both ports | Notebook → Connect with keyboard → From / To / Connect |
| Inspect | Choose Inspect, then a port or cable | Notebook component selector |
| Switch | Select Switch and tap a switch, or use its notebook button | Tab to notebook action; Enter / Space |
| Battery | Select battery; choose Off, Charge or Support in notebook | Same native notebook controls |
| Pan | Drag empty ground | Arrow keys |
| Zoom / fit | Pinch, wheel, + / − / Fit | + / − / F |
| Tools | Toolbar | C cable, S switch, B battery, I inspect |
| Undo / reset | Toolbar | U or Ctrl/Cmd+Z; R opens confirmation |
| Pause | Toolbar; menus also freeze simulation | Escape; Space on empty focus |

The mobile Notebook button opens a scrollable drawer; the toolbelt scrolls horizontally on small screens. Controls and port hit areas remain touch-sized. Native menus/dialogs and selectors support keyboard focus. Switch state, damage, selection, valid/invalid drafts and powered states use symbols or patterns alongside colour.

## Power and batteries

Power follows directed cables. A generator has an output limit, a substation or switch has a throughput limit, and every building requires its **whole** demand. The allocator can reroute through multiple paths while preserving higher-priority served buildings. It never duplicates energy through cycles. Excess demand is shed and a bottleneck warning names the constrained component; actual flow never exceeds ratings.

PU is instantaneous fictional power. EU is stored energy: one PU for one active simulation second costs one EU. Battery modes are exclusive:

- **Off:** no charge, discharge or pass-through.
- **Charge:** takes unused generator output within cable, throughput, charge-rate and storage limits.
- **Support:** supplies finite reserve energy within its discharge rate. It cannot receive power simultaneously.

Planning is untimed. Batteries change energy only during a stability check or Sandbox simulation. Pausing, opening menus or hiding the tab freezes active time. A successful campaign hold automatically stops the simulation. Undo changes topology/modes while preserving energy already consumed. Reset explicitly restores starting energy and warning history.

## Campaign and stars

Thirteen authored districts teach direct connections, essential/optional demand, substations, damaged-route bypasses, battery support, tram supply, switches and multiple generators, then citywide balance. `LEVEL-DESIGN.md` documents exact references and budgets; executable solutions live with each level and are tested against the real Game and allocator.

Earn one star for essential completion, a second for no overload warning during the attempt, and a third for that clean attempt within its cable budget. Planning warnings count, even if later repaired; Reset clears warning history. Optional stars never block sequential unlocks. Replay preserves the best stars and all previously earned objective flags.

## Connection hints

Press **Hint** in the toolbar, or **H**, to see exactly which named source connects to which destination. Gold **FROM** / **TO** markers and a dashed arrow show the ports; the camera frames the pair and the keyboard connector is prefilled. Draw or tap the connection yourself. Repeated requests keep the same next step until you perform it. Dismiss the message with ×.

Hints cost no stars, spend no energy and never make edits automatically. They also identify switch and battery settings, isolated cables, and when to start the stability check. For an incompatible route they may recommend a specific cable removal; if a finite reserve can no longer last, they explicitly recommend Reset. A completed valid alternative is accepted. Sandbox can suggest a useful legal connection when one exists.

Existing eight-district saves migrate in place: stars, achievements, settings and saved city stay intact. Completing the original eight unlocks Harbor Lights (district nine). New districts are Harbor Lights, Hilltop Relay, Glasshouse Quarter, Night Shift and Festival of Lights.

## Sandbox and saves

Independent of progression: place generators, substations, switches, empty batteries and seven building styles. Remove components/cables, undo, run energy simulation, and save/load one validated city layout. Limits are 48 components / 96 cables. Placement snaps to half-tiles and leaves space between components.

Only `lumenworks-save-v1` is written. Progress, achievements, settings and Sandbox are versioned and validated; malformed data recovers safely. Storage failure leaves gameplay available and displays an honest warning. No other game's storage is cleared. Sound defaults off; optional quiet ambience, volume, reduced motion and quality preferences persist.

## Verification

```
node --test games/lumenworks/tests/*.test.mjs
node --test tests/*.test.mjs games/lumenworks/tests/*.test.mjs
node games/lumenworks/tests/browser.cjs
node games/lumenworks/tests/interaction-browser.cjs
node games/lumenworks/tests/hints-browser.cjs
node games/lumenworks/tests/performance.cjs
node build.mjs
```

Browser scripts use the locally installed Playwright and Chrome. The performance script accepts a base URL argument, `PLAYWRIGHT_MODULE` and `CHROME_EXECUTABLE` overrides. See `VERIFICATION.md` and `PERFORMANCE.json` for results and limits. Screenshots and raw local browser reports are under `test-results/lumenworks/` (ignored evidence, not shipped).

## Integration and limits

The user subsequently authorized Forge Arcade integration. Lumenworks now uses the shared Games/Featured card templates and pixel thumbnail pipeline, with the complete thirteen-district runtime and connection hints. See `INTEGRATION.md` for alignment checks and publication details. The original build brief remains unchanged as historical context.

The city is a fictional network-allocation puzzle, not an AC electrical model or a real switching procedure. There is no cloud save, infinite map, automatic battery scheduling or arbitrary cable bend routing. Cable routes are straight and authored districts restrict legal links. Very small screens use pan/zoom. Browser checks emulate touch in desktop Chrome; physical Android/iPhone devices and Safari/Firefox were not available for this verification. Headless timing is not a promise of physical-device frame rate.
