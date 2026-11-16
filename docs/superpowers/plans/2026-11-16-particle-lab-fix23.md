# Particle Lab Fix #23

User brief: attachment `5689ab7c-fad2-477a-8bed-702f5d740c89/Pasted text.txt`.
Development branch: `codex/particle-lab-fix-23`. No publication, push or merge without later explicit approval.

Inspect and baseline the current native Particle Lab before editing. Preserve its name, visual identity, relative Arcade navigation and gallery integration. Remove the superseded light-particle/gravity-well gameplay, controls, instructions and runtime code. Reuse useful cellular/rendering/input patterns where appropriate.

Implement a bounded deterministic material grid with sand, water, stone, metal, wood, oil, lava, ice, steam and necessary fire/smoke/air. Provide density-aware motion, local heat conduction and qualified gameplay phase/combustion rules. Keep materials conserved in movement and document intentional combustion/escape transformations. Separate numerical resolution from display size and scientific steps from display refresh.

Build creative Sandbox Mode, material descriptions, brush/rate/size, eraser/line/rectangle, heat/cooling, pause/play/step/reset/clear/speed, sensible keyboard/touch input, tutorial and bounded versioned saves. Keep sandbox data separate from new challenge progress and preserve incompatible old saves without silent overwrite.

Author all twelve named challenges from the brief, with designed layouts, restricted legal tools/materials, observable success conditions, readable objectives, unlocks/replay/retry and completion feedback. Test every challenge through normal legal edits and real engine evolution; injecting objective completion or merely plausible geometry is insufficient evidence.

Validate force-free material physics, phase reactions/heat/density/stability, progression and persistence, all twelve solution replays, real Chrome desktop and mobile touch/landscape, pause/reset/mode lifecycle, malformed/blocked storage, reduced motion and bounded performance. Independent review and regression fixes precede local handoff. Only Particle Lab and this plan change; unrelated local work remains untouched.

Ruling: retain finite heat exposure rather than guarantee ignition from every single short-lived source in a cold stone enclosure. Correctly placed sustained fire/lava sources ignite room-temperature wood/oil, and Firebreak demonstrates real propagation. This satisfies sufficient-temperature interactions without inventing unlimited source heat. The cost if the small-source behavior proves unsatisfying is further bounded heat/game-feel tuning and replay validation; the documented model is not an exact thermodynamic solver.

Completed: new material engine, nine primary materials plus effects, temperature/reactions, all twelve named handcrafted challenges and tested legal solutions, separate progression/sandbox persistence, editing tools, five sandbox templates, tutorial and responsive interface. Old well/tracer code and obsolete tests removed. Baseline 22 tests passed; replacement 20/20 tests passed. All twelve visible-control challenge playthroughs passed in Chrome. Desktop, touch portrait, narrow reduced-motion and landscape checks passed with true persisted Back/Forward restoration and zero console/page errors. Review found thermal false-success and cached navigation disposal; both fixed with regression tests, scoped re-review approved with no new P1/P2. Detailed evidence, inventory, performance and limitations: games/particle-lab/VERIFICATION-FIX23.md and qa/. Only Particle Lab and this plan changed; no publication, push or merge.
