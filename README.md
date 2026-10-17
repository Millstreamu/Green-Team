# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

A playable local loop now includes a small lair, stash, crafting, dungeon runs, searchable furniture, a sack, guards and return-to-tunnel escapes. The local server now supports a shared multiplayer dungeon test. Named persistent lairs are implemented; public hosting, account login and player limits remain future work.

## Solid furniture · V48

Chests, crates and cupboards now block goblins and guards. Doorway lanes and full corridor footprints stay empty; placements that disconnect floor are rejected. Cupboards use only top/back walls. Chest/crate art, including open lids and shadows, fits a single32×32 source tile (scaled to the existing display size). Loot spills onto reachable floor beside the furniture. The builder preview, solo and server game share these rules.

Try green-team-solid-furniture-v48.html or update with the full green-team-v48 folder. Keep your previous whole data folder. No dependency or save migration changes.

## Torch lighting · V47

Dungeon rooms now have wall-mounted pixel torches, warm light pools and gentle flicker, with darker corners/corridors. Light is clipped at solid walls. This first pass is visual only: darkness does not affect guard sight, searches, hiding or combat. All three dungeon types use lighting; the lair and HUD remain bright. Torches are decorations without interactions/collision/stock cost. Wall placement reuses the existing grid rules. Light placement/shadows cache per generated world and run entirely in the browser. See [lighting](docs/lighting.md).

Try green-team-torches-v47.html for a standalone preview, or update to green-team-v47 with your whole old data folder before starting the server. No extra installation/dependency/save migration. Dedicated inner-corner art remains deferred after the approved V46 wall fix.

## Wall joins fixed · V46

Corrected Human wall joins at corridor openings: transparent bottom rims now draw over a continuous side wall, and inside corners use square wall faces instead of the diagonal outside-corner tile. Side trim is composed from the existing sheet. Both bottom outside corners still reuse your bottom tile, and top outside corners still mirror. Source art, map generation and collision are unchanged. The game heading now shows the current version in both solo and online.

## Human dungeon tile art · V45

Human Manor now renders your supplied Proplet32×32 sheet: floor, top wall, mirrored side walls, top-left corner/mirrored top-right, and the shared bottom-wall tile for both bottom corners. Select Human Manor at the map table and start a run. Dwarf/Elf and the lair retain temporary art. Furniture/guards and the builder floor-plan preview remain their existing art/colours. Source sheet and metadata live together in assets/human; gameplay generation, collision, saves and your Moss defaults are preserved. See [terrain art](docs/terrain-art.md).

Update using green-team-v45: stop the previous server, copy its whole data folder before starting, npm ci/npm start and refresh. The standalone play.html embeds both sheet and metadata for offline play.

## Approved starting settings

The Moss export approved on17 October2026 now defines architecture defaults: Human Manor is50×40, requests15 rooms of5–8 tiles per side, tries6 extra routes and requests4 searchables per room. Protected dead ends remain2. Dwarf/Elf presets and gameplay tuning match the previous values. Existing lairs keep saved overrides; new lairs and defaults reset use the updated presets. Current Moss already has these settings, so no reinstall is needed for that lair.

## Export settings · V43

In private admin, select a lair and click **Export settings** after saving your builder edits. It downloads one JSON file with that lair's saved gameplay tuning and all three dungeon layouts. Attach it in our chat to have the chosen values promoted into the GitHub defaults. Export is read-only and works during runs. It contains settings and the lair name; invite codes, identity keys, inventory and progress are excluded. Unsaved form edits and example preview numbers are not included. Export itself does not change GitHub.

## Dungeon builder · V42

The private admin page now includes **Dungeon generator · floor-plan preview**. Select a lair, choose Human Manor / Dwarf Hold / Elf Sanctuary, then adjust map size, room sizes/count, corridor width/bends/connections, loop/dead-end targets and furniture/hiding density. The preview shows tiles, furniture, hiding spots, cages, reinforcement doors and original guard posts. Keep the example layout number to compare changes or click Generate another. Save this dungeon for next run stores that architecture's settings in this lair; reset restores that architecture's defaults. Choose the matching dungeon at the in-game map table; Normal/Hard stays independent. Live runs keep their original layout. Future runs choose fresh layout numbers, so preview is an example rather than a reserved next map.

Furniture, hiding spots and cages now use shared tile footprints and wall/corner placement rules. Inside routes from doorways to room centres stay clear. Large future props can use multiple tiles. Placement is skipped if no suitable space exists; preview reports actual counts. Art remains temporary. See [dungeon builder](docs/dungeon-builder.md).

Copy your whole old data folder into green-team-v42 before starting. Existing tuning and progress are preserved; missing architecture settings receive defaults.

## Game builder · V41

