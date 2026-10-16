# Work status

## Current task: V15 lair / stash / snare crafting, awaiting playtest

The user approved movement/art in V2 and the sack in V3. They agreed to return to the entrance via a secret tunnel and see the haul before starting the next run. V4 implements that loop. The user then clarified guard pressure and the downed-player rule, gave V5 positive feedback, and approved V6's looped routes. They requested timed searching before adding a builder/balance panel. The user approved V7 searching and requested a sliding sack; The user approved V8 and requested a small pixel search bar over the searched object; V9 implements that display. The user then agreed to predictable local guard patterns before adding traps; The user reported V10 works pretty well but identified the corner-to-room investigation gap. V11 added the brief invisible trail, which the user approved. V12 implements the approved sack-to-ground snare controls and awaits playtesting.

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

Movement/art, sack, guard loop, V6 routes and V7 searching have positive user feedback. The sliding sack was approved. Ask the user to try V12: I, select the snare, E, release then hold E for one second, step clear, and lure a guard across. Check the preview and placement feel. Keep the builder/balance panel deferred until the user is ready. The map view without player/tunnel markers remains deferred. Temporary map art is drawn in Canvas; no Proplet importer has been built.

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

## V7 searching handoff

Adds src/search.js (seeded searchable furniture/contents, shared interaction targeting, search sessions and guarded one-time spills) and src/search-view.js (temporary objects and progress feedback). New loot state starts empty; valuables enter the floor only through search completion or player drops. Input tracks held E with blur/visibility clearing. Searches require continuous E and remaining beside the object; movement, release, reach/path loss, a hit, item lifting or downed/run completion interrupts and resets them. Guards continue updating.

Completion marks searched before releasing contents; no repeat spill. The held key is not reused for automatic pickup. Released items carry stable IDs and a brief spill animation; all pickup/rotation/packing/drop rules and drawItem visuals are reused. New interaction selection chooses either loose loot or an unsearched object by cursor/reach, with matching prompts/reticles. Existing held-item drop and tunnel E priority are retained.

SEARCH values: reach 1.6 tiles, movement tolerance 0.08, crate/chest/cupboard 1.5/2.5/3.5 seconds. These are provisional, not final balance. Furniture is non-solid in this chunk so existing navigation and corridor collision remain untouched. Contents are deterministic test data; there is no Proplet importer or asset change.

Validation: 34 tests pass. Search generation and all spills checked across 100 maps for valid accessible floor and unique IDs. Cases cover partial holds, release/movement/distance/wall/held-item/downed cancellation, restart timing, full sacks, target preference and one-time release. Existing dungeon loops, guard navigation/combat, inventory and run tests pass. Packing/run unit tests now use explicit loose-loot fixtures, while the real event-wiring smoke searches actual furniture before pickup, checks release cancellation and no auto-pack, then packing, extraction, a second search, guard downing/lost cursor loot and healthy restart. Build and standalone module syntax pass. No rendered browser QA was available; timing/visual feel need user review.

Download: green-team-search-v7.html. Canonical generated file remains play.html. No builder panel or balance pass, persistent stash, lair, traps, new map view, hosting or multiplayer added.

## V8 sliding sack handoff

Reuses src/sack-view.js, the same sack canvas and existing placement rules. New src/sack-panel.js handles only visibility: closed at start, manual I/tab toggle, movement hide, short new-loot highlight peek and pickup-attempt reveal. Idle highlighted loot keeps it open; explicit dismissal suppresses the same unchanged highlight. Held items force it open, including while moving, so manual placement never becomes inaccessible. Furniture/search targets do not open the sack. Results and a fresh run reset/hide it.

index.html slides the existing panel off the stage's right edge with a remaining tab, inert/aria-hidden state for the closed panel, expanded state on the tab, and a reduced-motion override. Cell hit testing ignores hidden grids. No changes to search, guard, inventory data, collision or loot distribution.

Validation: 39 tests pass. Five visibility tests cover initial/manual state, movement, highlight peeks, pickup precedence, dismissal and held-item/results behavior. The full mock-DOM smoke checks I and tab opening, movement closure, search-completion loot reveal and refusal to hide a held item while retaining the existing pack/escape/down/restart flow. Standalone build and syntax checks pass. CSS transition and actual mouse/focus behavior still need rendered browser/user review; mock-DOM checks are not that review.

Download: green-team-sack-slide-v8.html. Canonical Git build remains play.html. Builder, future map view, persistence and multiplayer remain deferred.

## V9 search-bar handoff

src/search-view.js now draws a compact pixel bar immediately above the active object, with height adjusted for cupboards versus short objects. Uses the existing session elapsed/duration and camera coordinates; no new progress state. Idle targets retain HOLD E; active targets replace that label with the bar. Removed updateSearchPanel and its DOM/CSS panel, and its main-loop call.

