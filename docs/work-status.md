# Work status

## Current task: first exploration prototype

The user confirmed the first prototype works in their browser. The next revision uses their supplied left-facing goblin and raises hop height from 3 to 6 drawing pixels; review of this revision is pending.

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

Ask the user to try play.html and describe anything that differs from their intended view or feel. In particular, check the hop and room/corridor proportions before adding more mechanics. Temporary map art is drawn in Canvas; no Proplet importer has been built.

Keep input, world rules and drawing separate. Read current main-branch files and compare changes before integrating this feature branch. Rebuild play.html when changing source. Do not start server setup or multiplayer tests as part of this milestone.

## Sprite revision

Original Goblin.png is preserved unchanged as assets/goblin.png. Art faces left and is mirrored for rightward movement, rendered at an integer scale with smoothing disabled. Its feet stay anchored to the same collision position. The standalone build embeds the PNG, so no extra download is needed. Hop cadence and movement speed are unchanged. No Proplet importer is implied.
