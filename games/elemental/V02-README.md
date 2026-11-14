# ELEMENTAL v0.2 · Atomic & Reaction Laboratory

One game, two independent laboratories, one shared identity catalogue. The user approved Forge Arcade integration on 15 November 2026. Open the existing flask symbol in the footer to enter ELEMENTAL; both laboratories live inside this one hidden game. No visible ELEMENTAL or Reaction Lab card is added.

## Play

From the repository root run `node games/elemental/tests/preview.cjs`, then open <http://127.0.0.1:8428/games/elemental/>. All production assets are local; use HTTP for ES modules. There is no new runtime dependency, CDN, API or service worker.

The entrance menu offers **Atomic Lab**, **Reaction Lab**, and **Discovery Library**. The top navigation switches modes without replacing either live workspace. Atomic Lab retains its periodic table, isotope/ion explorer, molecular builder, reference geometry, twelve challenges and existing progress record. Its construction workspace remains in memory, as in v0.1; a full reload starts a new construction. Reaction Lab additionally persists its preparation between reloads.

## Discovery flow

1. Select elements or inspect supported atoms in Atomic Lab. A validated reference molecule also becomes a discovery. Unverified isotope configurations do not become verified atomic identities.
2. Open **Import from Atomic Lab** inside Reaction Lab. Search/filter the catalogue and choose an available **bulk reagent form**. Neutral hydrogen/oxygen identities can unlock H₂/O₂; an isolated sodium atom does not magically become a salt. Unsupported conversions explain why.
3. Prepare a virtual experiment. Supported products are recorded as identities in the shared library. Importing or discovering never removes the original record or copies live atoms, camera positions or experimental objects.
4. Browse a product from either mode. Discrete reference molecules offer an explicit **Open reference in Atomic Lab** action; this replaces the molecular construction only when selected. Merely viewing the catalogue preserves it. Ionic solids show formula-unit composition instead of a fake discrete molecule.

The shared catalogue derives existing element, isotope and molecule identities from the original datasets. New compounds and ions have one centralized composition definition. Formula, charge, source, representation and reaction eligibility are distinct fields. Isotope-specific bulk samples, unsupported ionic reagents and unverified geometries remain outside scope.

## Reaction workspace

Choose a guided experiment or Free Experiment Mode. Add substances using inventory buttons or desktop drag/drop, edit quantities, choose apparatus/conditions, then **Run virtual model**. Quantities are virtual and bounded per trial. Every Run recalculates the same preparation; it never accumulates free products into inventory. Clear and Reset preserve your journal and discovery progress.

Eleven guided experiments cover salt and sugar dissolution, miscible and immiscible liquids, strong acid/base neutralization, bicarbonate gas evolution, calcium-carbonate precipitation, a dilute no-precipitate comparison, pure-water phase change, salt recovery/crystallization, and abstract activated molecular synthesis. Guided and free trials use the same deterministic engine. Three reaction achievements evaluate actual result predicates.

The outcome panel shows observations, balanced equations where applicable, limiting species, complete final material ledger, and conservation residuals. Products/excess/solvent/spectators remain explicit. Unsupported combinations display **NO VERIFIED REACTION AVAILABLE**; this makes no claim that the real mixture is inert.

The beaker/flask/sealed chamber illustrations show liquids, particles, bubbles, solids and crystals only for appropriate input/outcome states. Motion and colours are schematic, not measured particle counts, natural reagent colours or chemical kinetics. Reduced-motion preferences keep illustrations still. Product molecules reuse validated reference coordinates in a zoomable/rotatable SVG inspection view; no WebGL is needed for Reaction Lab.

The balance reports approximate modeled material mass, including gas in the ledger. Liquid volume uses the declared additive approximation. Temperature is a bath/endpoint setting, never predicted reaction heat. Ideal pH is available only for the supported dilute strong-ion system at 25°C. No pressure is predicted. See [REACTION-SCIENCE.md](REACTION-SCIENCE.md) for equations, assumptions and primary sources.

## Journal and saves

**Save observation to journal** records the normalized preparation, outcome, equation, products, local timestamp and completion status. Search and supported/unmodeled filters are available. Repeating the same experiment/configuration does not duplicate entries. The journal holds 100 entries; up to eight named initial setups and versioned JSON export/import are available. Setup imports do not import products or award discoveries.

| Store | Scope |
|---|---|
| `elemental.progress.v1` | Existing Atomic Lab challenge progress; unchanged schema and key |
| `elemental.discovery.v1` | Shared identity availability, sources and first-seen date |
| `elemental.reaction.v1` | Independent inventory unlocks, preparation, journal, setups and reaction progress |

Migration infers only identities proven by the old sequential challenge IDs. It does not guess carbon or sodium isotope choices that were never stored. Automatic migration leaves unreadable/newer shared-library data untouched. All stores validate known IDs, schema versions, finite quantities and bounded arrays; malformed imports leave the current trial intact. Storage denial leaves models playable and reports that results are kept only in the current session. Export setups to retain a copy. Progress is browser-origin-bound and there is no cloud synchronization.

## Domain and limits

At most six reagent forms and 500mL combined modeled liquid/stock-carrier volume per trial. Stocks: liquid forms ≤200mL, solids ≤100mmol, aqueous solute/gas forms ≤10mmol. Chemistry is a curated **endpoint** model: no general kinetics, quantum chemistry, full carbonate equilibria, temperature-solubility curves, calorimetry or real measured yields. Quantitative results apply only to the documented reduced models. A wrong endpoint assumption would require revising the chemistry model and its reference tests; unsupported cases remain explicitly unpredicted.

Desktop click/drag, keyboard-native controls and touch alternatives work. Molecular product rotation supports dragging and arrow keys; zoom has buttons. Narrow screens stack panels, inventory panels collapse, and journal/setup controls remain accessible. Actual phones, Safari/Firefox and screen-reader usability have not been verified.

## Verification

```powershell
node --test games/elemental/tests/*.test.mjs
node games/elemental/tests/reaction-accuracy.mjs
node games/elemental/tests/v02-browser.cjs
node games/elemental/tests/v02-workflow.cjs
node games/elemental/tests/v02-interaction.cjs
```

The original Atomic browser suite remains `games/elemental/tests/browser.cjs`; run with `ELEMENTAL_URL` set to the preview URL and `FORGE_PLAYWRIGHT` set to the installed Playwright package. Browser tests use this workstation's Chrome path. No production file depends on those paths. See [V02-VERIFICATION.md](V02-VERIFICATION.md) for measured results and limits. The original v0.1 readme/verification are historical records of the preserved Atomic subsystem.
