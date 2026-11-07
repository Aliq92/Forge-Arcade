# Echo Runner upgrade plan

Inspection: 14 data-driven levels across four chapters; fixed 60 Hz entity physics with coyote time/jump buffering; input recordings replay from spawn; pressure plates, restricted switches, linked/timed doors, moving platforms, lasers, crumbling floors, persistence, Canvas rendering, procedural audio, desktop/touch controls. Existing hero is a rounded white block. Existing room completion has statistics but no confetti. Original level geometry and 22×34 collision dimensions will remain.

Use existing motion tuning to preserve all old jumps and recordings; add presentation-only running/idle/jump/landing animation. Build coherent laboratory/ruin chambers with chapter tint, parallax architecture, ambient motes and platform detail. Bound particles and confetti independently from physics. Full-screen confetti lasts two seconds and sits behind immediately usable completion buttons. Add sound toggle and a compact recording/playback/holding timeline.

Correct deterministic recording origin by rewinding an attempt when a new recording starts; replay and recording then share tick zero and spawn state. Correct timed-door expiry so latched switches do not hold a timed door open forever. Fix unsafe saves, pause/input cleanup and exit-before-death ordering with regressions. Preserve old layout data and prove completion through actual gameplay.

Add exactly five handcrafted rooms, IDs 15–19 in a new Resonance chapter: First Contact (echo-only plate and door); The Moving Line (echo-held upper door and vertical lift); Double Exposure (two echo plates and one combined lock); Fractured Timing (echo timed switch and a moving hazard); The Final Echo (two plates, a crossing lift, a player switch and final timer). Introduce only moving hazards as a new object form, reusing deterministic platform motion.

Execution:
- [x] Run baseline suite; write original-level data fingerprint and a real-controller solution harness.
- [x] RED-to-GREEN tests for recording origin/replay, timed expiry, fixed-step consistency, movement/jump, pause/restart/storage and particle limits.
- [x] Add the five room definitions and verified input-only solutions for every original and new room.
- [x] Add explorer art, atmospheric themes, reactive effects, timeline, confetti/final UI and audio/touch polish.
- [x] Run all simulation and browser checks (desktop, portrait/landscape, final screen, reduced motion, blocked storage), inspect screenshots, fix observed defects.
- [x] Fresh review, final evidence/report and local preview. Do not deploy.

Verification focus: identical inputs and environment must reproduce echo paths within 0.0000001 world units; expiry/death/reset must not grant completion; timers freeze on pause; existing v1 save keys remain; exactly five added rooms; platform riding and switch coordination must work in real ticks, with no teleporting or direct trigger-state changes in solution evidence. Physical-phone performance and human difficulty remain limitations until measured.

