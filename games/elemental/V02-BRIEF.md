# CODEX BUILD — ELEMENTAL v0.2
## Atomic Discovery & Reaction Laboratory
### Forge Arcade — Complete Implementation

You are a senior chemistry simulation developer, educational game designer, frontend engineer, and scientific software architect.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target:** The existing ELEMENTAL game.

Your mission is to upgrade ELEMENTAL to version 0.2 by creating a fully functional **Reaction Lab** and connecting it to the existing **Atomic Lab** through a shared Discovery Library.

Implement, test, debug, and prepare the complete upgrade.

Do not deliver a static mockup or incomplete prototype.

## PRIMARY REQUIREMENT

**Keep Atomic Lab and Reaction Lab completely separate as interactive modes while allowing discoveries to be transferred between them.**

The Atomic Lab should remain fully functional and recognizable.

The Reaction Lab must have its own interface, state, chemistry engine, experiments, and progression.

The shared Discovery Library is the only bridge between the two laboratory systems.

---

# PHASE 1 — REPOSITORY INSPECTION

Before modifying anything:

1. Inspect the Forge Arcade repository.
2. Locate ELEMENTAL's actual directory.
3. Read all relevant source files.
4. Understand the existing atomic simulation.
5. Identify current element and molecule data.
6. Review existing save structures.
7. Understand the UI and navigation.
8. Review existing challenges and experiment features.
9. Identify reusable scientific data.
10. Run available tests.

Do not assume the existing implementation matches previous design proposals.

Preserve working functionality.

Create a separate development branch where supported.

Do not modify unrelated games.

---

# PHASE 2 — ELEMENTAL v0.2 STRUCTURE

## Main Menu

Introduce two clearly separated laboratory entrances:

### ATOMIC LAB

Subtitle:

"Discover the building blocks of matter."

This mode preserves the existing Atomic Lab functionality.

It supports element exploration, atom construction, and molecular discovery wherever those features exist.

### REACTION LAB

Subtitle:

"Combine substances. Discover chemistry."

This mode introduces a complete virtual chemistry laboratory.

Players can:

- Import discoveries.
- Choose chemical substances.
- Mix simulated materials.
- Observe supported reactions.
- Inspect reaction products.
- Study balanced equations.
- Record experiment results.

### DISCOVERY LIBRARY

Provide a shared catalogue accessible from either laboratory.

It stores scientific discoveries, but does not share active experiment states.

---

# PHASE 3 — SHARED DISCOVERY LIBRARY

## 1. Discovery Catalogue

Create a shared catalogue containing supported:

- Elements.
- Atoms.
- Isotopes.
- Ions.
- Molecules.
- Chemical compounds.
- Experiment products.

Each catalogue entry should contain appropriate metadata.

Suggested data structure:

```js
{
  id: "H2O",
  name: "Water",
  formula: "H2O",
  category: "molecule",
  elements: {
    H: 2,
    O: 1
  },
  discovered: true,
  source: "atomic-lab",
  reactionEligible: true
}
```

Treat this as an illustrative schema.

Use stable IDs separate from display labels.

Avoid duplicating chemical identity data across modules.

## 2. Atomic Lab Export

When a user discovers an element or constructs a validated molecule:

- Record its identity in the Discovery Library.
- Preserve its scientific metadata.
- Mark it as available for Reaction Lab import where appropriate.
- Avoid duplicate entries.
- Preserve existing Atomic Lab progress.

Do not automatically launch Reaction Lab.

Do not transfer live atom positions, animations, or temporary Atomic Lab simulation objects.

## 3. Reaction Lab Import

Add an option:

**IMPORT FROM ATOMIC LAB**

Display a searchable catalogue of discovered entries.

Allow filtering by:

- Element.
- Molecule.
- Ion.
- Compound.
- Reaction eligibility.

Selecting an entry should add it to the Reaction Lab's inventory or experiment preparation panel.

Importing must not modify or delete the original Atomic Lab discovery.

