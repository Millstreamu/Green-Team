# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

Exploration with looping routes, searchable furniture, sack, guard patrol/chase/attacks and return-to-tunnel prototype implemented. Hosting, multiplayer and player limits remain undecided.

## Play

Download `play.html` and open it in a desktop browser. No installation, account or server is needed. Use WASD or arrow keys to move. Hold E while stationary beside a highlighted chest, cupboard or crate to search it. Release E or move away to cancel. Loot spills onto the floor only when the search completes; release E and press again to pack the highlighted nearby loot automatically; click loot to lift it, R rotates a held item, and clicking the sack places it. While holding an item, E or clicking the dungeon drops it nearby. Click a packed item to lift and rearrange it. Invalid placements keep the item in your hand. The sack slides off the lower-right edge while moving, leaving a tab. I or the tab opens/closes it. Highlighting loose loot briefly reveals it; pickup attempts reveal it too (including a full sack). It stays open while holding an item so placement remains available. Furniture highlights do not open it.

Return to the secret tunnel where you started (gold marker on the map) and press E to finish the run. At the tunnel, E means leave; while holding an item it still means drop. The haul screen lists only loot packed in your sack. **Start next run** generates a new dungeon and an empty sack.

**Abandon / new dungeon** discards an unfinished run after confirmation. The small map shows your position. This prototype shows the current haul only; no permanent stash or save system has been added.

The goblin uses your supplied 16×16 art; dungeon art is temporary. This version includes test loot, a 3×3 sack and one temporary guard, with no crafting or multiplayer.

## Searching

Valuables begin inside searchable furniture, not scattered around each room. Get close, hold E and watch the progress bar while guards continue patrolling. Moving, releasing E, getting hit, lifting another item or going down cancels the search and resets progress. A searched object opens/dims and cannot spill its contents again. A full sack does not block searching: items stay on the floor for packing later.

Initial times: crate 1.5 seconds, chest 2.5 seconds, cupboard 3.5 seconds. These are provisional balancing values in SEARCH in src/config.js. Furniture uses temporary drawings and does not yet add solid collision. This step adds time spent searching, not a furniture physics system.

## Dungeon routes

The generator adds up to three useful extra room connections, preferring routes that shorten a substantial detour and create another room entrance. It preserves two existing single-entrance rooms where available, so some dead ends remain. Rooms, controls and guard rules are otherwise retained.

Tune `extraConnections`, `preserveDeadEnds`, `minLoopDetour` and `maxLoopLength` in src/config.js. The sidebar shows how many extra routes were made. Setting extraConnections to zero disables the added routes without changing room placement for the same seed.

## Guard test

One guard patrols room centres using floor paths. Walls block sight. A question mark and filling bar give notice before a chase; breaking sight makes it search the last place it saw you before resuming patrol. The faint cone is a prototype sight aid.

The guard attacks at close range with a visible wind-up and red strike circle. Move away to make it miss. You have three health points with a short gap between damaging hits. Zero health puts you down. In this solo test there is no teammate left to recover you, so the run ends and bag/cursor loot is lost. Start next run restores health; getting close to a guard is not an instant failure.

Teammate recovery, its rules and returning after the team run are future multiplayer work. There is no player attack or trap system yet.

## Development

The prototype uses JavaScript and the browser's Canvas drawing surface, with no external packages. Edit `src/`, not the generated `play.html`.

- `npm test`: check dungeon connectivity and movement rules (Node.js required).
- `npm run build`: regenerate the standalone `play.html` after source changes.
- `src/config.js`: dungeon dimensions, room count, movement speed and hop values.
- `src/world.js`: base generation and collision rules; `src/dungeon-layout.js`: room entrances and useful bypass connections, independent of browser drawing.
- `src/input.js`: keyboard controls; `src/render.js`: temporary visuals; `src/main.js`: connects them.
- `src/sack-panel.js`: visibility/peek rules; the existing src/sack-view.js draws the same inventory and exposes the I/tab controls.
- `src/search.js`: searchable objects, contents, targeting and timed holds; `src/search-view.js`: object art and progress feedback; spilled items reuse existing loot rules/visuals.
- `src/run.js`: entrance proximity, escape and solo loss outcomes; `src/results-view.js`: shared haul/lost-loot display.
- `src/navigation.js`: floor pathfinding and following; `src/guard.js`: guard states, sight and health; `src/guard-view.js`: temporary guard art and feedback.
- `COMBAT` in `src/config.js`: provisional health, speeds, sight, notice/search duration, attack range and timing.

Proplet imports will be designed after inspecting real export examples. No import format is assumed here.

Start with [our working process](docs/working-process.md). Both Claude and Codex follow it through their repository instructions.

## Current direction

- Entirely playable in a web browser; aim for inexpensive server hosting.
- Import Proplet sprites, animations, tiles and accompanying JSON data.
- Grow a game-specific builder alongside the game to edit content and parameters.
- Reuse interface components and interaction patterns across inventory, crafting and upgrades.
- Plan the whole game lightly; specify and test one small playable version before expanding.

## Next step

The first playable milestone is agreed: one goblin exploring a generated top-down dungeon locally in a browser, using WASD and a hopping movement animation, with wall collision and dungeon regeneration. See [project decisions](docs/decisions.md) for scope and checks.

Next: review V8's sliding sack. The user approved V7 searching and requested less screen obstruction while moving. Drawer-state and existing search, layout, combat, inventory and event-wiring checks pass; rendered slide timing still needs browser playtesting. Server setup and multiplayer testing are deferred.
