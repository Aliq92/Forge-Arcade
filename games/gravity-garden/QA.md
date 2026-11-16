# Fix 22 validation

- Node syntax checks for script.js and physics.js passed.
- node --test games/gravity-garden/tests/physics.test.cjs: six passing tests covering seven types, strength/radius filtering, direction, deterministic pulse/chaos, linked independent binary centers, bounded combined forces and invalid inputs, and 3,600-tick orbit stability.
- node --test games/gravity-garden/tests/browser.test.cjs: two passing real headless Chrome scenarios, desktop1280x800 and touch390x844. Seven type placements/selections; strength/radius input; binary separation/rotation; real desktop/touch dragging and core selection; enabled toggle; duplication/delete; particle seed; pause/step/resume; nine existing preset entries and Classic reset; cinematic enter/exit; existing storage settings retained; zero page errors. Screenshots saved beside test.
- Browser network checks need local-preview network access; first restricted attempt returned ERR_NETWORK_ACCESS_DENIED, then approved local Chrome checks passed. No external publication performed.

## Behavior and preservation
Attractor/repulsor extend existing polarity entities. Vortex combines inward and tangential force; pulse uses simulation-time cosine with independent repulsion strength; orbit uses damped radial correction and tangential speed guidance; chaos uses seeded deterministic oscillation; binary contributes two half-strength linked centers. All combined accelerations capped at2.5 and particles retain velocity cap42 and fixed60Hz accumulator. Range filtering is smooth. Existing preset polarity magnitudes folded into initial mass to retain intended relative strength. Revised range falloff/softening means exact old trajectories are not identical.

Only ordinary attractors absorb and merge. Specialized wells never auto-convert; binary cores remain one removable/draggable object. Tap now selects, with existing attract/repel flip available explicitly in inspector. Existing nine presets, particle tools, settings key, boundaries, COM, trails, cinematic, pause and reset remain. No progression added.

## Limits
Touch is Chrome device emulation, not a physical device. Firefox/Safari not tested. No hardware frame-rate benchmark. Visual effects capped per well and flash/spark queues bounded; existing max16 wells and400/800 particle limits retained. Long suspension is capped by existing accumulator, so simulation deliberately drops excessive wall time. Reduced motion freezes decorative animation while physical binary centers still follow simulation.

## Review fix round1
Read fix-loop guidance. Red regressions: Chrome desktop/touch attractor re-selection returned REPULSOR; new orbit-range unit failed (missing shared resolver). Fixed tap to select only, normalized legacy polarity sign after folding initial magnitude into mass (duplicates retain strength), synchronized Fountain/Void Bloom repulsor types, and synchronized deselection controls. Shared orbitRadius resolver caps target at75% of influence; radius edit shrinks target and orbit-target edit expands influence so engine, guide and controls agree. Strength input supports0.005 increments to represent existing fractional preset/absorption masses; inspector updates after slider edits.

Covering commands: node --test games/gravity-garden/tests/physics.test.cjs ->7/7 pass; node --test games/gravity-garden/tests/browser.test.cjs ->2/2 pass (real Chrome desktop/touch,14555ms). Browser regressions include non-flipping selection, radius60/orbit300 joint edits, Fountain/VoidBloom repulsor selection and duplication mass retention. Latest screenshots tests/desktop.png and tests/touch.png visually inspected (touch). No pending known functional failures.
Final inspector consistency rerun: Chrome desktop/touch2/2 pass in18186ms. Arcade return moved below hint (96px on narrow screens).
