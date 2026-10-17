# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

A playable local loop now includes a small lair, stash, crafting, dungeon runs, searchable furniture, a sack, guards and return-to-tunnel escapes. Hosting, multiplayer and player limits remain undecided.

## Play

Download `play.html` and open it in a desktop browser. Start in the lair. Walk with WASD; E at the stash or workbench opens it, and E at the northern tunnel prepares a run. Choose 0–9 snares from your stash, then Start run; the free debug trap option remains available. Every trap occupies its own square; traps never stack. No installation, account or server is needed. Use WASD or arrow keys to move. Hold E while stationary beside a highlighted chest, cupboard or crate to search it. Release E or move away to cancel. Loot spills onto the floor only when the search completes; release E and press again to pack the highlighted nearby loot automatically; click loot to lift it, R rotates a held item, and clicking the sack places it. While holding an item, E or clicking the dungeon drops it nearby. Click a packed item to lift and rearrange it. Invalid placements keep the item in your hand. The sack slides off the lower-right edge while moving, leaving a tab. Tab or the edge tab opens/closes it. When opened manually, WASD selects sack squares instead of moving the goblin; Tab closes it again. Automatic loot peeks do not take over movement. Highlighting loose loot briefly reveals it; pickup attempts reveal it too (including a full sack). It stays open while holding an item so placement remains available, unless explicitly closed with Tab. Furniture highlights do not open it.

Return to the secret tunnel where you started (gold marker on the map) and press E to finish the run. At the tunnel, E means leave; while holding an item it still means drop. The haul screen lists only loot packed in your sack. Escaping stores that loot and unused real traps in your lair automatically. **Return to lair** takes you home; use the tunnel to prepare the next run.

**Return to lair** during a run abandons carried loot/traps after confirmation; stock already at home is safe. The small map shows your position. Lair stock carries between runs and saves locally in this browser when browser storage is available. The footer reports whether saving works. Active dungeon runs are not saved; reloading returns home with the supplies already spent when that run started.

The goblin uses your supplied 16×16 art; dungeon art is temporary. This version includes test loot, a 3×3 sack and two lookouts, one room patrol and one local roaming guard, with basic snare crafting and no multiplayer.

## Searching

Valuables begin inside searchable furniture, not scattered around each room. Get close and hold E. Searches can be empty, with a clear “Nothing worth taking” message. A tiny pixel loading bar fills directly above the object while guards continue patrolling; it disappears on cancellation or completion. There is no separate search progress panel. Moving, releasing E, getting hit, lifting another item or going down cancels the search and resets progress. A searched object opens/dims and cannot spill its contents again. A full sack does not block searching: items stay on the floor for packing later.

Initial times: crate 1.5 seconds, chest 2.5 seconds, cupboard 3.5 seconds. These are provisional balancing values in SEARCH in src/config.js. Furniture uses temporary drawings and does not yet add solid collision. This step adds time spent searching, not a furniture physics system.

## Dungeon routes

The generator adds up to three useful extra room connections, preferring routes that shorten a substantial detour and create another room entrance. It preserves two existing single-entrance rooms where available, so some dead ends remain. Rooms, controls and guard rules are otherwise retained.

Tune `extraConnections`, `preserveDeadEnds`, `minLoopDetour` and `maxLoopLength` in src/config.js. The sidebar shows how many extra routes were made. Setting extraConnections to zero disables the added routes without changing room placement for the same seed.

## Guard test

Two blue lookouts stay at fixed posts, alternating between two directions with regular pauses. One brown room guard walks between two points within its assigned room, pausing at each end. One purple roaming guard repeats a route through two or three connected rooms, pausing for three seconds at its stops before retracing the same corridors. Several rooms have no normal guard route; the entrance room is excluded from all normal routines. Chases may still reach it. Watch the local routine before moving into an unfamiliar room.