Open the **Private server admin** link printed in Terminal, choose a lair, and use **Game builder · run settings**. Change guard speeds, sight, notice/attack timings, alerts per reinforcement, furniture search times and loot chances. **Save settings for next run** persists them for that lair; **Reset settings to defaults** restores our current balance. You can save during an active run: it keeps its original settings and the next departure uses the new values. Every edit backs up the server first. Personal bonuses and map difficulty still apply normally. See [game builder](docs/game-builder.md).

Copy your whole old data folder into green-team-v41 before starting. Existing saves use current defaults automatically; no extra installation. Solo play.html keeps its existing defaults.

## Your lairs · V40

**V40:** lairs remember their creator. On the home screen, choose from **Your lairs** and click **Enter your lair** without a code. Friends still need the name/code. Ownership follows the same goblin and survives restart, reset and backup/restore. Existing V39 saves backfill the first saved lair member as creator, with a backup before the update.

V39 starts on a home screen showing your goblin and displayed level. Create a named lair to get its six-character join code, or enter a friend's lair name/code. Return to the home screen to visit another group. Each lair has separate stock/gold, prepared sacks, map and live dungeon; your personal XP/recipes/passives follow your goblin across them. Upgrades stay at the workbench/campfire. Packed sacks stay in their lair. Different groups can run simultaneously. The displayed level starts at1 and rises every100 lifetime XP as a provisional display value; no tokens/gates are added.

V36–V38 saves migrate with a before-migration backup: the old home is **Original Lair**. Find its join code in the private server admin page printed in Terminal. The admin page now selects a lair for stock/reset-lair/End run, while personal XP and full backup/restore are server-wide. See [lair entry](docs/lair-entry.md), [server admin](docs/server-admin.md) and [saving](docs/server-saving.md).

Successful runs still award each departed goblin equal personal XP from the team's banked valuables, including offline/expired and left-behind goblins. Waiting arrivals earn none. Current test balance:1XP per valuable gold,30XP Quick Fingers at campfire (+10% search speed),50XP smoke recipe at workbench. Materials/equipment/debug/failed/empty runs produce no XP. Profiles and all lair banks commit together before success is shown.

With Node.js 22.13 or newer installed, open a terminal in this repository and run:

```sh
npm ci
npm start
```

Open **http://localhost:8080** in two tabs. In the first, create a lair and note its name/code above the game. In the second, join using those details. Both goblins then enter the same lair. Walk both goblins to the minecart and board with E. After the three-second countdown, both enter the same generated map. Move away from the entrance, hold E beside a container and stay still. One goblin searches it at a time; both see the pixel progress bar. Release/move/disconnect cancels the search and frees it. Contents spill once, including empty searches. Release E and press again to pack highlighted loose loot. The first successful collector gets an item; a full sack leaves it on the ground.

Tab opens/closes the same sliding sack; WASD selects while manually open. Click floor/sack items to lift, R rotates, click sack squares to place, E or clicking the floor drops. Drop items for a teammate to collect. In the sack, WASD or clicking selects gear and E equips it. Snares: the sack hides, WASD aims without walking, release E then hold it for1second to place; Esc cancels. Mouse movement can also aim. Step fully clear before the snare arms. A goblin crossing an armed snare wastes it harmlessly; a guard is held3seconds. Smoke: equip with E, then Space consumes one bomb and blocks guard sight for5seconds. It does not stop a committed swing. Gear can also be dragged between sack cells or onto the floor for teammates. The existing collapsed Debug supplies section at stash/workbench packs free tagged test snares/smoke/Packed Lunches; these never create real stock on return or escape. All connected standing participating goblins return to the secret tunnel together and press E to finish. Downed goblins are excluded from that count and immediately spill their sack/cursor items once; teammates can recover them. Three hits down a goblin. A standing teammate carrying a Packed Lunch can hold E beside a downed goblin for2seconds to revive it to1health. The lunch is consumed only on completion; interruption preserves it. Revived goblins must pick their spilled loot up again and count toward the exit check. If guards find a downed goblin with no standing goblin visible, they approach and hold1second to pick it up, then carry it at1.6tiles/sec to the nearest reachable cage by walking route. Seeing a standing goblin makes a carrier drop the captive and chase. Previously spilled loot stays at the original down site. A teammate can hold E for3seconds at a cage to free one captive to1health without a lunch. Movement, damage, releasing E, disconnect, loss of reach or target state change cancel rescue progress. One helper at a time per goblin; other captives in a shared cage remain locked. Test lunches come from Debug supplies; recipe cost/unlock has not been chosen. If nobody remains standing, the run fails, except for an active goblin still eligible to reconnect during its remaining grace. Held cursor items must be packed or dropped first. Valuables sell once into shared gold; materials and unused gear return once to shared stock. Everyone sees the team haul in the reused result dialog and closes it to continue at home. The results show your personal XP earned and available balance; the same team reward goes to all departed goblins, while waiting arrivals get none.

