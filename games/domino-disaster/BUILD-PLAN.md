# Domino Disaster build plan

Create a complete standalone toy-tabletop construction puzzle per BRIEF.md and API.md, on codex/domino-disaster based on published main5811571. Preserve unrelated modified/untracked files. No merge, push, integration or deployment in this build.

Inspection: nativegamefolders, sharedGAMES registration, Games/Featuredpixelcards+SVGfallback, relativeArcadereturn andvanillaESmodulesalreadyused. ExistingOrbitBreaker hasball/AABB collisions andEchoRunner platformercontact; neither suppliesrotatingrigidbody/SAT mechanics, so buildfocusedcustomphysics ratherthanforceanunsuitableengine. Buildcopyexcludestests; no dependencies needed. No existingDominoDisasterfolder orAGENTS found.

Visual direction: side-view miniaturewoodtable onnavy, turquoise/coral/gold/lavender/mint gadgets, softdecorativeshadows, strongtrue2D silhouettes. Canvasworldisprimary; compactDOMpalette/inspector/replaystrip andtouchfriendlyPUSH.

- [x] Physics and8gadgets: stable contacts/rotation, truthful signals, constraints, singleuse, deterministic stepping/CCD andactualfinish.
- [x] Twelveauthoredlevels with inventory/restrictions/validreferenceplacements, repeatedrealphysicswins and3starfeasibility.
- [x] Puretoyworkshoprenderer/camera/effects/geometry andpreparedvectorart.
- [x] Rooteditor exactundo/redo/placement/lock/link/inventory, Game fixedspeed/restart/failure/stars/sampledrecordreplay.
- [x] UI/input/audio/settings/progression/namedSandboxsave/load/JSONvalidation; desktop/touch/keyboard.
- [x] Browserall12solutions, fullprogression/stars, genuinefailedsetup/retry/edit, replay/speedindependence, largeSandbox/performance/memory.
- [x] Independentreviews, README/verification/performance/screenshots/pixelart+integrationpreparation andlocalcommit. No deploy.

Rulings: fixededitorobjects canstillbedynamicbodies; gameplayneverrecognizeshiddenreferencecoordinates. Explicitgearcoupling andspringsaddpredefinedenergybutfinishesstillrequireactualcontact. Replayrecords15Hzviewstatesupto60s(901frames) soUIcaninspectsampledframes; don'tclaimarbitraryphysicsrewind/resumefromscrub. Puzzlesstarsdependonusedinventory, notwatchingspeed. Boundary/speed/colliderlimits documentedandmeasured. Physics/contentinterfaces arebinding; cross-domain tuning coordinatedwithoutoverlappingwrites.