Walls block sight. A question mark and filling bar give notice before a chase. Guards may pursue into otherwise quiet rooms; breaking sight starts a brief invisible trail of the goblin's next movements. The guard follows it at a slower search pace, including around corners into rooms, then looks around at the end before returning to its post/route. Hidden movements stop adding clues after 2.5 seconds. Actual sight resumes the chase; another later sight break starts a new brief trail. Quiet rooms are not magical safe zones. The faint cone and small labels are prototype observation aids.

The guard briefly pauses, commits to a direction and swings through a red arc. Dodge out of reach or around the committed direction. Successful hits push the goblin back slightly; guards resume chasing after the quick swing. You have three health points with a short gap between damaging hits. Zero health puts you down. In this solo test there is no teammate left to recover you, so the run ends and bag/cursor loot is lost. Start next run restores health; getting close to a guard is not an instant failure.

Teammate recovery, its rules and returning after the team run are future multiplayer work. There is no player attack; single-use snares are available for testing.

## Development

The prototype uses JavaScript and the browser's Canvas drawing surface, with no external packages. Edit `src/`, not the generated `play.html`.

- `npm test`: check dungeon connectivity and movement rules (Node.js required).
- `npm run build`: regenerate the standalone `play.html` after source changes.
- `src/config.js`: dungeon dimensions, room count, movement speed and hop values.
- `src/world.js`: base generation and collision rules; `src/dungeon-layout.js`: room entrances and useful bypass connections, independent of browser drawing.
- `src/input.js`: keyboard controls; `src/render.js`: temporary visuals; `src/main.js`: connects them.
- `src/sack-panel.js`: visibility/peek rules; the existing src/sack-view.js draws the same inventory and exposes the Tab/edge-tab controls.
- `src/search.js`: searchable objects, contents, targeting and timed holds; `src/search-view.js`: object art and progress feedback; spilled items reuse existing loot rules/visuals.
- `src/run.js`: entrance proximity, escape and solo loss outcomes; `src/results-view.js`: shared haul/lost-loot display.
- `src/navigation.js`: floor pathfinding and following; `src/guard.js`: guard states, sight and health; `src/guard-view.js`: temporary guard art and feedback.
- `COMBAT` in `src/config.js`: provisional health, speeds (including slower search), 2.5-second trail window, trail spacing, sight, notice/search duration, attack range and timing.
- `GUARD_PATTERNS` in `src/config.js`: the three existing local guards, optional one-roamer switch, route room/length limits, regular pauses and turn speed.

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

Next: try V15’s complete lair loop: craft a snare, prepare a run at the tunnel, search for materials, escape and inspect the stash. Decorations, upgrades, building tables and multiplayer remain later work.


## V12: single-use snare

The pre-run setup chooses how many snares enter the sack, one square each. Tab opens the same sack; choose the snare with WASD/arrows or click it, then press E to equip. The sack hides and a nearby floor preview appears. Move the floor preview with WASD/arrows (mouse aiming also works), release E after equipping, then hold E for one second to place. The goblin stays still while aiming; moving the preview resets placement progress. The preview turns red on blocked positions. Escape cancels without losing the item; Tab cancels and opens the sack. No direction or rotation is needed.

A placed snare waits until its setter is fully clear, then arms after 0.25 seconds. Any goblin crossing an armed snare spends it harmlessly; a guard crossing it is held for three seconds and cannot attack during the hold. This is a test supply, not crafting or a permanent loadout system. Unused snares do not count as stolen treasure. Tune values in `TRAPS` in src/config.js.

V12 verification: 53 automated tests, standalone build and bundled JavaScript syntax check. Rendered browser appearance/feel awaits user playtest. Download/build `play.html`; the distinct review copy is `green-team-snares-v12.html`.


## V13: pre-run trap debug setup

A small dialog reuses the existing result-panel/button style before the initial run and every subsequent run. Select a trap by choosing its quantity (0 excludes it); currently only snare exists. The counter shows used/free sack squares. Start run packs that many individual items with unique IDs using the existing inventory fit rules. Quantities must be whole numbers from 0–9; invalid values prevent starting. The dungeon/guards stay paused during setup. Last quantity persists for retesting within this open game, without a save system.