Late arrivals wait in the lair until the next run. A detected dungeon disconnect leaves a grey translucent ghost for60seconds, not an extra goblin needed at the tunnel. Reconnecting in time restores that same goblin/sack. Timeout spills bag/held item once and returns the player to waiting; teammates can recover those floor items. If survivors leave before reconnect, the ghost's sack is lost rather than banked. If every participant is offline, the run stays open for the remaining grace, then fails when nobody can return. Floor loot is lost when a run closes. Guards never attack downed/carried/caged/disconnected goblins. They prioritise visible standing goblins over capture, keep a visible target, and can switch to another visible teammate. Each guard updates once per server tick, regardless of player count. The committed swing direction stays fixed and may hit multiple standing goblins inside its arc. The shared alert count advances for each guard’s full alert cycle, not for each victim/switch. Every third alert brings another sweeping guard through a guard-only door. Temporary hidden-disconnect cleanup releases the barrel and leaves the ghost at the entry point; reconnect appears outside. Cage sites and jail posts are fixed for a generated map, exclude the entrance and avoid props/original guard posts. Up to3 cages are chosen, with a stationary jail guard at each. Jail guards watch and attack at their post and count toward the normal alert system, but do not transport prisoners. A disconnected carried goblin is dropped as a downed ghost; a disconnected caged goblin stays caged and cannot be rescued while grey. Reconnect preserves that health/state, and timeout/closed-run cleanup releases carrier/cage references without respilling loot. Several goblins can share the closest cage so capacity never silently overrides the nearest-cage rule. These timings/shared capacity are provisional tuning values in RESCUE in src/config.js. Repeated disconnect abuse policy and durable recovery remain future work.

This test listens only on **127.0.0.1**. `npm start` saves global personal profiles and multiple named lairs in `data/home.sqlite`, using Node’s built-in SQLite (no new package or database install). Stash transfers, crafting, purchases, departure and return save automatically before a successful state is shown. All lairs’ shared counts, personal sacks and global profiles commit together; movement does not write to disk. Restart returns everyone to the home screen; joining a lair starts unboarded at home. Prepared home sacks survive; an interrupted dungeon loses its carried supplies/loot while home stock and waiting goblins’ sacks remain safe. Completed haul banking is durable and cannot replay on restart. Earned personal XP and purchases save with shared haul banking in the same transaction. Restarted live runs earn nothing; finished runs cannot replay XP after a restart.

The Goblin selector on the home screen and above the game remembers local goblins separately from solo saves. Fresh tabs reuse a remembered goblin; if it is already connected, the new tab creates a separate goblin for two-tab testing. At home, choose an existing goblin or New goblin. The selector is disabled during a run. Continue using the same browser and http://localhost:8080; changing browser/address or clearing site storage loses those local identity keys. These are local test identities, not accounts or cross-device login. Named lair entry by code is implemented; authenticated accounts and public hosting remain future work.

Keep the **data folder** when updating to another version: stop the server, copy that folder into the new game folder, then start there. For backup, stop the server and copy data somewhere safe. Runtime saves are ignored by Git and are never included in downloads. A broken/unsupported save stops startup instead of silently replacing the home. A disk write failure pauses the live server and tells players. See [server saving](docs/server-saving.md) for recovery, optional save path and checks. Opening play.html remains the separate standalone solo game.

For an update on Mac: stop the previous server with Control+C, unzip the new download, type `cd ` in Terminal and drag the new folder onto that line, press Return, then run npm ci and npm start. Node does not need reinstalling. Refresh both game tabs. The new archive folder is named green-team-v48 to distinguish it from older copies.

`server/lair-session.js` owns home/run membership and routing; `server/dungeon-session.js` owns the active world, search reservations, loot transactions and outcome. `server/danger.js` reuses guard/pressure/hiding/snare/smoke rules; `server/team-guards.js` selects one focus per guard without advancing timers once per player. It retains the brief target trail without reading unseen teammates or ghosts for new clues. The browser regenerates the deterministic layout from the server-selected seed; all movement/collision, search duration and item ownership are still checked by the server. Snapshots conceal container contents and other players’ bags/profiles. Each active scene shares player poses and searchable/ground updates. Public deployment still needs HTTPS/WSS, authenticated group membership, transport heartbeat handling and production account recovery and group membership management. SQLite home persistence is implemented; one server process owns each save file. Server/rescue.js owns rescue claims/hold completion, captives and guard transport; src/rescue.js shares cage layout/reach targeting, and rescue-view.js reuses pixel progress bars for the temporary cage/body art.

