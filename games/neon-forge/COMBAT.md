# Combat and QA policy

`Game` owns deterministic 120 Hz simulation. Each `advance` consumes at most 250 ms; paused/upgrade/gameover states freeze simulation. Clearing a level removes pending attacks, echoes and threats; the 0.9-second intermission advances survival and held rotation only. Pause/resume preserves the interrupted live state and remaining intermission timer. Facing uses radians clockwise from right. Reach is 132, danger radius 30, total base arc 50°, active 100 ms and total strike interval 320 ms. Perfect center is radius 86 with half-width `target.speed * .05`. Every attack remembers target IDs. Input must request a new strike on a new press; recovery refuses repeated requests.

Ordinary enemies approach from radius 270. Drifter lateral motion is bounded by .12 radians. Bulwarks have 2 HP and a visible cracked state after any damage. Splinter children appear at radius at least 154 and offsets ±.14 radians; neither the parent attack nor its chain can immediately damage them. Children waiting for an alive-cap slot remain in `pendingChildren`, and completion waits for them.

Chain adds at most the owned level (maximum two) additional victims per entire primary strike within 90 world units of a primary victim. Primary arc victims resolve first. Echo uses the original arc, reach and angle after .16 s for .5 damage, and triggers no abilities. Time Bend changes incoming travel only. Combo Keeper protects one mistake per charge and refreshes owned charges on wave start. Pulse capacity and repair are handled by the upgrade module.

The Forge Heart recurs every tenth level with 12/14/16/18 HP at levels 10/20/30/40 and a permanent 18 HP cap. It has eight-second cycles. Its angle is fixed for each cycle. Telegraph runs from 3.5 to 5.2 seconds; the core is actually at radius 104 during the 5.2–7.1 second vulnerability window, then returns to radius 250. Each window permits at most three damage registrations, including echoes. HP thresholds at two-thirds and one-third of maximum activate phase two and three. Phase two spawns one ordinary target and phase three two spaced targets per cycle. These retain normal travel/collision rules. The first boss takes four successful windows, approximately 30 seconds. Defeat emits bossDefeat, clears remaining arena threats and enters the normal intermission. Later collisions in that simulation tick cannot reverse completion. There is no terminal win state.

## Reproducible browser playthrough

The exported `policyStep` in `tests/simulation.test.mjs` is the executable pure-simulation policy. Browser QA can use the same policy while letting the normal animation loop advance time:

1. Sort live targets by `(r - 30) / speed` (earliest shield impact).
2. Select the first target at radius ≤140. If none, select the vulnerable boss; otherwise track the earliest incoming target. If no target remains, track the boss during telegraph.
3. Mouse policy calls `aim(goal.angle)`. Keyboard policy calls `setRotation(sign(normalizeAngle(goal.angle - player.angle)))`, stopping when error ≤.025 radians. The game itself limits rotation to 3.5 rad/s.
4. Deliberately request `strike()` when the chosen ordinary target is at radius ≤124, or the chosen boss is vulnerable. Keyboard additionally waits until angular error <.25 radians. Recovery refuses requests that arrive too soon; each accepted strike is a separate attempt.
5. During intermission, continue advancing time naturally. At upgrade, choose an offered Wide Arc if available, otherwise the first offered choice. Do not change shields, target positions, boss HP, state, upgrades, timers or schedules.

The automated suite completes levels 1–21 for seeds 1, 42 and 987 with both mouse and finite-speed keyboard policies, observing phases 1–3 and boss defeats at 10 and 20. Seed 77 completes through level 21 with keyboard observations only every 100 ms. Seed 122 completes through level 61, beyond the permanent speed/beat caps. All these runs take zero shield damage and use only offered upgrade choices. This demonstrates timing feasibility, not a substitute for human playtesting.

Run `node --test games/neon-forge/tests/*.test.mjs` from the repository root. Unit tests may construct precise combat fixtures; seeded playthroughs use only normal public controls and advance time without mutating simulation state.