`src/loadout.js` validates and packs supplies; `src/loadout-view.js` connects the simple screen. The old automatic one-snare grant is replaced. Existing equip/place controls and safe arming rules remain. Verified: 55 tests, standalone build and bundled syntax check. Browser visual review pending. Review copy: `green-team-trap-setup-v13.html`.


## V14: keyboard sack and trap aiming

Tab replaces I. Open the sack manually to give WASD/arrows to the highlighted square; Tab closes it. E equips the selected snare. The preview starts nearby without consulting an old mouse position. WASD/arrows move that preview within reach while the goblin stays still. Release E after equipping, then hold E for one second with the preview stationary. Escape cancels; Tab cancels and reopens the sack. Actual mouse movement can still aim the preview; keyboard input takes over again immediately. Guards continue acting during both sack selection and aiming.

Automatic sack peeks for nearby loot remain passive, so they never stop walking. Tab turns a passive peek into manual sack navigation. Explicit closing also works while holding loot; automatic pinning otherwise remains. Normal browser Tab navigation is preserved in the setup and results dialogs. This does not add keyboard rearranging for ordinary loot.

Verified: 56 automated tests, standalone build and bundled syntax check. Browser appearance/feel await user review. Download `green-team-keyboard-traps-v14.html`.


## V15: the first little lair

A walkable safe room uses the same world/movement/goblin renderer. The stash is on the left, workbench on the right, dungeon tunnel at the north. E opens nearby stations. Tab opens/closes the lair stash; Escape closes station screens. Crafting uses the existing buttons (Enter/Space to activate the focused button). Stash, workbench and run results share one item-list renderer and existing drawItem sprites and panel styles.

Provisional recipe: **2 metal scrap + 1 cloth → 1 snare**. Scrap/cloth are one-square carried loot, found through the existing furniture search. From V16, no container guarantees materials; search multiple objects and bring home what you find. Fresh lairs start with one snare, two scrap and one cloth; this is test stock, not a final progression/balance choice. Real traps are taken from home stock when starting, and unused ones return on escape. Deployed traps, drops left in the dungeon and downed/abandoned run contents are lost. Valuables stay stored; no selling or upgrade system exists yet.

The preparation screen retains the free-trap debug toggle. Debug traps fill separate sack cells but never use or increase real home stock. Lair save version 1 stores item counts locally; no server/shared online state, account save or active-run recovery is implemented. If storage is blocked, the same loop works while the page stays open.

Source: lair.js for economy/save/world/station rules; lair-view.js for stash/workbench; lair-drawing.js for temporary room props; item-list.js shared by lair and results. Verified: 62 automated tests, standalone build and bundled syntax check. No rendered browser test; user playtest pending. Download `green-team-lair-v15.html`.


## V16: sparse search rewards

User requested less loot, occasional materials, and searches that sometimes find nothing. Initial tuning: 60% chance a container is empty. Of nonempty containers, 85% have one item and 15% have two. Each found item has a 45% chance to be scrap/cloth; otherwise it comes from the container's existing valuables pool. These probabilities are provisional values in SEARCH_LOOT in src/config.js. Rewards are determined once per generated map, so cancelling/restarting searches does not reroll them.

The entrance chest no longer guarantees ruby/coin and the entrance crate no longer guarantees a full snare recipe. Empty searches still take their normal time, finish/dim the container and cannot be repeated. They say “Nothing worth taking. Try the next one.” Starter supplies in a new lair are retained. No crafting or guard timing changes.

Verified: 64 automated tests, including sparse reward distribution across 200 maps, completed empty searches, repeat prevention and an actual empty-search event flow. Standalone build and bundled syntax check pass; browser feel still needs review. Download green-team-sparse-loot-v16.html.


## V17: local roaming guard