## Play

Download `play.html` and open it in a desktop browser. Start in the lair. E at the stash or workbench opens side-by-side shared stash and personal sack grids. WASD selects within the focused grid; E or click takes one stash item or returns one sack item. Q switches grid focus. R (or Move whole stack) rearranges a stash stack. Crafting puts the item into your sack if it fits, otherwise into shared stock. Packed supplies save while you are at home. E at the campfire below the home spawn opens personal passive upgrades; recipe purchases/crafting stay at the workbench. Visit the upper-left map table to choose Human Manor, Dwarf Hold or Elf Sanctuary on Normal/Hard. Then E at the separate northern minecart boards it; E again hops out. Once all participating goblins are aboard (one in this local test), the three-second countdown leaves with your packed sack. Planning and cancelled boarding never spend supplies. Free test gear is under Debug supplies in the lair dialog. No installation, account or server is needed. Use WASD or arrow keys to move. Hold E while stationary beside a highlighted chest, cupboard or crate to search it. Release E or move away to cancel. Loot spills onto the floor only when the search completes; release E and press again to pack the highlighted nearby loot automatically; click loot to lift it, R rotates a held item, and clicking the sack places it. While holding an item, E or clicking the dungeon drops it nearby. Click a packed item to lift and rearrange it. Invalid placements keep the item in your hand. The sack slides off the lower-right edge while moving, leaving a tab. Tab or the edge tab opens/closes it. When opened manually, WASD selects sack squares instead of moving the goblin; Tab closes it again. Automatic loot peeks do not take over movement. Highlighting loose loot briefly reveals it; pickup attempts reveal it too (including a full sack). It stays open while holding an item so placement remains available, unless explicitly closed with Tab. Furniture highlights do not open it.

Return to the secret tunnel where you started (gold marker on the map) and press E to finish the run. At the tunnel, E means leave; while holding an item it still means drop. The haul screen lists only loot packed in your sack. Escaping sells valuables into the shared gold stack and stores materials and unused real gear in the central lair stash. **Return to lair** takes you home; use the tunnel to prepare the next run.

**Return to lair** during a run abandons carried loot/traps after confirmation; stock already at home is safe. The small map shows your position. Lair stock carries between runs and saves locally in this browser when browser storage is available. The footer reports whether saving works. Active dungeon runs are not saved; reloading returns home with the supplies already spent when that run started.

The goblin uses your supplied 16×16 art; dungeon art is temporary. This version includes test loot, a 3×3 sack and two lookouts, one room patrol and one local roaming guard, with snare/smoke crafting, spendable personal XP for recipes and passives in the standalone solo game. The separate V33 server test covers the shared dungeon, guards, hiding, snares and smoke; Packed Lunch revive, guard transport and cage rescue now work online; personal team XP settlement now works online.

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

The prototype uses JavaScript and the browser's Canvas drawing surface, with no external browser packages. The separate multiplayer test server uses the small `ws` package. Edit `src/`, not the generated `play.html`.

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

Next: playtest V40 creator re-entry. Leave your own lair, restart, then enter through Your lairs with no code. A second goblin must still use the friend join form and code. Create two lairs, join one from a second tab using its name/code, then switch the first goblin between them. Check shared stock/sacks remain separate while XP/recipes/passives follow. Restart and join again. For migrated saves use Original Lair and find its code in admin. Level gates/tokens, more recipes and public hosting remain later choices.


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


## V20: central stash, gold, recipes and smoke bombs

One shared lair model owns a 6×6 stash grid, item counts and recipe unlocks. This is still the local solo playtest: there is no live server or cross-browser sharing yet. Gold has one canonical stack count, also shown in the workbench header. Materials and crafted items merge into their existing stack on return/crafting. WASD/arrows select a stash cell; E or click picks up/places a whole stack; Escape cancels a move or closes the panel; Tab closes the stash. Stacks reserve their source while moving and cannot overwrite another stack. Slot positions are saved. Personal sacks still use separate cells for each carried copy. Both grids use inventory-grid.js/drawItem rather than independent renderers.

Returned valuables sell automatically once: coin 3 gold, scroll 8, horn 10, candlestick 12, sword 20, ruby 25. Haul rows show per-item sale values and the total earned. Materials and unused real equipment return to stock; debug gear never banks into real stock. Going down/abandoning keeps home stock safe as before.

Snare remains the free known recipe (2 scrap + 1 cloth). Buy the smoke bomb recipe once for the lair for 20 shared gold, then craft each bomb with 1 scrap + 2 cloth. Recipe screens show both unlock cost and materials before purchase. Gold purchases knowledge, not free item copies. Future timed-trap/sleep-dart recipes are deferred, not sold as unfinished unlocks.

