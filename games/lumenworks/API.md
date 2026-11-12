# Shared implementation contract

All runtime files are vanilla ES modules. Pure simulation and structured data never import DOM/render modules. Root UI owns Game, storage, input, sound and integration. No live Arcade files are modified.

## Board and network.js

Board: `{id,title,width:12,height:10,nodes:[],edges:[],obstacles:[],constraints:{maxCables:12,cableCapacity:8,maxLength:10,allowedLinks?:[[from,to],...]},objectives:{required:[buildingIds],noOverload?:true,holdSeconds?:0},starBudget:8,hint,tutorial,solution:[actions]}`.

Node: `{id,type,x,y,name,district,style,capacity?,demand?,priority?,closed?,energy?,maxEnergy?,dischargeRate?,chargeRate?,mode?}`. Types: `generator,substation,switch,battery,building`. Building styles: `house,apartment,market,shop,tram,factory,public`. IDs are unique safe strings. All positions within board. Power is fictional PU; battery energy is EU, one PU supplies one EU per active simulation second. Mode `off|charge|support` is exclusive. Node capacity is a generator's output, a substation's throughput or a switch's throughput. Building demands are fixed positive numbers. A switch's `closed:false` interrupts flow.

Cable edge: `{id,from,to,capacity,enabled:true,damaged:false,removable:true}`. Directed! Start at a supply/router, end at a router/load. Buildings cannot output and generators cannot receive. Reject self/duplicate/disallowed links, restricted-area intersections, length/board cable limits. Existing damaged cables cannot transmit; removal allowed only when removable. Obstacles are world-axis rectangles `{x,y,w,h}`. Straight cable geometry is used for validation and drawing.

Exports:

- `validateNetwork(board)` -> `{ok,errors:string[]}`; strict bounds/types/capacities/IDs/references and no unsafe IDs. Empty sandbox is valid. At most48 nodes/96 edges for saved layouts. Validate data, do not mutate it.
- `connectionError(board,from,to)` -> string or null, using board constraints/current edges.
- `allocate(board,dt=0)` -> pure deterministic result below. `dt=0` previews instantaneous available battery supply without changing charge; positive dt caps supply by energy/dt and charging by room/dt.
- `advanceBatteries(board,dt)` -> allocate for positive bounded dt, apply finite battery energy deltas to the board, return that allocation. No other mutations. Rate units and energy accounting must be consistent.

Result: `{nodes:{[id]:{flow,capacity,demand,powered,constrained,chargePower?,dischargePower?}},edges:{[id]:{flow,capacity,enabled,damaged,constrained}},served:{[buildingId]:boolean},totalDemand,totalServed,totalSupply,generatorUsed,batteryUsed,chargePower,warnings:[{id,kind,message,requested?,capacity?}],batteryDelta:{[id]:signedEU}}`. Nonapplicable numeric values0. `totalSupply` means available source capacity; actual usage has separate fields. `flow` is actual usable flow, never illegally above capacity.

Capacity-constrained directed max-flow with split transit nodes, multiple paths and sources, and deterministic priority (ascending priority then ID) is the intended model. Buildings are all-or-nothing. For each candidate, residual augmentation may reroute earlier flows while preserving their full served loads; roll back partial attempts when the candidate cannot be supplied. Charging uses only unused generator capacity and residual forward throughput after serving buildings, never battery-to-battery energy. Cycles cannot multiply energy.

Overload rule: **hard limiting/load shedding**. Usable flow never exceeds a rating; excess building demand is withheld. Report constrained supply/cable/substation demand as warnings (an overload attempt), with clear actual-versus-rated values. Do not trip a feasible multipath layout merely because a naive unrestricted route would overload. No-overload objectives require zero warnings. Record any historical warning for the optional second star; resets clear it. This is a fictional allocation puzzle, not AC or field switching instruction.

## levels.js

Exports `LEVELS` (13 boards in brief order), `validateLevels()` -> `{ok,errors}`, `createSandbox()` -> editable board with no objectives and generous capacities, bounds12×10, cap48 nodes/96 edges. Initial sandbox generator/substation/house are unconnected; newly placed sandbox batteries start empty. Each level has a deterministic reference `solution` using real action shapes below. Include restrictions, obstacles and intentional red herrings so each puzzle is distinct. Every level must earn3 stars using its reference, with no warning during the solution; batteries supply finite deficits for a feasible hold period. Battery planning does not consume energy; time advances only when the player starts a stability check. Avoid real-world electrical procedures.

Action shapes for reference and Game: `{type:'cable',from,to}`, `{type:'remove-edge',id}`, `{type:'switch',id,closed}`, `{type:'battery',id,mode}`, `{type:'wait',seconds}`. Core level5 uses finite initial battery energy and holdSeconds8 (enough for a planning/correct-wiring solution). Other hold periods may be4–8 seconds; avoid grinding.

## renderer.js

Export `Renderer`. Constructor(canvas); fields `width,height,camera:{x,y,zoom}`, `metrics`. Methods `resize()`, `fit(board,viewport?)`, `screen(nodeOrPoint) -> {x,y}`, `world(screenX,screenY) -> {x,y}`, `hitNode(x,y,board) -> node|null`, `hitEdge(x,y,board) -> edge|null`, `pan(dxPixels,dyPixels)`, `zoomAt(factor,x,y)`, `draw(board,allocation,options={})`. Coordinates are canvas CSS pixels/client coordinates with full-viewport canvas. `viewport` optional `{left,top,right,bottom}` pixel insets. `options` fields: `time,selectedId,tool,drag:{fromId,point:{x,y},valid},quality:'high'|'low',reduced:boolean,celebration:number`.

Consistent pseudo-isometric projection, depth-sorted recognizable detailed city buildings, visible forward ports at node coordinate, miniature roads/lamps/tram. Cache static scene/terrain/roads, keep living details bounded; DPR<=1.5. Rendering is pure for board/allocation. Active edge pulse uses allocation actual flow only; disabled/damaged edges never glow as powered. Powered windows and streetlamps reflect served loads. Hardware ports have minimum22px hit radius independent of zoom; nearest wins. Fit must leave DOM HUD/top100, bottom90 and desktop right280px clear (root may pass insets); tiny viewports may pan/zoom. Provide concise labels on equipment and port demand/PU values; distinguish states by shape/pattern, not color only. Seed decoration from board ID without changing simulation.

Renderer implementer may prepare `assets/card-art.svg` and a static integration thumbnail; do not wire shared cards. No missing mockup is available: use written brief's navy/cyan/amber miniature city.

## Root-owned Game / UI contract

Root implements a Game class using these APIs, immutable deep snapshot undo of topology/modes, battery charge conservation, level objectives/hold/star recording, sandbox placement/removal and strict save/restore. Pure game state is testable without DOM. UI supports native mouse/touch cable drag plus keyboard-selectable node connection, inspection, switching/battery modes, undo/reset/pause/level select, sandbox tools and save/load. Menus are native DOM; main city is Canvas. Registration is prepared under integration/, not wired to live homepage.

## Expansion / hints

The original eight board definitions stay unchanged; districts9–13 append to the campaign. Progress derives its total from LEVELS.length and pads legacy version1 star arrays. nextHint(game) is pure, returns {kind,message,action?,from?,to?,nodeId?,edgeId?}; campaign suggestions validate real Game edits against current topology. Renderer options.hint uses exact port IDs for gold FROM/TO markers and a static directional preview. Asking never executes an action or changes history, charge, stars or topology.
