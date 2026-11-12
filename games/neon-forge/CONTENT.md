# Neon Forge content notes

There is one immediately available Endless progression. Every getWave mode input, including legacy campaign values, returns the same seeded run. Authored WAVES remain frozen reference templates; level 10 and each subsequent multiple of ten reuse the sparse Forge Heart template. Every call returns independent mutable spawn data.

Every wave's analytical check services scheduled targets in stable spawn order,
using full angular rotation at 3.5rad/s, entry at strike radius 132, collision
deadline at radius 30, and 0.32s between strikes. Bulwarks reserve another
strike; Splinters reserve another strike for their close pair of fragments.
This checks normal control feasibility without spending shields or relying on
upgrades. It does not replace the simulation's actual combat policy playthrough.

Endless mixes target types using a seed and level-derived random stream. Durable targets enter at level 3, fragmenting targets at level 5. Each two-lane burst contains at most one durable or fragmenting parent, keeping finite keyboard rotation feasible at the final density. Groups grow from 8 to a cap of 18 (16–36 scheduled targets); speed begins at 50 and gradually caps at 78. Beat spacing drops gradually from 2.8 to a 2.0-second minimum. Regular levels cap at 16 active targets, boss levels at 8. Delayed splinter children remain queued without dropping children; each finite schedule can produce only a finite queue.

Completing a level sets explicit completedLevels and grants its summary/bonus once. After a 0.9-second threat-free intermission, the next level starts automatically. Every third completion offers three upgrade choices instead; selection starts the next level. Bosses have 12/14/16/18 HP at levels 10/20/30/40 onward; phase thresholds remain at two-thirds and one-third maximum HP. Boss defeat clears the arena and follows the same intermission flow.