Choose mixed equipment at the tunnel with a total nine-square limit. Tab opens the sack; WASD selects; E equips gear. Snare uses the existing placement preview. Smoke equips as a quick-use item: Space consumes one bomb from the sack, leaves spares separate, and creates a radius-two cloud at the goblin's feet for five seconds. A HUD shows equipped smoke and remaining copies. The cloud blocks guard line of sight/cones, not movement; guards use their existing lost-sight trail/search. A committed swing can still land, so keep moving. Only actual mouse/input/Space events trigger use; holding Space does not auto-spend every frame. SMOKE in config.js controls duration/radius.

Save version2 migrates legacy stored valuables into gold once, retains materials/gear and saves unlocks/grid positions using the existing storage key. Invalid slot metadata is reconstructed from valid counts; blocked storage still falls back to the current session. No active run resume or multiplayer transactions implemented.

Verified: 82 automated tests, including automatic sales/duplicate prevention, stack moves, one-time recipe purchases, material crafting, mixed nonstacking loadouts, old-save migration, smoke charges/expiration/sight breaking and real UI event wiring through the full sell→unlock→craft→carry→equip→Space loop. Standalone build, bundled syntax and unique HTML IDs pass. No rendered browser test; layout/focus/balance await user review. Download green-team-shared-stash-v20.html.


## V21: Human Manor job and difficulty selection

The tunnel opens the existing preparation screen with a job/difficulty choice above gear. First job: Human Manor, using the current procedural room layout and temporary art. Normal preserves the previous game. Hard adds two guards outside normal guard/roamer coverage (one lookout and one room patrol), raises rare-valuable odds by 15 percentage points among valuables, and multiplies each valuable's sale price by 1.5 rounded to a whole gold. Container placement, empty/material odds, item counts, guard attack timing/health and gear rules stay the same. The normal entrance room remains outside routine patrols. Both difficulties are immediately available for testing.

The menu previews risk/reward before launch; selected job/difficulty stays visible in the sidebar and haul screen. Job selection is validated before shared supplies are spent. Run metadata snapshots the selected profile. Valuable saleMultiplier is attached when loot spills and travels with inventory transfers, so floor hints, grouped haul prices and actual banked gold use the same itemSaleValue helper.

Jobs/difficulties live in jobs.js. Future job layouts can extend that registry without replacing the preparation UI. This slice adds no job unlocking, XP, new art theme or server. Verified: 86 automated tests, including 100-map Hard coverage, normal backwards compatibility, sparse reward comparisons and a complete Hard-priced loot sale. Existing real-event smoke/economy loop now checks invalid selection without spending and launching/extracting on Hard. Build, bundled syntax and unique HTML IDs pass. Browser difficulty balance needs user playtest. Download green-team-jobs-v21.html.


## Multiplayer behavior review

[Open questions and proposed defaults](docs/multiplayer-review.md) cover job choice/readiness, escape/recovery, joining/leaving, looting, shared spending, guard/team effects and save/session rules. Discuss these in small batches; proposed defaults are not user decisions. V21 is still the current playable local build. Hosting and multiplayer implementation remain deferred while behavior is clarified.


## V22: hiding barrels

Dedicated barrels labelled HIDE appear in roughly every other room, including a safe introduction in the entrance room. They are distinct from searchable cupboards/crates. Approach the existing green highlight and press E to enter; E again exits at the position you entered from. The goblin disappears and the barrel reads HIDDEN · E EXIT. Movement, searching, inventory interactions and gear use are blocked while hidden; the dungeon continues running.

Entering unseen blocks guard sight, strikes and new invisible trail samples. Guards can follow existing clues and finish searching nearby, but do not discover a hidden goblin automatically. A guard with actual unobstructed sight when you enter remembers that spot, approaches using existing navigation and pulls you out, then resumes ordinary pursuit. Smoke can block that initial sight; snares delay the approaching guard normally. Leaving early clears the obsolete hide target on its next update. No extra damage, heat or reinforcements added in this slice.

HIDING in src/config.js controls reach, room spacing and guard pull distance. src/hiding.js owns placement/entry/exit and src/hiding-view.js draws temporary barrels; existing interaction selection, collision, sight, navigation and HUD are reused. Spot IDs, occupant ID and guard knowledge tied to goblin ID prepare for shared state. The local prototype reserves one occupant per barrel; multiplayer capacity, disconnect/downing cleanup and target selection remain to confirm/implement on the server.

Verified: 91 automated tests, including generated spot reachability, unseen searches, witnessed entry/pullout/attack, snare delay, occupancy and an actual keyboard/pointer event flow. Standalone build and bundled JavaScript syntax check pass. Rendered appearance and escape difficulty await user playtest. Review copy: green-team-hiding-v22.html.