Validation: the 39 existing tests pass, including search cancellation/completion and the interaction smoke (now checking the shared search-state prompt instead of the deleted panel). Standalone build/module syntax pass, and generated HTML has no old search panel/call. Visual placement still needs user browser review. No new test suite for this small display change and no gameplay/data changes.

Download: green-team-pixel-search-v9.html. Git canonical build remains play.html.

## V10 guard-pattern handoff

Extends the existing guard.js actor/state/pathfinding system. createGuard takes behaviour/roomIndex, stores an immutable home point and local route, watch directions and pause timers. createGuards assigns three distinct non-starting rooms spread by route distance: two fixed blue lookouts and one brown two-point room patrol. Other rooms have no assigned guard. No routine roams between rooms anymore.

Lookouts alternate two entrance-derived directions at a regular cadence with a short smooth turn. Room patrols pause at each end and remain inside their assigned room while undisturbed. Notice/chase/last-seen search/attacks remain shared. Search completion now enters a return state and navigates to the assigned home before restarting the pattern. Suspicion fading during a return resumes returning. Main loop/render accept an actor array; vitality ticks once per frame and damage immunity is shared across guard strikes.

GUARD_PATTERNS defaults: count 3, lookout interval 2.6s, room endpoint pause 2s, turn speed 2π radians/s. These are provisional. Normal HUD explains patterns without broadcasting remote facing rotations; small actor labels and different tunic colours aid observation. No trap, fog-of-war, map redesign, new alarm or multiplayer added.

Validation: 44 tests pass. New checks cover deterministic three-room assignments across 100 maps, unassigned entrance/quiet rooms, fixed lookout position and repeated timed directions, paused in-room patrols, pursuit leaving the assigned room then returning to its own post, and simultaneous strikes respecting one immunity window. Existing 100-map route/collision tests now cover all guard actors. Mock-DOM smoke still searches/packs/escapes, then deliberately walks to a lookout to test downing/lost-loot/restart, since guards no longer roam into the entrance room. Build and standalone syntax pass. No rendered browser QA; sight/turn timing, local routes and combined difficulty need user playtesting.

Download: green-team-guard-patterns-v10.html. Git canonical generated file remains play.html. Traps are next by agreement, but no loadout/crafting/placement rules are chosen yet. Builder, persistence and multiplayer remain deferred.

## V11 pursuit-trail handoff

Adds a per-guard trail to the existing search state, not a separate AI system. On a chase sight break, seed it with lastSeen and record valid contiguous goblin movement for COMBAT.trailSeconds=2.5; keep lastSeen unchanged until a real visual reacquisition. Sample with 0.3-tile spacing or tile transitions to preserve corners, validating floor/path and ignoring teleports. Follow saved points in order at searchSpeed=2.2, then use the existing search look-around timer and return-to-post routine. Capture is bounded but queued clues can still be followed afterwards. Real sight clears the queue and resumes chase. No footprints are rendered.

Navigation now handles an exact same-tile goal when a tile-centre path is already exhausted, avoiding a guard stalling just short of a recorded position. The normal collision-safe path follower is reused. HUD distinguishes following the fading trail from searching its end. No combat, normal patrol or loot rule changes.

Validation: all 48 tests pass. Four focused tests reproduce turning from a narrow hallway into a room, constrain searching speed, verify the single uninterrupted hidden-capture cutoff without rewriting lastSeen, check actual-sight chase reacquisition, and confirm invalid teleports do not create clues and fruitless searches still return home. The cutoff fixture keeps the guard far enough back to avoid legitimate sight reacquisition restarting the timer. Existing map/navigation, patterns, inventory, search and interaction tests pass. Standalone build and module syntax pass. No rendered browser QA; the user's original corner/room playtest is the next verification.

Download: green-team-trail-v11.html. Git canonical build remains play.html. Traps still follow after this guard refinement; no new system or multiplayer changes.


## V12 handoff

- `src/traps.js` holds supply, placement and trigger rules; `src/trap-view.js` draws preview/armed/spent traps. `src/world-ui.js` shares the existing pixel progress bar between searching and placement. Sack selection and arrow navigation reuse `src/sack-view.js`; game wiring remains in main.js.
- One test snare per fresh run. Three-second guard hold. Setter-clearance gate before arming prevents accidental overlap triggers; goblins waste armed snares unharmed. No crafting/loadout system was added.
- Verification: 53 automated tests passed, including full event wiring for equipping/cancelling/placing plus existing searching, loot, escape, guard loss and restart. Standalone build and bundled syntax check passed. No rendered browser test was available; user review is pending.
- Preserve the user goblin art, previous UX and bounded invisible trail. No server or multiplayer setup. `play.html` is current; `green-team-snares-v12.html` is the distinct review download.


