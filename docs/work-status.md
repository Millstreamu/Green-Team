# Work status

## Current task: looping dungeon routes with retained dead ends

The user approved movement/art in V2 and the sack in V3. They agreed to return to the entrance via a secret tunnel and see the haul before starting the next run. V4 implements that loop. The user then clarified guard pressure and the downed-player rule; The user reported V5 works pretty well and approved looping dungeon routes next. V6 now awaits route playtesting.

Intended behaviour: a top-down goblin moves freely through a generated, connected dungeon with WASD, a visual hop, solid walls, and a new-dungeon button. Works locally without server setup.

Files: index.html for the interface; src/config.js for editable values; src/world.js for generation and movement; src/input.js for controls; src/render.js for pixel art and minimap; src/main.js for the loop; scripts/build.mjs for standalone play.html; tests/world.test.js for rules checks.

Implementation choice: dependency-free JavaScript and Canvas for this narrow prototype. It keeps the first version easy to open and inspect. This is an implementation choice to evaluate, not a user-mandated permanent engine choice. No multiplayer infrastructure or general-purpose engine has been built.

## Verification

- `npm test`: four tests passed, including 200 seeds checked for connectivity, valid spawn and closed boundaries.
- Same seeds reproduce layouts; different seeds vary.
- Diagonal movement is normalised, frame rates agree, long steps do not cross walls, and idle stops the hop.
- `npm run build`: generated play.html successfully.
- No browser automation was available in this environment. Visual layout, keyboard interaction in a real browser and animation feel still need verification. Automated movement checks do not replace that review.

## Next handoff

Movement/art, sack and the first guard loop have positive user feedback. Ask the user to try V6's looped routes around guards. V6 implements the extra entrances and loops while preserving dead ends. The map view without player/tunnel markers remains deferred. Temporary map art is drawn in Canvas; no Proplet importer has been built.

Keep input, world rules and drawing separate. Read current main-branch files and compare changes before integrating this feature branch. Rebuild play.html when changing source. Do not start server setup or multiplayer tests as part of this milestone.

## Sprite revision

Original Goblin.png is preserved unchanged as assets/goblin.png. Art faces left and is mirrored for rightward movement, rendered at an integer scale with smoothing disabled. Its feet stay anchored to the same collision position. The standalone build embeds the PNG, so no extra download is needed. Hop cadence and movement speed are unchanged. No Proplet importer is implied.

## V3 loot/sack handoff

Implements the agreed always-visible 3×3 sack, varied footprints, automatic E packing with rotations, cursor-oriented reachable target reticle, click/drag lifting, R rotation, placement previews and nearby drops. Items are shared definitions and drawItem visuals across floor, sack and cursor, rather than separate implementations.

New source: src/loot.js (pure packing, transfer, reach and target rules), src/item-view.js (shared item drawing), src/sack-view.js (bag/cursor UI). src/main.js wires events; src/render.js draws floor loot and the target; index.html adds the sack overlay. Original goblin image and hop are retained.

Validation: 12 tests passed including existing 200-seed dungeon checks, all item rotations, fragmented/full bags, automatic rotation into a free row, rejected placements, reach/wall targeting, repeated drop/repack item conservation across 100 maps, and a mock-DOM event-wiring smoke test for E pickup → click lift → R rotate → E drop → E pickup. npm run build and standalone module syntax checks passed. The mock-DOM test is not visual browser verification. New sack layout and mouse interactions still need real-browser/user review.

No server, extraction or persistent save added. New dungeon intentionally resets items and bag, with a confirmation explaining the reset. Original standalone filename remains play.html in Git; the user download is uniquely named green-team-sack-v3.html to avoid old-download confusion.

## V4 secret tunnel handoff

Adds src/run.js for run lifecycle, entrance proximity and packed-item haul snapshots, plus src/results-view.js using the existing shared drawItem function. The entrance is at world.spawn, marked on the floor and in gold on the map. E leaves when inside 0.7 tiles, with a clear prompt; while holding an item, E drops first as before. Floor clicks can still lift nearby loot at the tunnel. Results pause gameplay and disallow sack edits; Start next run clears controls, closes the modal and creates fresh dungeon/loot/run state.