Adds one purple guard while retaining the two blue lookouts and brown single-room patrol. A deterministic route builder chooses two or three connected rooms and caches the actual corridor path, then retraces it in a repeating out-and-back routine. Stops pause for three seconds and face the next leg. Routine movement uses the existing collision/path-following code and normal patrol speed. The entrance room is excluded, and most rooms remain outside normal routes. Small/unusual layouts skip the extra guard if no safe local route exists.

The same sight, suspicion, chase, attack, invisible trail, return-home and snare rules apply. After an unsuccessful search, it returns home and restarts its routine. A chase/return may pass outside normal patrol territory; unpatrolled rooms are not invulnerable zones. `guard-routes.js` builds routes; `guard.js` uses them within the existing patrol state. No extra loot, alarm, UI or multiplayer system added.

Tune `roamerEnabled`, `roamRooms` (3), `roamMaxLength` (55 outbound path points) and `roamPause` (3 seconds) in GUARD_PATTERNS. Those are provisional balance settings. Verified: 68 tests, including 200 generated routes, actual repeated movement/pauses, snare interruption, investigation/return and blocked-layout fallback. Standalone build and bundled syntax pass; rendered browser difficulty/feel await playtest. Download green-team-roaming-guard-v17.html.


## V18: rewards improve farther along the route

User requested better loot farther from the entrance, with more trap materials nearby. Search reward depth uses the shortest walkable path from the entrance to each container, scaled against the farthest container in that generated map. Long corridor detours count; straight-line distance does not. Existing pathfinding supplies those distances once at map creation.

Provisional probabilities blend smoothly: near/far empty chance 70%/50%; near/far material share of found items 75%/20%; near/far rare share among valuables 10%/80%. Nonempty containers still usually have one item, with a 15% chance of two. Common pools favour coins, scrolls or horns depending on furniture; rare pools favour rubies/candlesticks in chests, candlesticks/horns in cupboards and swords/horns in crates. “Better” currently means rarer valuables and more successful finds; selling/prices are not implemented. All areas can still be empty, and materials can still appear far away. No guaranteed entrance rewards.

Values live in SEARCH_LOOT in config.js; each container stores distance/depth metadata for future tuning. Rewards stay fixed for a given seed and cannot be rerolled by cancelling. No guard, crafting, stash or control changes.

Verified: 70 automated tests, including a winding-corridor case and near/far material/rarity/empty comparisons over 300 maps. Existing sparse-loot checks and gameplay loop pass. Standalone build and bundled syntax pass; browser balance review pending. Download green-team-deeper-loot-v18.html.


## V19: faster directional swings and knockback

User requested a quicker pause → directional swing → chase, plus a little player knockback, with later parameter editing. COMBAT now holds the trigger range (0.95 tiles), strike reach (1.2), half arc (60 degrees), windup (0.18 seconds), visible swing (0.14), attack cooldown (0.45), knockback distance (0.55 tiles) and push duration (0.1 seconds). These are provisional. Damage immunity remains one second and health remains three.

Guard locks its attack angle when beginning the pause. The hit is checked once at swing start against reach, that fixed arc and an unobstructed path; moving behind/outside it can dodge. It pauses through the short swing, then pursues even while the next attack is cooling down. The floor preview is a directional sector and a short blade sweep shows the swing.

Only a damaging hit starts knockback, directed away from the guard. Smooth movement over the short push uses the same small-step collision helper as walking, stops at walls, retains goblin facing and can coexist with player movement. Simultaneous immune hits do not stack damage or pushes. Hits still interrupt searching and placement; snares interrupt attacks as before. No extra stun system or player attacks added.

Verified: 74 tests including direction locking/dodging, quick chase resumption, knockback distance across frame rates, wall safety and shared hit/push immunity. Existing gameplay/guard/route/loot suites pass. Standalone build and bundled syntax pass; timing/feel still need browser playtest. Download green-team-quick-swings-v19.html.