## V13 handoff

User requested a very simple pre-run trap selection/count screen, with no stacking. Implemented a dialog using the existing result-panel/button styles, currently listing only implemented snare traps. Choose 0–9, see used/free sack squares, Start run. Invalid quantities cannot start. Quantity remains selected between runs within the page. Starting packs separate uniquely identified items via existing findSpace; no fixed starter grant remains. Setup phase pauses movement/guards and resets the run timer when starting.

Files: new src/loadout.js and src/loadout-view.js; main.js handles setup/start, index.html provides dialog; build script includes modules. Removed obsolete one-snare helper from traps.js; trap tests use the actual loadout packer. Existing interaction test now exercises paused setup, invalid start rejection, initial/repeat runs and zero/full inventory. Two rule tests cover independent items, fit, IDs and invalid counts.

Verification: all 55 automated tests passed. Standalone build and bundled syntax check passed. No rendered browser test; review screen appearance and quantity controls in user playtest. `play.html` is current; distinct download `green-team-trap-setup-v13.html`. Work is on prototype/dungeon-exploration; PR #2 is the current draft (PR #1 was already merged). Crafting, saved loadouts, additional traps and multiplayer remain deferred.


## V14 handoff

Replaces I with Tab. Manual sack navigation routes WASD/arrows to the selected square and suppresses player movement. Passive automatic peeks retain walking; Tab activates navigation. E selects/equips the snare as before. Placement now starts with a nearby default point, independently of stale mouse coordinates. moveTrapAim moves/clamps the preview from keyboard input, resetting the hold on any aim movement; goblin remains stationary. An actual pointer event can still aim. One-second hold, release latch, shared pixel bar, damage interruption, cancellation and clearance arming remain.

Changed input.js, sack-view.js, traps.js, main.js and index.html; no new UI framework. Tab mode changes clear held movement. Tab explicitly closes even when holding loot (otherwise automatic hold pinning remains). Normal Tab focus remains available in pre-run/result dialogs. No keyboard loot rearranging added.

Validation: 56 tests pass. Interaction checks now cover WASD selection without walking, Tab closing, existing full gameplay loop, keyboard preview aiming and placement, closing/reopening while holding loot, zero/full pre-run loadouts. A rule test checks aim range, stationary goblin and progress reset. Standalone build and bundled syntax pass. Browser visual/focus feel still awaits user review. Current download: green-team-keyboard-traps-v14.html. Same prototype branch and draft PR #2; no server/multiplayer changes.


## V15 handoff

User approved first little lair: escape→stash→craft→launch again. Added safe walkable home reusing world tiles/movement/goblin renderer. Left stash, right workbench, north tunnel; E interacts; Tab toggles lair stash, Escape closes panels. Start/restart/result return home; tunnel opens existing prep screen, limited by real stock unless explicit free-debug toggle is enabled. Crafted/unused equipment uses the existing nonstacking sack on runs. Guards remain dungeon-only.

New lair.js owns camp counts, craft/take/bank rules, save validation/fallback and home world/station reach. lair-view.js uses shared item-list.js rows (also extracted from results-view.js) and existing panel/button/drawItem visuals. lair-drawing.js supplies temporary home props. Added one-square scrap/cloth definitions and searchable pools; the entrance crate guarantees 2 scrap/1 cloth. Starter stock 1 snare/2 scrap/1 cloth and recipe are provisional. Current valuables remain stored, with no spending/selling progression yet.

Bank successful bag contents and return unused real traps once; clear bag after banking. Loss/abandon leaves home stock safe and loses carried supplies. Debug traps carry a tag through inventory moves and never bank into real stock. Save stock at crafting, launch and settlement; reload returns to lair and does not resume/refund the active dungeon. localStorage is optional and footer reports fallback; no network/shared save.

Verification: all 62 tests pass. Six new lair checks cover searched-materials→packing→escape→bank→craft, stock conservation/failed starts, debug isolation, loss safety, save load/corruption/blocked storage and lair reach/collision. Existing mock-DOM loop now walks home stations, crafts, cancels launch, launches with actual stock, searches/escapes, verifies bank once, goes down with stash safe, uses keyboard traps, and tests full/empty debug loadouts. Standalone build and bundled syntax pass. No rendered browser automation; layout, focus and pacing await user playtest. Download green-team-lair-v15.html; canonical build play.html. Same feature branch / draft PR #2. No multiplayer, decoration, table construction or upgrades.