## V23: timed hiding and occupied spots

Hold E beside a highlighted hiding barrel for 0.5 seconds to enter. The existing small pixel progress bar fills above the barrel. Releasing E, moving, getting hit or starting another interaction cancels and resets progress. You remain visible and vulnerable during entry; any guard seeing the attempt remembers the spot if entry completes. E exits immediately as before.

One goblin per hiding spot is now explicitly agreed. Entry checks capacity again at completion; only the first successful goblin enters. An occupied barrel shows a small green goblin-head icon, visible to others, plus OCCUPIED (or HIDDEN · E EXIT for its occupant). Completion stores the same occupant ID already used by V22; leaving clears it. Networked atomic capacity checks and disconnect cleanup remain future server work.

HIDING.enterTime in config.js is 0.5 seconds. Progress reuses drawPixelProgress and follows the same hold/cancel pattern as searching. Verified: 95 automated tests, standalone build and bundled syntax check. New coverage includes exact duration, cancellation/restart, witnessing during the hold, contested entry and indicator clearing, plus actual keyboard hold/release wiring. Browser feel/visuals await playtest. Review copy: green-team-hiding-v23.html.


## V24: heat and reinforcement doors

Long pursuits build one shared heat value. Alerted chase speed rises smoothly, reaching slightly above goblin speed at maximum heat; routine/search speeds, attack timing and sight rules stay unchanged. Break pursuit (including the fresh invisible trail) to start a quiet grace period, then heat cools slowly. Successful unseen hiding remains safe. The HUD shows heat, total guard alerts/remainder and how many extra guards have arrived.

Every individual guard becoming fully alerted adds one count immediately; two guards spotting together add two. Every third count schedules one extra guard. Ongoing chases and brief sight reacquisition never repeatedly count. A guard can count again after finishing investigation and returning to its routine. A guard witnessing completed hiding entry counts too. Alert counts/remainders and arrived guards survive heat cooling; the growing population has no cap and lasts until this run ends.

Guard doors appear in solid top-wall sections in some rooms. Goblins cannot open, search or leave through them. A two-second GUARD INCOMING warning highlights the selected door and appears in the HUD before the guard steps in. Doors are used in a fixed cycle. New purple sweeping guards follow cached paths through rooms and pause to look around; they use the normal sight, chase, invisible trail, attacks, snares, smoke and hiding rules. Patrol destinations never use an unseen goblin's location.

Provisional values in HEAT in config.js: 30 seconds of pursuit to full heat, four quiet seconds before cooling, 20 seconds from full heat to zero, max chase speed 1.08 times goblin speed, three alerts per reinforcement, two-second arrival warning, doors about every third non-entrance room. pressure.js owns run state, doors, sweep construction and queued spawns; pressure-view.js owns door/HUD feedback. Existing navigation/routines are reused. Each new run resets pressure. Lair/results do not advance it; active runs still do not resume after reload.

Verified: 102 automated tests, standalone build, bundled syntax and unique HTML IDs. New tests cover 100 generated door layouts, per-guard counts, carryover/warnings/arrival, no population cap, heat rise/grace/cooling/speed cap, actual guard re-alert reset, hiding witnesses, sweep movement/pauses and run reset. Existing real main event flow checks heat/count HUD and reset alongside the full economy/gear/hiding loop. No rendered browser or online multiplayer test; pressure balance, door readability and performance with many guards await playtest. Review copy: green-team-heat-v24.html.


## V25: first personal XP test

Your goblin's XP total is visible beside health in the lair and dungeon. The existing run-results dialog shows earned XP and the new personal total. Provisional pacing in PROGRESSION.xpPerGold is 1 XP per gold of recovered valuables, using the same per-item price/Hard rounding as selling. Materials and unused/debug equipment award no XP in this first test. Empty escapes and solo failed runs award zero; they never reduce already earned XP. No XP is earned merely by picking items up or abandoning a run.

profile.js stores a separate personal profile under green-team-goblin-v1; existing lair stock/recipes remain under their previous key. Gold spending and lair stock changes cannot spend/reset XP. Saves reload locally when browser storage is available; otherwise XP still works in memory, with the footer reporting personal and lair save status. This is one local browser goblin profile, not accounts or server-synced progress yet.

A team result can credit multiple distinct profiles equally, with per-profile receipts preventing repeated credit for that live result. The current playable build is solo; future server reward settlement must use durable run/profile IDs, eligibility and database transactions before claiming reconnect/crash-safe or actual team XP. Server accounts, group-lair joining, personal recipe unlock thresholds and a level tree are deferred. Existing prototype gold-funded recipes and shared-stock crafting remain until their replacement slice is specified.