## 4. Chemical Form Conversion

An isolated atom is not always equivalent to a bulk chemical reagent.

Implement a scientifically grounded conversion layer between discoveries and experiment materials.

Examples:

- A hydrogen discovery may unlock hydrogen as an available element in the catalogue.
- Reaction Lab can represent appropriate molecular hydrogen where supported.
- An oxygen discovery can unlock the corresponding supported molecular substance.
- A water molecule discovery can unlock a virtual water sample.

Never assume that every isolated atomic species is stable or directly usable as a laboratory reagent.

When a conversion is unsupported, explain why.

## 5. Data Isolation

Maintain independent state for:

**Atomic Lab**
- Atomic configurations.
- Selected elements.
- Molecular structures.
- Existing challenges.
- Current animations.
- Experiment progress.

**Reaction Lab**
- Selected reagents.
- Material quantities.
- Reaction chamber.
- Conditions.
- Products.
- Experiment results.
- Reaction challenges.

The Discovery Library stores only shared scientific identities, discovery availability, and minimal cross-mode metadata.

One mode must not directly mutate the other's active state.

---

# PHASE 4 — REACTION LAB ENGINE

## 6. Chemistry Simulation Model

Implement a curated, rule-based chemistry system.

The engine should determine whether selected materials produce:

- A supported chemical reaction.
- Dissolution.
- Physical mixing.
- Phase change.
- Precipitation.
- Gas formation.
- No modeled reaction.

Do not fabricate products for unsupported combinations.

Return a clear explanation when the engine lacks a verified model.

## 7. Reaction Data

Use structured reaction definitions.

Each reaction should contain:

- Stable reaction ID.
- Reactants.
- Products.
- Balanced stoichiometric coefficients.
- Supported physical states.
- Simulation conditions.
- Educational explanation.
- Visual effect category.
- Relevant conservation checks.

Example conceptual structure:

```js
{
  id: "reaction-example",
  reactants: [],
  products: [],
  conditions: {},
  balanced: true,
  effect: "color-change",
  explanation: ""
}
```

Populate real reactions using verified chemical information.

Avoid representing an unverified or hypothetical reaction as established chemistry.

## 8. Conservation Rules

For chemical reactions:

- Conserve atoms of each element.
- Conserve electric charge.
- Calculate limiting reactants when quantities are modeled.
- Use stoichiometric coefficients consistently.
- Account for unreacted excess material.

Do not create or destroy atoms during ordinary chemical reactions.

For phase changes and dissolution, preserve chemical identity appropriately.

## 9. Thermodynamic Simplifications

Provide qualitative reaction feedback where supported.

Examples:

- Temperature increases.
- Temperature decreases.
- Gas evolves.
- Solid precipitate appears.
- Colour changes.

Do not invent exact temperatures, pressures, or reaction yields.

Only show quantitative predictions where the implemented scientific model supports them.

---

# PHASE 5 — THREE STATES OF MATTER

## 10. Liquids

Support virtual liquid samples with:

- Volume.
- Colour.
- Composition.
- Concentration where modeled.
- Temperature where applicable.

Render liquids with:

- Smooth surfaces.
- Translucency.
- Colour blending.
- Gentle pouring animations.

## 11. Solids

Support virtual solid materials.

Render:

- Powders.
- Crystals.
- Pellets.
- Granules.

Use suitable graphics for different materials.

Show dissolution or other supported changes when simulated.

## 12. Gases

Support gases inside a clearly virtual reaction vessel.

Render:

- Moving particles.
- Gas accumulation.
- Pressure indicators where a valid pressure model exists.
- Gas formation effects.

Do not imply that all gases can be safely mixed in physical laboratories.

Avoid detailed real-world procedures involving hazardous reagents.

---

# PHASE 6 — REACTION LAB WORKSPACE

## 13. Laboratory Interface

Create an attractive virtual chemistry workspace.

Include:

- Substance inventory.
- Discovery import panel.
- Reaction chamber.
- Virtual apparatus.
- Reaction controls.
- Observation panel.
- Product inspection panel.
- Experiment journal.

Maintain ELEMENTAL's existing visual identity.

## 14. Virtual Apparatus

Introduce:

- Beaker.
- Flask.
- Virtual sealed reaction chamber.
- Thermometer.
- pH indicator.
- Digital balance.
- Molecular viewer.

Each instrument should only display quantities actually supported by the underlying model.

## 15. Mixing Interaction

Allow users to:

1. Select supported substances.
2. Add them to the virtual experiment chamber.
3. Adjust supported quantities.
4. Begin the simulation.
5. Watch the resulting modeled process.
6. Inspect products or mixtures.
7. Save observations.

Use drag-and-drop where practical.

Provide accessible click-based alternatives.

## 16. Material Inventory

Display:

- Substance name.
- Formula.
- State.
- Available virtual quantity.
- Scientific category.

Allow the user to remove or replace selected reagents.

Do not create unlimited products through invalid reaction rules.

---

# PHASE 7 — DISCOVERY MECHANIC

## 17. Product Discovery

When a supported reaction produces a substance:

- Identify the product.
- Display its chemical formula.
- Show its molecular composition.
- Provide a simple explanation.
- Record the product in the experiment journal.

If scientifically appropriate, add the product identity to the shared Discovery Library.

## 18. Returning to Atomic Lab

A product discovered in Reaction Lab can become available for inspection in Atomic Lab if that mode supports the relevant molecular representation.

However:

- Do not automatically alter an existing atomic construction.
- Do not overwrite Atomic Lab progress.
- Do not assume all bulk compounds can be represented as one discrete molecule.
- For ionic or extended solids, use an appropriate formula-unit or structural explanation.

A newly discovered product should appear as an optional catalogue entry, not an active Atomic Lab experiment.

## 19. Discovery Flow

Example:

Atomic Lab discovers hydrogen and oxygen.

The shared library records those elements.

Reaction Lab imports appropriate supported reagent forms.

The player investigates a virtual reaction model.

The reaction engine identifies supported products.

Water becomes a recorded discovery.

Atomic Lab can later inspect the water molecule.

This is a shared discovery workflow, not a shared live simulation.

---

# PHASE 8 — GUIDED EXPERIMENTS

## 20. Educational Experiments

Implement an initial collection of safe, curated virtual experiments.

Suggested categories:

- Dissolving a solid in water.
- Comparing miscible and immiscible liquids.
- Observing gas formation in an educational model.
- Acid-base indicator colour changes.
- Precipitation demonstrations using safe educational abstractions.
- Crystallization.
- Temperature-dependent solubility.
- Physical versus chemical changes.

Use experimentally grounded descriptions.

For any chemistry that could involve hazardous real-world materials, keep it at an abstract educational level without practical preparation instructions.

## 21. Experiment Format

Every guided experiment must contain:

- Title.
- Learning objective.
- Selected reagents.
- Virtual equipment.
- Prediction question.
- Simulation action.
- Observations.
- Scientific explanation.
- Result summary.

Provide short tutorials.

Keep experiments interactive.

---

# PHASE 9 — FREE EXPERIMENT MODE

## 22. Open Mixing Sandbox

Allow users to combine supported substances freely.

Possible actions:

- Select reagents.
- Change virtual quantities.
- Mix.
- Observe.
- Reset.
- Save a configuration.
- Inspect reaction results.

The free sandbox must use the same verified reaction engine as guided experiments.

## 23. Unsupported Combinations

When a combination is not modeled:

Display:

**NO VERIFIED REACTION AVAILABLE**

Explain that the current simulation has no supported rule for this combination.

Do not automatically label unsupported combinations as chemically inert.

Do not invent arbitrary substances.

---

# PHASE 10 — MOLECULAR VISUALIZATION

## 24. Product Viewer

Provide a molecular inspection panel.

Where supported, display:

