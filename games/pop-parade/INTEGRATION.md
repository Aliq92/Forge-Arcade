# POP PARADE in Forge Arcade

`pop-parade-register.js` appends a single featured entry to the existing `GAMES` registry. The launcher opens `games/pop-parade/index.html` using its existing relative document links. The existing Games category hosts it; metadata retains the requested Arcade classification. No filters, routing, global styles, settings, or other games were changed.

`pop-parade-card.css` scopes the balloon SVG to this game's featured and archive artwork. The native game adds one 44px return link to `../../index.html`, with Forge's existing brand mark styling isolated in `arcade.css`. The Canvas simulation, rendering, audio, modes, and saves are unchanged from the completed game.

Runtime files: `index.html`, `style.css`, `arcade.css`, `game.js`, `engine.mjs`. The existing static build copies these automatically. No framework, package installation, or new registration system is required.

Local saves retain `popParade_bestScore`, `popParade_zenBestScore`, `popParade_largestChain`, `popParade_sound`, and `popParade_mode`. Saves are origin-bound: records from another domain or port cannot transfer automatically. No other save namespace is touched.

Verification:

```sh
node --test --test-isolation=none tests/*.test.mjs
node build.mjs
python3 -m http.server 8420 --bind 0.0.0.0
# With Playwright and Chromium installed:
node tests/pop-parade.browser.cjs
```

Browser checks cover featured/archive entries, filters, existing spotlight, retired-game visibility, native game launch, a real balloon pop, pause, return navigation, browser back, unrelated saves, mobile layout, and the production path. `ARCADE_TEST_URL` selects another preview origin, and `CHROMIUM_PATH` selects another Chromium executable. Screenshots are written to `/tmp/pop-parade-integration`.
