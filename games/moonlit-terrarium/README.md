# Moonlit Terrarium — Seven Quiet Nights (v1.0 final update)

A calm autonomous ecosystem with four glowing Motes: Ember, Pip, Sable,
and Wren. Keep at least one glowing through seven 40-second nights.
No dependencies or build step: open `index.html` in a modern browser,
or launch Moonlit Terrarium from Forge Arcade.

Each night, choose one gift and tap the glass to place it. Food eases
hunger; Water eases thirst; Shelter restores energy; a Moon Lamp slows
nearby energy drain. All four Motes can share a gift. Gifts disappear at
dawn, when a new choice unlocks. Dawn summaries record how the colony did.

For keyboard care, activate a gift button with Enter or Space, aim with
the arrow keys, then press Enter or Space to place. Escape cancels. The
Ember/Pip/Sable/Wren buttons inspect each Mote without requiring a precise
canvas click. Pause freezes active play. Restart asks before replacing
an unfinished run.

Progress saves every two seconds, immediately on care, dawn, pause and
completion, and when the page hides or exits. Reopen and choose Continue
to resume the same night and gift. Closed-tab time never advances the
simulation. Completed stories can also be reopened. Saves are local to
the browser and origin; blocked storage shows a message while play
continues. Invalid or unsupported saves safely offer a new story.

Optional ambient sound starts only after interaction and fades while
paused, hidden or finished. Sound defaults off. Reduced motion honors
the system preference and can be toggled; it freezes decorative motion
and suppresses particles without changing Mote movement or simulation.
Preferences persist separately from each story.

## Final release fixes

- Safe wander targets after social gathering; satisfied care ends cleanly.
- Native button click activation works for keyboard, pointer and touch.
- Gift controls correctly lock before starting, while paused and after ending.
- Manual pause survives save/reopen and hidden-tab pause respects it.
- Restored Motes use validated needs/positions and rebuild behavior references,
  avoiding cyclic social references in saves.
- Final dawn clamps the countdown to zero so completed saves remain valid.
- Mobile stage uses its actual aspect ratio without a 640px flex spacer;
  small overlays scroll, browser zoom remains available, and focus is visible.
- Distinct Mote personalities and movement speeds, accessible inspection,
  dawn summaries, saved stories, optional ambient audio and reduced motion.

## Verification

From the Arcade root:

```sh
node tests/moonlit-terrarium.test.mjs
python -m http.server 8420
# In another terminal, with Playwright and Chromium installed:
node tests/moonlit-terrarium.browser.cjs
node build.mjs
```

Simulation regressions cover safe wandering, care completion, gift limits,
dawn cleanup, cyclic-reference saves, corruption recovery, seven-night
victory, unattended loss, restart cancellation and unavailable storage.
Browser playtests cover keyboard care, pause, Arcade exit/re-entry,
preferences, dawn, persisted victory and mobile/landscape layouts.