Verified: 107 automated tests, standalone build, bundled syntax and unique HTML IDs. New tests cover actual recovered Hard haul values, equal multi-profile rewards and duplicate prevention, loss/empty/material/debug exclusions, independent personal/lair saves, reload/corruption/blocked storage and integer-safe totals. Main event flow checks the XP HUD, results, save, gold-spend independence and later loss retention. No rendered browser or online team test; pacing/readability await playtest. Review copy: green-team-xp-v25.html.


## V26: personal recipe knowledge

Snares are known at zero XP. At 50 total personal XP, the goblin automatically learns smoke bombs; learning never spends XP or gold. The workbench reuses the existing recipe cards/buttons to show known recipes and locked recipes' current/required XP and amount remaining. A known recipe still requires its normal shared materials (snare: 2 scrap + 1 cloth; smoke: 1 scrap + 2 cloth). Having enough gold cannot bypass XP, and other goblins do not gain knowledge from a craft performed in their lair. Existing crafted stock can still be used by goblins who have not learned how to make it.

PROGRESSION.recipeXp in config.js contains the provisional 0/50 thresholds. knowsRecipe in profile.js derives knowledge from personal XP; no shared recipe flags are saved. Crafting checks the acting profile as well as shared material stock. Knowledge therefore reloads with personal XP and works in another lair. No additional level tree or facility upgrades added. The current solo crafting output/pre-run stock setup is retained; sack-first output and direct lair stash-to-sack preparation remain separate planned work.

Camp save schema3 preserves stock/layout and removes old shared recipe flags. A schema2 save with the purchased smoke recipe receives its old 20-gold price back once during migration; existing smoke bombs remain in stock. Reloading schema3 does not refund again. Personal XP is neither increased nor reset, so recipe knowledge follows the new XP rule. Schema1 valuable-to-gold migration is retained.

Verified: 110 automated tests, standalone build, bundled syntax and unique HTML IDs. Tests cover exact XP boundary, personal knowledge across saves/lairs, novice access rejection, materials-only spending, no gold/XP spend, old-save stock/layout preservation and one-time refund. Real main flow starts a returning-goblin fixture at 25 XP, rejects locked crafting, earns 25 XP from an actual ruby escape, opens the known smoke recipe and crafts it once; remaining economy/gear/hiding/heat checks pass. Fresh production profiles still start at zero. No rendered browser or online team test. Review copy: green-team-recipes-v26.html.


## V27: direct lair packing and sack-first crafting

Stash/workbench now show the shared stash beside your own 3×3 sack, reusing the existing grid renderer/item art. E/click on a stash stack transfers one item into the sack, decrementing stock immediately; E/click a sack item returns it. Q switches grid focus, WASD/arrows select. R or the Move whole stack button retains stash rearranging; E/click places the moving stack and Escape cancels that move. Tab closes the stash; Escape closes either dialog. A full sack rejects withdrawal without losing stock. Traps remain individual carried copies.

Crafting still checks personal recipe knowledge and spends shared materials. New output goes into your sack first; if it cannot fit, it stays in the shared stash. XP/gold are not spent. Debug supplies are individual add-one buttons in a collapsed lair section, tagged as free test gear so returning them removes them without creating real stock. Normal gear and debug gear use the same fit rules.

The departure screen now contains job/difficulty and a read-only packed-sack summary. Cancelling keeps everything packed; Start transfers the actual prepared items to the run without another stock deduction. Empty runs are allowed. A temporary minecart/rails replace the lair tunnel drawing; the dungeon secret-tunnel escape is unchanged. Separate map station, all-board readiness and online team departure remain future work.

Camp schema4 saves shared quantities and the local prepared sack/next item ID together. Reload at home retains both deducted stock and packed items. Departure persists an empty home-preparation bag, so reloading an active run cannot restore its spent gear. Schemas1–3 migrate with an empty prepared bag, retaining old stock/layout and the previous one-time smoke refund. Current prepared-bag persistence is for the single local goblin in this lair; the future server must key bags by lair/player and coordinate transfers atomically. Personal XP/knowledge save is separate and unchanged.

Verified: 116 automated tests, standalone build, bundled syntax and unique HTML IDs. New cases cover conservation, competing last-copy takes, footprint packing, full-bag rejection, sack-first/overflow crafting, prepared-save reload, launch exactly once, escape/loss/debug stock handling and old/invalid save migration. Main keyboard/pointer flow now packs/returns/moves stacks, crafts into sacks, cancels/departs without repaying, uses debug buttons and still exercises search/loot/escape/XP/recipes/smoke/snare/heat/hiding. Q focus switching is checked in the mock DOM. No rendered browser or online team test. Review copy: green-team-packing-v27.html.


