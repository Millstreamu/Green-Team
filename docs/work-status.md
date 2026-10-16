# Work status

## Current task: loot and sack prototype

The user confirmed the prototype works in their browser and approved the V2 revision using their supplied left-facing goblin and higher hop. This is user playtest feedback; automated browser verification was not performed.

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

The movement/art revision is accepted. The next chunk adds loot and the sack; ask the user to review the V3 download. Preserve the future note about multiple room entrances and looped escape routes; do not implement it yet. Guard patrols on generated maps still require implementation and testing. Temporary map art is drawn in Canvas; no Proplet importer has been built.

Keep input, world rules and drawing separate. Read current main-branch files and compare changes before integrating this feature branch. Rebuild play.html when changing source. Do not start server setup or multiplayer tests as part of this milestone.

## Sprite revision

Original Goblin.png is preserved unchanged as assets/goblin.png. Art faces left and is mirrored for rightward movement, rendered at an integer scale with smoothing disabled. Its feet stay anchored to the same collision position. The standalone build embeds the PNG, so no extra download is needed. Hop cadence and movement speed are unchanged. No Proplet importer is implied.

## V3 loot/sack handoff

Implements the agreed always-visible 3×3 sack, varied footprints, automatic E packing with rotations, cursor-oriented reachable target reticle, click/drag lifting, R rotation, placement previews and nearby drops. Items are shared definitions and drawItem visuals across floor, sack and cursor, rather than separate implementations.

New source: src/loot.js (pure packing, transfer, reach and target rules), src/item-view.js (shared item drawing), src/sack-view.js (bag/cursor UI). src/main.js wires events; src/render.js draws floor loot and the target; index.html adds the sack overlay. Original goblin image and hop are retained.

Validation: 12 tests passed including existing 200-seed dungeon checks, all item rotations, fragmented/full bags, automatic rotation into a free row, rejected placements, reach/wall targeting, repeated drop/repack item conservation across 100 maps, and a mock-DOM event-wiring smoke test for E pickup → click lift → R rotate → E drop → E pickup. npm run build and standalone module syntax checks passed. The mock-DOM test is not visual browser verification. New sack layout and mouse interactions still need real-browser/user review.

No server, extraction or persistent save added. New dungeon intentionally resets items and bag, with a confirmation explaining the reset. Original standalone filename remains play.html in Git; the user download is uniquely named green-team-sack-v3.html to avoid old-download confusion.
