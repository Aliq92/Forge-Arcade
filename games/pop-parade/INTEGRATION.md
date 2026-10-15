# POP PARADE in Forge Arcade

`pop-parade-register.js` appends a single featured entry to the existing `GAMES` registry. The launcher opens `games/pop-parade/index.html` using its existing relative document links. The existing Games category hosts it; metadata retains the requested Arcade classification. No filters, routing, global styles, settings, or other games were changed.

`pop-parade-card.css` scopes the balloon SVG to this game's featured and archive artwork. The native game adds one 44px return link to `../../index.html`, with Forge's existing brand mark styling isolated in `arcade.css`. Gameplay and presentation remain isolated to this game's directory.

Runtime files: `index.html`, `style.css`, `arcade.css`, `game.js`, `engine.mjs`, `balloon-atlas.mjs`. The existing static build copies these automatically. No framework, package installation, or new registration system is required.

Local saves retain `popParade_bestScore`, `popParade_zenBestScore`, `popParade_largestChain`, `popParade_sound`, and `popParade_mode`. Saves are origin-bound: records from another domain or port cannot transfer automatically. No other save namespace is touched.

Verification:

```sh
node --test --test-isolation=none tests/*.test.mjs
node build.mjs
python3 -m http.server 8420 --bind 0.0.0.0
# With Playwright and Chromium installed:
node tests/pop-parade.browser.cjs
node tests/pop-parade-gameplay.browser.cjs
node tests/pop-parade-upgrade.browser.cjs
```

Browser checks cover featured/archive entries, filters, existing spotlight, retired-game visibility, native game launch, a real balloon pop, pause, return navigation, browser back, unrelated saves, mobile layout, and the production path. `ARCADE_TEST_URL` selects another preview origin, and `CHROMIUM_PATH` selects another Chromium executable. Screenshots are written to `/tmp/pop-parade-integration`.

## Gameplay, visual, and performance refinement

Seeded horizontal, vertical, and spiral paths form varied connected color clusters with at least five balloons per cluster on supported layouts. Propagation, score rules, three Classic taps, the three special types, and endless Zen remain compatible. Chain events now carry the reaction ID, count, score, and centroid for a live chain meter and accurate localized celebrations. Lightning and Rainbow have distinct wave outlines; all specials have readable activation labels. Confetti retains real pop/centroid origins, outward launch, flutter, tumble, gravity, bounded count, and expiry. Special audio uses short distinct voices under the existing six-voice cap.

Static balloon bodies are cached by color and special type in at most 20 offscreen canvases, with DPR capped at two. Strings and reaction effects remain animated. Paused/hidden playfields stop their animation loop; settled results also stop drawing once their effects finish. Record writes are batched and flushed when a chain ends, results appear, the player pauses/restarts/switches modes, or the page is hidden/exited. Reduced-motion users receive fewer particles and no score bounce. Mobile controls have targets of at least 44px.

The upgrade browser suite verifies these behaviors, repeated Classic/Zen sessions, preserved records, responsive layouts, and reduced motion. It writes screenshots and measured gradient/paused-draw counts to `/tmp/pop-parade-upgrade`. These are rendering-work measurements in Chromium, not a frame-rate guarantee for physical devices. Physical iOS/Safari and stylus hardware testing remain outstanding.
