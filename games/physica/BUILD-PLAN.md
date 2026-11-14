# PHYSICA implementation plan

**Goal:** Four scientifically validated Canvas2D laboratories,16 guided experiments,12 actual-state challenges, scientific measurements/graphs, free builders and persistence, prepared for Forge Arcade without deployment.

**Spec:** BRIEF.md; API.md binds module ownership/interfaces. Startfrom published mainae752852 on codex/physica. ELEMENTAL remains unchanged. Root shared gallery and all other games untouched. No framework/CDN/API/backend/runtimepackages.

Inspection: ELEMENTAL uses navy/cyan DOMsidebar/workspace/scientificnotes and discovery progress, explicit assumptions and localdata. PHYSICA follows that layout/terminology and relative native Arcade link, usingCanvas2D instead ofELEMENTAL's bundledThree.js. Existing registry is GAMES.push withvisible-only counts, nativegameURL, alignedpixelWebP+SVGfallback. ELEMENTAL ishiddenbehinditschemistryflask; PHYSICA integration isonlyprepared untilapproved. ExistingDomino rigidphysics ispixel/gameoriented, notvalidatedorbital/circuit/oscillatorSI math, so usefocusedindependentmodels.

Ruling: SI calculations separate from displaycamera; orbitalclock explicitlyscalessimulatedsecondsperrealsecond, whilefixedphysicaltimestep andspeedscheduling remainconsistent. DirectDCstaticMNA supportsvirtualidealcomponents andwarningrejectunsupportednetworks. Motionguidedpaircollisionsfrictionless1D, Free2Dapproximationsdocumented. Wavefixed-endstandingmode drivenmodalODE andnonlinearpendulum, measuredperiods fromactualcrossings. Allchallengeconditionsallowvalidalternatives, actualstateonly. No arbitraryconfigbuttonwin. Sandbox limits12bodies/8oscillators/12nodes+24components. Presets scientificallytestable ratherthanunboundedcomplexity.

- [x] Gravitymodel/4guidedpresets, validation/energy/symmetry/mergers/orbitalreferences, per-taskreview.
- [x] Motionmodel/4guidedpresets, projection/friction/projectile/collision/free, numericalvalidationandreview.
- [x] ElectricityMNA/builderdata/4presets, idealmeters/Kirchhoff/invalidstates, numericalvalidationandreview.
- [x] Wavesmodel/4presets/nonlinearperiods/damping/standingdrive/freecomparisons andvalidation/review.
- [x] Rootengine/histories/units/storage,16experimentcontent+12referencechallenges,warningsandscientificexplanations.
- [x] Dashboard/animatedpreviews/sharedLabviewport, realmeasurement+graphs, parameter/body/nodeeditor, formula+theory, tutorial/save/desktop/touch/keyboard.
- [x] All16and12 full browserflows, numericaccuracyreport, savecompatibility/errors, frameindependence, cappedperformance/memory, screenshots6viewports.
- [x] Freshwholebranchreview/fixloop,README/SCIENCE/QA/limits,integrationpixelart+preparedpatch, localcommitonly. Do notmerge/push/publish.

Primary model sources consulted15Nov2026: LAMMPS velocityVerlet documentation https://docs.lammps.org/stable/Developer_flow.html ; OpenStax UniversityPhysics pendulum https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums ; DPsimMNA https://dpsim.fein-aachen.org/docs/concepts/nodal-analysis/ . Reference scientific equations/paraphrases only; source pages are not runtime dependencies. Additional per-lab references/accuracy findings goin ownmodeldocs/SCIENCE.md.

Final evidence: 68 numerical/session/storage tests passed; complete 16/12 browser run, advanced touch/circuit/freeze suite and all four tutorial/audio checks passed. Independent model and final scoped review approved. Accuracy, performance, known limits, screenshots and prepared gallery patch documented. No deployment or active gallery edits.

15 November 2026 follow-up: user approved integration as a hidden symbol like ELEMENTAL. This supersedes the earlier prepared visible-card proposal and publication hold. Implemented hidden atom access, preserved 39 visible cards, removed obsolete visible-card patch, and verified both laboratory links on desktop/mobile.