## V28: spendable XP, recipe purchases and a search passive

Personal XP is now an available balance. Run rewards increase it; workbench purchases decrease it. Snares start known. Smoke knowledge costs50 XP once, and Quick fingers costs30 XP once for a permanent10% search-speed bonus. Having50 XP no longer automatically teaches smoke. The existing workbench recipe cards now show available XP, buy/owned states and material crafting buttons; a matching passive card uses the same styles. Buying a recipe never crafts an item or spends shared gold/materials. Once owned, crafting spends only its usual materials, still preferring your sack and falling back to stash. Purchases cannot repeat or drive XP below zero.

Knowledge/passives are saved with your goblin independently of the lair, so spending the remaining balance or changing lairs does not remove them. Profile save schema2 stores available XP, lifetime earned XP and explicit purchases. Existing schema1 profiles keep their saved XP as spendable balance; a previously automatically learned smoke recipe (old total>=50) remains owned, without charging XP on migration. That compatibility grant happens only for old schema1 saves, not new profiles. Camp save schema4 is unchanged.

The passive gives1.1 times normal search speed (duration divided by1.1) for chests, cupboards and crates. Search sessions use the acting goblin's rate; the small existing pixel loading bar uses that same actual duration. Releasing/moving/hits still cancel and reset. Loot odds, item amounts, guards, hiding and trap timing are unchanged. Prices/bonus live in PROGRESSION in config.js. Online server must eventually validate each profile purchase and derive search effects itself.

Verified:121 automated tests, standalone build, bundled syntax and unique HTML IDs. Tests cover affordability, ownership after spending, duplicate rejection, separate saves/lairs, passive isolation, legacy migration, old reward replay after spending, faster duration across all furniture, progress-bar timing and cancellation. Main event flow earns25 XP to bring a saved55-XP wallet fixture to80, buys smoke50 and passive30, persists zero available XP with both owned, then crafts/uses smoke and completes an actual faster search while the rest of packing/combat/heat/hiding checks pass. Fresh profiles start0 XP. No rendered browser or online team test; choices/prices/feel await playtest. Review copy: green-team-skills-v28.html.


## V29: campfire for personal passives

A small temporary pixel campfire south of the lair spawn uses existing station targeting, highlight and E interaction. It opens the same lair dialog in a compact personal-upgrade mode, showing available XP and passive cards. Quick fingers is bought here. Recipes and crafting remain at the workbench. Shared inventory/gold are hidden in campfire mode; Escape or Back to lair closes normally. The workbench cannot purchase passives, and campfire mode cannot buy recipes/craft. Personal balances, ownership, effects, prices and save formats are unchanged.

Verified: all121 automated tests pass, with the existing real main flow adapted to walk to the campfire, buy the passive there, check station-specific panels/actions and continue to an actual faster search. Standalone build, bundled syntax and unique HTML IDs pass. No rendered browser test; campfire visibility/menu feel await user playtest. Review copy: green-team-campfire-v29.html.


## V30: map-planning station and boarding countdown

Map planning is a separate table upper-left of the lair (5,2.5), distinct from the central northern cart (9,2.5). E at the table opens the reused job/difficulty dialog. Set destination confirms the plan and returns home; Close/Escape discards an unconfirmed draft. Neither starts a run or spends gear. The latest confirmed selection saves with the lair and appears in the home HUD, including narrow screens.

E at the minecart boards/marks ready; E again hops out and cancels the countdown. The goblin stays aboard until hopping out or departure. When all listed participants are aboard, the countdown is three seconds (DEPARTURE.countdown in config.js). Reboarding after cancellation starts a fresh countdown. Changes to the destination do not clear readiness or restart its timer. Actual departure snapshots the latest profile and generates one seed, then moves the existing packed sack without another stock deduction. Readiness/timers never reload from saves. The shared participant/readiness model is tested, while the browser still plays one goblin and does not connect friends yet.

jobs.js owns the small departure coordinator; the existing loadout-view.js is repurposed as map-planning UI. Existing lair targeting/drawing/dialog styles and prepared-sack flow are reused. Camp save schema4 accepts an optional destination field; old saves default to Normal without losing stock. Stock, profile XP and passive effects remain unchanged.

Verified:125 automated tests, standalone build, bundled syntax and unique HTML IDs. Coordinator tests cover all-aboard waiting, excluded waiting arrivals, cancellation/restart, preserved readiness through destination changes, single frozen departure and persisted selection without readiness. Real main flow plans/cancels drafts, boards/cancels/waits/reboards, checks no early world generation or stock spend and a single generated run, then retains crafting/XP/gear/guards/heat/hiding coverage. No rendered browser or online test; station placement and countdown readability await playtest. Review copy: green-team-cart-v30.html.
