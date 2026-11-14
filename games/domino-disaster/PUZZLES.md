# Puzzle authoring and verification

The twelve boards are in `levels.js`, in the brief's prescribed order. Each has a limited inventory, fixed supports, a physical finish, a short tutorial, a hint, star budgets, and reference actions performed through the normal Editor. Reference coordinates are examples, not an engine success condition. Simulation never reads solution actions.

| Puzzle | Construction task | Physical/mechanical route |
|---|---|---|
| First Fall | Bridge the domino break | Falling domino contacts transfer through the line to the flag. |
| The Gap | Place a marble between the sections | The starting domino transfers momentum to the marble and onward to the final dominoes. |
| Rolling Start | Place and rotate a ramp | A gravity-driven marble rolls into a floor-level domino cascade. |
| Spring Fever | Load a spring | The starting domino trips the spring, which launches its forward marble over a real gap between platforms. |
| Tipping Point | Catch the seesaw runoff | A falling marble loads the left side of a free pivot; a ramp guides the moving marble through the finish. Seesaw movement is required. |
| Gear Up | Connect the missing gear output | The input gear turns the output gear, which releases a loaded spring. The output gear and spring are required. |
| Double Trouble | Connect the second branch | One input powers two physically separate marble lanes. Both switches and the lower finish must be contacted. |
| The Long Way Round | Build above the forbidden zone | A descending sequence of ramps carries the marble above a striped placement obstacle into the lower dominoes. |
| Marble Mayhem | Catch the first marble and load a second spring | The first spring sends a marble off its ledge into a catch ramp. Its floor switch releases the second spring. Removing the catch ramp breaks the reference chain. |
| The Clockwork Room | Connect the switch to its gear | Seesaw motion carries a marble into a switch, then a gear releases the final loaded spring. Seesaw, switch, gear and spring are required. |
| Cascade City | Repair the rooftop chain | A long rooftop cascade reaches a switch; its spring sends a marble into a separate street-level domino cascade. |
| Total Domino Disaster | Complete the relay and lower domino section | Marble weight rocks the seesaw, ramp runoff reaches the switch, two opposed gears release a spring, and its marble drives the final domino cascade. All major gadget types participate. |

## Executed checks

`node --test games/domino-disaster/tests/levels.test.mjs games/domino-disaster/tests/editor.test.mjs` passed all 24 tests on 14 November 2026.

The content tests verify all twelve reference solutions twice with identical final snapshots, valid initial collision geometry, all required objectives, inventory limits, and three stars through the real Game class. Every incomplete starting board stops without winning. Every reference that places gadgets also wins with all placed x coordinates shifted by +3 pixels through the same Editor, demonstrating alternatives to exact reference coordinates. Gear-only connection puzzles have no placement coordinates to perturb. The catch ramp in Marble Mayhem has an explicit removal regression test.

Sandbox provides four editable starter dominoes, all eight gadget inventories, a 120-object total cap, independent fresh data, and a sixty-second experiment limit. Empty objective requirements permit free construction without puzzle progression stars.

These are deterministic engine tests. They do not establish physical-device touch performance or compatibility with every browser.