Validation: all 16 tests pass. New checks cover proximity and walls, packed-only snapshots, one-time completion, cursor-item blocking, empty returns and independent next-run state. The interaction smoke test covers movement out of the tunnel, pickup/repacking, return and extraction, ignored actions on results, and the next-run button. Build and standalone module syntax checks pass. No visual browser automation was available, so rendered tunnel/results feedback still needs user review.

Download is green-team-tunnel-v4.html; canonical generated file in Git remains play.html. No persistent rewards, save system, lair, guards, hosting or multiplayer were added.

## V5 guard handoff

Adds src/navigation.js (cardinal floor paths and collision-safe following), src/guard.js (patrol/suspicion/chase/search, last-seen targeting, telegraphed strikes, health/invulnerability/downed state), and src/guard-view.js (temporary guard art, wall-clipped sight aid and attack indicator). COMBAT values in src/config.js are tuning choices. Guard patrol begins in a nearby different room and includes the starting room, so it can be encountered without exploring the whole dungeon.

The goblin has three health, can dodge out of attack range during the wind-up, and can outrun the guard on clear ground. Losing sight makes the guard navigate to the last seen location and search; it does not track an invisible player. No body blocking or player combat added.

run.js adds a solo loss outcome, shared through results-view.js with the successful-haul UI. Downed players cannot extract. Solo loss clears bag and cursor items, lists them as lost and freezes gameplay; next run resets vitality. Future multiplayer must separate a single player's downed/recoverable state from the team's run outcome. Teammate recovery is only a design possibility so far, not implemented.

Validation: 26 tests pass. Added all-patrol-goal traversal/collision checks across 100 generated maps and actual guard patrol updates across ten maps, sight facing/range/walls, delayed detection, chase/search return, dodgeable wind-up, health/recovery spacing, no hits through walls, and one-time solo loot loss. The mock-DOM smoke now waits for the real guard to arrive and down a cursor-item-holding goblin, checks lost-loot results and full health next run, while retaining success/packing checks. Standalone build and module syntax checks pass. No rendered browser QA was available; actual visuals, control feel and balance await user playtest.

User download: green-team-guards-v5.html. Git canonical generated file remains play.html. Deferred map view without player/tunnel markers and future looping room entrances are preserved; neither was implemented. No persistent stash, lair, traps, hosting or multiplayer added.

## V6 layout handoff

Adds src/dungeon-layout.js as a post-process of the existing connected generator. It searches nearby room pairs whose current walking route has a substantial detour, evaluates two corridor orientations, requires new room-entrance gain, rejects routes touching protected leaf-room perimeters, and carves the best useful shortcut. Room placement and seed determinism are retained; no render/input/guard algorithm rewrite. CONFIG adds extraConnections=3, preserveDeadEnds=2, minLoopDetour=8 and maxLoopLength=40. These are prototype tuning values. If no useful candidate exists, stop rather than force one.

Validation: 28 tests pass. Across seeds 0–199 the defaults produced three shortcuts and preserved two single-entrance rooms on every map. Each recorded shortcut shortened its previous route by at least eight tiles; an independent test blocks a multi-entrance room and verifies its outside entrances still connect around it. This proves a physical bypass, not just added room graph metadata. Existing 200-seed connectivity and spawn checks, 100-map guard path/collision checks, ten actual guard patrol simulations, combat, loot and full event-wiring checks pass on the new layouts. Zero/one-loop configuration and unchanged room placement also pass. Standalone build/module syntax pass. Browser visuals and escape-route feel still need user playtest.

Download: green-team-loops-v6.html. Canonical generated file remains play.html. The current diagnostic map remains as before; the future openable map without player/tunnel markers is not implemented. No additional mechanics, server or multiplayer changes.
