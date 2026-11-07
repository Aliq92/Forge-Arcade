# Void Drifter — recovery and discovery upgrade

Local preview: http://127.0.0.1:8428/games/void-drifter/

Fly with W/Up, reverse with S/Down, turn with A/D or Left/Right, boost with Space, dock with E, pause with Escape or the HUD button. Touch controls retain the same flight actions. Pause offers Restart Run.

Fuel now supports longer normal flight. Running empty activates **LOW POWER**: momentum persists and weak energy-powered thrusters provide maneuvering. They cannot accelerate a stationary ship beyond 55 world units/second; normal acceleration is 250 world units/second², versus emergency acceleration 18. Existing momentum can remain faster. Boost is unavailable without fuel. Coast to recharge energy; low-power ion-cloud drain is reduced so recharging remains possible.

Press **R / RESERVE** below 15 fuel. With 10 salvage, manufacture 25 fuel with a 20-second cooldown. Otherwise, spend 25 energy for 12 fuel with a 45-second cooldown. Solar recharge, emergency canisters, mystery cargo and existing refueling stations provide recovery choices. Reserve synthesis remains available when a safe external supply location cannot be found.

Glowing **? cargo** arrives periodically in safe nearby approaches. A seeded ten-reward bag contains one full refuel, three emergency supplies, two shield boosts, two salvage jackpots and two repair kits. Rewards that would be wasted convert to useful salvage or shield protection. A full refuel fills upgraded tanks and displays **FULL REFUEL!** with a brief confetti celebration. Shield cargo supplies 40 temporary protection for 12 simulation seconds; damage can exhaust it sooner.

One optional mission is active at a time: gather 30 salvage, recover cargo, or reach a safe-return checkpoint. **SKIP** moves on after a short delay. Completion grants fuel, energy and salvage. Existing distress signals, random events, station services, achievements, upgrades, mode choices and arcade navigation remain.

Existing fuel-tank upgrades also improve efficiency; boost upgrades add energy capacity; hull plating improves repair pickups. Existing saved settings, best distances and achievement keys are unchanged. Upgrades still belong to the current run, as before.

Run checks from the repository root:

```
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs
node games/void-drifter/tests/balance.cjs
```

Browser checks use the existing configured Playwright/Chrome installation and a static server on port 8428:

```
node games/void-drifter/tests/browser.cjs
```

The repeatable baseline harness reads the original source from repository commit 2a4c907. No gameplay dependency was added. See VERIFICATION.md for measured results and limits. This upgrade is included in the user-approved Forge Arcade release. Set FORGE_ARCADE_URL=https://aliq92.github.io/Forge-Arcade/ to run browser checks through the public game card.
