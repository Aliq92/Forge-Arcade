# Void Drifter verification — 7 November 2026

## Inspected systems and scope

Inspected every existing Void Drifter script, its HTML/CSS, and hosting configuration before editing. Existing systems include Newtonian-style drift, rotation/thrust/reverse/boost, fuel, rechargeable energy, hull and upgrade shields, magnetized pickups, salvage/cargo, streamed seeded sectors, asteroids/mines/ion clouds/debris/solar fragments/gravity wells, station refuel/repair/upgrades, distance upgrades, random distress/salvage signals, achievements, four modes, settings/best-distance storage, and the arcade return link. Hull destruction is the formal loss condition. No finite victory or persistent run-save system existed.

The upgrade reuses those systems. All source/support changes are inside games/void-drifter/. Arcade home/cards/thumbnails, other games, deployment settings and prior unrelated dirty work are untouched. Nothing was committed, merged or deployed for this fix.

## Executed checks

- Baseline repository suite before implementation: **198 passed**.
- Final repository + Comet Shepherd + Void Drifter suite: **218 passed, 0 failed**, including **20 dedicated Void Drifter tests**. Static production build and diff whitespace checks passed.
- Zero-fuel, zero-energy ships recovered through an actual reachable 22-fuel canister in **5.0667 simulated seconds** for seeds 11, 22, 33, 44 and 55. Emergency thrust and the real pickup collision path were used. Separate tests verify energy-to-fuel and salvage-to-fuel reserve recipes, cooldowns, and recharge while coasting inside an ion cloud.
- Holding emergency thrust and boost from rest for 60 seconds remained at or below **55 world units/s**, with normal boost disabled and energy consumed. Inherited momentum is preserved rather than forcibly clamped to that speed. Regular propulsion still burns fuel.
- Fixed-step motion, fuel, energy, time and cargo timing agree at 30, 60 and 144 rendered frames per second within 0.0000001 tolerance. Long deltas are clamped. Pause freezes simulation time, player state, cargo/mission timers and temporary shields.
- Seeded reward selection includes each intended reward; full refuels occur once per ten-item bag. Cargo grants a reward once, fills upgraded tanks correctly, expires shield boosts after twelve simulated seconds, applies salvage/repair/supply effects, and supplies useful fallbacks. Canister/box placement and approach-corridor clearance passed across five seeds.
- Salvage and safe-return missions complete once; cargo progress and mission cycling are covered. Confetti/milestone triggers remain bounded by the existing 500-particle pool. OS and in-game reduced motion suppress CSS movement and reduce confetti to four small particles. Reward text expires independently of CSS animations.
- Legacy best-distance migration, saved settings and every existing upgrade key remain compatible. Restart resets run state, cargo, mission progress, temporary shields, reserve cooldown and held controls.
- Browser playtest passed at **1440×900, 768×1024, 390×844, 320×740 and 844×390**. Verified launch/tutorial, keyboard thrust/boost, real emulated touch hold/release, low-power movement/status, reserve button recovery, collision collection of full-refuel cargo during actual flight, visible confetti/text, mission completion, pause/resume, restart, settings, and return to the arcade. OS reduced-motion expiry and blocked local storage also passed. No blocking console/page errors or horizontal overflow were recorded. Screenshots were inspected.

## Before/after balance comparison

Baseline source is fixed at commit **2a4c907**, before this upgrade. Each version uses the same world seeds, a 1/60 s update, and a cautious low-speed exploration policy making decisions every 0.2 seconds. It seeks supplies and avoids nearby hazards; the upgraded policy also uses the newly available reserve action. Each scenario runs for up to six simulated minutes.

| Seed | Original: first empty tank with speed below 8 | Upgraded: operational through test cap |
| --- | ---: | ---: |
| 11 | 69.42 s | 360 s |
| 22 | 273.65 s | 360 s |
| 33 | 113.90 s | 360 s |

Median time before practical fuel immobility was **113.90 seconds** in the original scenarios. All upgraded scenarios stayed operational through **360 seconds**, at least **3.16×** that median observation. The original cautious ships also retained hull through six minutes; their control/travel options had effectively ended. The measured gain is sustained playable travel and recovery. These scenarios do not establish a human-player hull-survival average.

The upgraded exploration scenarios collected **14–15 mystery boxes** and completed **2–3 missions**. Blind continuous thrust still caused hull destruction after about **14–38 seconds** in the three upgraded seeds: supplies do not remove collision risk or substitute for steering. This also explains why formal hull-survival time can be longer in an original ship that has stopped moving in a safe location.

## Evidence and limits

Local evidence: test-results/void-drifter/full-suite.log, suite.log, baseline.json, balance.json, browser-report.json and representative screenshots in that folder. The policy scenarios are repeatable simulation tests, not observed human play. Browser reward tests use a known full-refuel box placed on a real flight path; they test collection/delivery/effects rather than the natural rarity rate. Browser mission tests inject known salvage; seeded simulation tests cover the mission logic.

Physical phones, sustained mid-range-device frame rate, subjective difficulty and speaker output have not been measured. Supplies are checked against nearby hazards and short projected movement when spawned; hazards can subsequently move toward them. A blocked corridor delays external cargo placement and retries every two seconds; rechargeable onboard reserve remains an independent recovery path. Severe collisions can still destroy a ship. Run upgrades remain temporary and there is no new cross-session run save.

Readiness: local verification passed and publication to Forge Arcade was subsequently authorized. The deployment is checked through its existing arcade card across desktop/mobile layouts; the public results are stored locally in test-results/void-drifter/public-browser-report.json.