- Chemical formula.
- Element composition.
- Bond representation.
- Molecular geometry.
- Charge.
- Physical state.
- Scientific notes.

Reuse validated molecular data from Atomic Lab where practical.

## 25. Visual Accuracy

Use appropriate representations for:

- Discrete molecules.
- Ions.
- Formula units.
- Crystalline solids.
- Mixtures.

Do not force every chemical compound into a single-molecule diagram.

Clearly label simplified models.

---

# PHASE 11 — VISUAL EFFECTS

## 26. Reaction Animations

Implement visually satisfying effects for:

- Liquid mixing.
- Dissolving.
- Gas bubbles.
- Precipitation.
- Crystallization.
- Colour changes.
- Phase changes.

Animations must correspond to the modeled outcome.

Do not fake a reaction for a combination that the engine does not support.

## 27. Colour Palette

Preserve ELEMENTAL's overall scientific design language.

Use:

- Deep navy backgrounds.
- Cyan interface accents.
- Soft blue glassware.
- Vibrant reagent colours.
- Subtle laboratory lighting.

Prioritize clarity.

---

# PHASE 12 — EXPERIMENT JOURNAL

## 28. Journal Data

Record:

- Experiment ID.
- Reactants.
- Products.
- Observed process.
- Balanced equation, where applicable.
- Discovery date within local game data.
- Completion status.

Allow filtering and searching.

## 29. Progress

Track:

- Discovered substances.
- Completed guided experiments.
- Unique supported reactions observed.
- Reaction Lab achievements.

Do not erase Atomic Lab progress.

---

# PHASE 13 — SAVE SYSTEM

## 30. Persistence

Use versioned localStorage data or the repository's existing save architecture.

Maintain separate keys or separate namespaces for:

- Atomic Lab.
- Reaction Lab.
- Shared discoveries.

Implement migration if necessary.

Never blindly overwrite existing ELEMENTAL save records.

## 31. Data Validation

Validate:

- Chemical identities.
- Molecular formulas.
- Quantities.
- Reaction IDs.
- Experiment configurations.
- Imported discoveries.
- Save schema versions.

Reject malformed data safely.

Prevent duplicate or circular discovery writes.

---

# PHASE 14 — DESKTOP AND MOBILE

## 32. Desktop

Support:

- Mouse interaction.
- Drag-and-drop substances.
- Click-based controls.
- Search.
- Keyboard navigation.
- Zoomable molecular viewer.

## 33. Mobile

Support:

- Touch-friendly reagent selection.
- Responsive laboratory layout.
- Large mixing controls.
- Collapsible panels.
- Accessible experiment journal.
- Portrait and landscape layouts.

Avoid requiring precise drag gestures as the only interaction method.

---

# PHASE 15 — AUTOMATED TESTING

## 34. Discovery Library Tests

Verify:

1. Importing an Atomic Lab discovery.
2. Duplicate prevention.
3. Stable chemical IDs.
4. Shared catalogue updates.
5. Atomic Lab state isolation.
6. Reaction Lab state isolation.
7. Product discovery.
8. Reverse catalogue visibility.
9. Invalid import handling.
10. Save migration.

## 35. Chemistry Engine Tests

Verify:

1. Element conservation.
2. Charge conservation.
3. Reaction balancing.
4. Stoichiometric quantities.
5. Limiting reactants.
6. Excess reactants.
7. Dissolution.
8. Physical mixing.
9. Precipitation.
10. Gas formation.
11. Phase transitions.
12. Unsupported combinations.
13. Numerical stability.
14. Reaction determinism.

## 36. Interface Tests

Verify:

- Laboratory switching.
- Discovery import panel.
- Reagent selection.
- Mixing.
- Result display.
- Journal updates.
- Reset.
- Save and load.
- Desktop controls.
- Mobile touch.

## 37. Regression Testing

Run existing ELEMENTAL tests.

Confirm:

- Periodic table remains functional.
- Atom construction still works.
- Molecular building remains functional.
- Existing challenges remain available.
- Previously saved discoveries remain intact.

