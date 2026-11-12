# Five more districts and guided connections

Extend the existing campaign from eight to thirteen authored districts. Keep original levels and saved stars intact; completing the old eight unlocks district nine after upgrade. Derive progression/UI totals from the campaign length. Leave the Arcade launcher and deployment untouched.

Hint design: a real button provides one actionable next step, naming both source and destination. Highlight both ports and a dashed preview route, prefill the keyboard connector, and focus the camera on the pair if needed. Repeated presses keep the same unperformed step rather than skipping ahead. A hint never edits the board, consumes energy, changes stars or auto-connects anything. Re-evaluate after edits/undo/reset; handle wrong cables/modes, depleted reserve, and a complete layout with an explicit repair/control/stability instruction. Sandbox hints offer a valid useful connection where possible and explain when a component is needed.

Ruling: follow an authored reference for campaign guidance, with safe repairs for deviations — exact successful links are clearer than a speculative solver that can recommend overloads. Preserve valid player alternatives when they already satisfy the objective. Hints can suggest removing a non-reference cable only when it blocks a usable reference route; tell the player explicitly.

Independent work domains: level author owns only levels.js, its tests and level-design notes. Root owns pure hint logic/tests, UI/renderer highlights, storage migration and browser verification. No overlapping writes. Read-only review follows integration.

- [x] Five authored districts and verified three-star references.
- [x] Length-based progression, legacy saves and all UI totals.
- [x] State-aware hints, visible named ports/routes and keyboard alternative.
- [x] Unit/browser tests for all13 districts, desktop/mobile hint behavior, legacy progress.
- [x] Review, documentation and local commit; no deployment.

Final evidence:250 combined tests pass,13 UI three-star solutions, hint browser checks1440/390/320, preserved legacy saves and no runtime failures. Independent review found no actionable findings and exercised195 edited states. Screenshots inspected; hint requests now dismiss transient toasts and repeated presses frame the pair consistently. No publication.