Do not claim tests passed unless executed.

---

# PHASE 16 — BROWSER QA

## 38. End-to-End Testing

Where browser automation is available:

1. Launch ELEMENTAL.
2. Enter Atomic Lab.
3. Discover or select a valid element.
4. Confirm its catalogue entry.
5. Return to the main menu.
6. Enter Reaction Lab.
7. Import the discovery.
8. Select appropriate supported reagent forms.
9. Run a virtual experiment.
10. Observe the modeled outcome.
11. Inspect its products.
12. Record the discovery.
13. Return to Atomic Lab.
14. Confirm optional access to the new product.
15. Verify both laboratory states remain independent.

Also test:

- Refreshing the page.
- Invalid selections.
- Unsupported combinations.
- Save migration.
- Mobile portrait.
- Mobile landscape.
- Browser resizing.

Inspect console errors.

Fix observed defects.

---

# PHASE 17 — FORGE ARCADE INTEGRATION

## 39. Preserve Existing Game

ELEMENTAL remains a single Forge Arcade game.

Do not create a second game card for Reaction Lab.

Do not register Reaction Lab as an independent game.

Instead, update ELEMENTAL's internal menu.

## 40. Suggested Game Metadata

**Title:** ELEMENTAL

**Subtitle:** Atomic & Reaction Laboratory

**Description:** Explore atoms, build molecules, and investigate virtual chemical reactions in connected scientific laboratories.

Preserve the existing game path unless necessary.

## 41. Integration Safety

Do not modify unrelated games.

Preserve:

- Forge Arcade homepage.
- Existing game cards.
- Filters.
- Navigation.
- Shared styles.
- Deployment configuration.

Use relative paths.

Avoid unnecessary dependencies.

---

# PHASE 18 — ACCEPTANCE CRITERIA

ELEMENTAL v0.2 is complete when:

- Atomic Lab remains fully functional.
- Reaction Lab exists as a separate mode.
- Both modes have independent interfaces.
- Both modes have independent experiment states.
- A shared Discovery Library connects them.
- Discovered elements can be imported.
- Valid molecules can be imported.
- Unsupported atomic species are handled correctly.
- Reagent forms are scientifically appropriate.
- Mixing liquids, solids, and gases is supported.
- Chemical reactions use validated rules.
- Conservation checks pass.
- Physical mixtures are distinguished from reactions.
- Products can be discovered.
- Products can appear in the shared catalogue.
- Reaction Lab includes guided experiments.
- Reaction Lab includes Free Experiment Mode.
- Experiment Journal works.
- Desktop and mobile controls work.
- Existing progress is preserved.
- Automated tests pass.
- No critical regressions remain.

---

# PHASE 19 — FINAL DELIVERABLES

Provide:

1. Updated ELEMENTAL v0.2 source code.
2. Preserved Atomic Lab.
3. New Reaction Lab.
4. Shared Discovery Library.
5. Scientific reagent conversion layer.
6. Curated chemical reaction engine.
7. Liquid, solid, and gas visualization.
8. Virtual laboratory apparatus.
9. Guided experiments.
10. Free Experiment Mode.
11. Molecular product viewer.
12. Experiment Journal.
13. Save-data migration.
14. Desktop and mobile support.
15. Automated tests.
16. Existing-feature regression results.
17. Browser QA results.
18. Scientific validation results.
19. Screenshots, if available.
20. Known limitations.
21. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep the upgrade on a separate development branch until explicitly approved.

---

# FINAL DIRECTION

ELEMENTAL v0.2 must become a connected chemistry learning environment.

Atomic Lab explores what substances are made of.

Reaction Lab explores how substances interact.

The Discovery Library connects the two.

The laboratories remain separate.

A discovery made in one laboratory can unlock new scientific exploration in the other without disturbing either laboratory's existing experiment.

**One game. Two laboratories. One shared scientific universe.**

Inspect first. Build completely. Validate chemistry. Test thoroughly.
