# Work status

## Current task: multiplayer behavior review; V21 is current playable build

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


## V16 handoff

User likes the loop; requested fewer items, occasional materials and empty searches. search.js now rolls zero/one/two seeded contents per container using SEARCH_LOOT in config.js: .6 empty, .15 two-items conditional on nonempty, .45 material per item. Removed hardcoded entrance chest valuables and crate recipe. Main shows a clear empty-result message; normal duration, searched visuals, cancellation and repeat prevention are reused. No guard/crafting/stock rule changes. New-lair starter kit remains.

Verified: all 64 tests pass. Two new search tests cover normal-time empty completion/no rerun and sparse material/reward distribution across 200 spread seeds. Existing mock-DOM gameplay uses a naturally ruby-bearing generated seed (3428989595), and its final run uses seed42 to verify the naturally empty entrance and actual UI message. Spill and economy tests use explicit content fixtures rather than assuming production freebies. Build and bundled syntax pass. Browser pacing still needs user playtest. Download green-team-sparse-loot-v16.html; canonical play.html, same feature branch / draft PR #2. Future balance tweaks belong in SEARCH_LOOT; do not restore guaranteed entrance loot accidentally.


## V17 handoff

User approved sparse loot, then approved one additional multi-room patrol alongside existing guards. createGuards retains the prior three assignments and adds a purple roamer where a bounded safe route exists. New guard-routes.js creates an entrance-excluding view of the real map (does not mutate world), finds a short two/three-room path, optionally extends it to a nearby third stop, and mirrors the cached adjacent tile-centre path for a repeatable out-and-back loop. Limits: three touched rooms, 55 outbound points. Normal placements across 200 spread generated seeds all get one roamer, preserving multiple rooms without normal routes. Unsupported small/disconnected layouts skip it.

Guard.js adds a roamer patrol branch within the existing state machine: follow cached adjacent points with followPath, pause three seconds at stop centres, face the next leg. Original local routines and assignments retained. Suspicion, attacks, trail search, return-home and snares are shared. Returning home resets route index and pause. Guard-view.js uses purple clothing / ROAMER label, sidebar explains it. Main idle hint updated. No sparse loot, lair economy or keyboard UX changes.

Verification: all 68 tests pass. New guard-roamer.test.js checks 200 bounded deterministic routes, tile adjacency and closure, entrance avoidance and quiet rooms; actual guards complete two cycles with every stop paused on ten maps; snare interruption, lost-sight search, return-home and restart; blocked entrance-only layout fallback without map mutation. Existing integration and guard suites pass; assignment test now distinguishes the original three from the extra roamer. Build and bundled syntax pass. No rendered browser QA; user should compare added pressure with useful quiet areas/snares. Current download green-team-roaming-guard-v17.html; canonical play.html, same feature branch and draft PR #2.


## V18 handoff

User approved V17 then proposed more/better valuables far from entrance, more materials nearby. Search.js now creates positions first, computes shortest walking distance using existing findPath, stores distance/depth relative to the farthest container, then rolls seeded contents. searchRewardDepths/searchRewardProfile are pure exported helpers. SEARCH_LOOT holds near/far empty (.7/.5), material (.75/.2) and rare (.1/.8) probabilities. Usually one item, occasional two unchanged. Existing valuables split into common/rare furniture pools; rarity is provisional, not a sale-value system. Empty searches remain everywhere. No entrance freebies restored.

Verified: all 70 automated tests pass. New tests reproduce a physically close object behind a long corridor detour, clamp/check profiles, and compare nearby/deep empty/material/rare frequencies across 300 maps. Existing 200-map sparse generation tests still pass. Integration uses naturally ruby-bearing seed978983017 with updated path fixture and seed42 for an empty search; production has no special test-seed overrides. Standalone build and bundled syntax pass. No rendered browser QA; user should judge whether longer trips feel worthwhile and near materials remain useful. Download green-team-deeper-loot-v18.html; canonical play.html. Same branch/draft PR #2; guards, crafting, lair and keyboard controls retained.


## V19 handoff

User requested more dangerous quick pause/swing/chase attacks and slight goblin knockback, configurable later. Guard.js locks attackAngle when starting the .18s windup, checks directional reach/arc/walls once at swing start, holds the .14s swing, then chases during .45s cooldown. Approach is capped to combined actor radii. Directional red arc and blade sweep in guard-view.js replace full-circle preview. Existing actor routines, search trail and snares reused; snaring clears both windup and swing.

COMBAT adds attackReach1.2, attackHalfArc PI/3, swingTime.14, knockbackDistance.55 and knockbackTime.1; attackRange.95 remains initiation reach, windup/cooldown changed as above. Health3, immunity1 unchanged. A damaging hit records knockback velocity/time on vitality; tickVitality(player,dt,world) applies it once per frame with moveActor. world.js extracts walking's small-step collision into moveActor so pushes/walking share walls. Facing is preserved; normal inputs remain available. Main passes world and keeps hit cancellation for search/placement.

Verification: all 74 tests pass. Four attack tests cover committed-direction dodges, post-swing chase while cooling down, consistent smooth push without facing changes across frame rates, wall-blocked knockback and simultaneous immunity preventing push stacking/reversal. Existing guard health test now ticks real world knockback and checks the quicker first hit. Full gameplay, routes/trails/snares and walking tests pass. Build and bundled syntax pass. No rendered browser QA; user should assess short timing/knockback strength. Download green-team-quick-swings-v19.html; canonical play.html, same feature branch/draft PR #2.


## V20 handoff

User approved implementing the shared gold/stash/recipes foundation and then smoke as first Space-use item. Lair.js now owns counts+slots+unlocked (one shared local camp model), a 6×6 stash, automatic valuable sale prices from LOOT_TYPES.sellValue, whole-stack moves, generic recipe purchase/crafting and mixed supply spending. Snare stays known; smoke unlock20g, craft1scrap+2cloth. Stock remains local pending multiplayer; future server owns all transactions. Save schema2 retains prior storage key, converts v1 valuables once and stores grid layout/unlocks. Debug tagged gear never banks into real stock.

New inventory-grid.js is shared by sack and stash; new stash-view.js supports keyboard/click whole-stack moves with reserved source/cancel/occupied rejection. Lair-view.js shows central gold, stack grid and two recipe cards with upfront unlock/material costs. Existing results show sold gold, per-item prices and returning materials/gear. Loadout supports snare+smoke, separate copies and total9 limit; debug free gear still available. No future unusable recipes are purchasable.

New smoke.js consumes an actual sack copy, tracks five-second radius2 clouds and tests segment/cloud sight obstruction. Guard sight/cone code accepts clouds and reuses existing lost-sight search/trail; committed swings remain dangerous. Smoke-view.js draws temporary floor smoke. Main E equips a selected smoke, Space uses one (no auto-repeat); HUD shows equipped item and copies. Snares retain ground placement; all clouds/equipment selection clear between runs. No stun, smoke damage or player projectile system yet.

Verified: all82 tests passed. New shared-stash suite covers sales once, canonical gold/stack merging, quantity-preserving stack moves, unlock once/material spending, atomic mixed-loadout rejection and v1→v2 migration with layout preservation. Smoke suite covers consuming separate copies, expiry, inside/across-cloud visibility, chase→search→reacquisition and held/down restrictions. Existing mock-DOM gameplay now moves a stash stack, earns gold, buys/crafts smoke with an explicit saved-material fixture, preserves home stock after loss, launches a normal-stock bomb and equips/uses it via Space. Existing 200/300-map generation, combat, routes, searching/traps and save tests pass. Build, bundled syntax and unique HTML IDs pass. No rendered browser test; stash layout/focus, sale prices/unlock cost and smoke feel need user review. Download green-team-shared-stash-v20.html; canonical play.html. Same branch/current draft PR; no multiplayer server, job selection, timed trap or sleep dart added.


## V21 handoff

User approved tunnel job selection with one job/two difficulties. New jobs.js registry/selectJob/jobSummary owns Human Manor and Normal/Hard profiles. Existing preparation dialog previews profile before launching gear, retaining choices within the page. Invalid profiles cannot launch or spend supplies. Main snapshots selected world/job; run.js carries job metadata through escape/loss; sidebar/results show it.

Normal exactly preserves current generation/routines. Hard retains the original four guards and adds two in otherwise uncovered rooms (lookout deep, room patrol nearer middle). Extra IDs/homes unique and exclude entrance/roamer territory; still leaves quiet rooms. Guard logic/combat/smoke unchanged. Search rewards retain sparse item counts/empty/material odds while adding .15 rare probability among valuables. Spilled valuables carry saleMultiplier1.5; new loot.itemSaleValue supplies rounded price to floor target, result grouping and bankEscape. Per-item rounding is intentional and stated upfront.

Verification: all86 automated tests pass. Four jobs tests verify profile validation/Normal equivalence, 100-map Hard extra coverage and routine preservation, 100-map increased rarity without more items, and a Hard search→pack→escape→bank sale with profile snapshot/duplicate prevention. Existing full event loop now checks invalid selection leaves supplies safe and Hard launch/sidebar/result metadata. Build, bundled syntax and unique HTML IDs pass. No rendered browser QA; user should compare risk/reward of both difficulties. Current download green-team-jobs-v21.html; canonical play.html. No new job art, XP/unlock gates, server, timed trap or dart added. Same feature branch/draft PR #2.


## Multiplayer review handoff

User raised who chooses the map in a party and asked for a pass over similar unanswered questions. Added docs/multiplayer-review.md covering all currently implemented systems in seven short discussion batches, with recommendations explicitly pending approval. Updated working-process.md to require group ownership/simultaneous-use/join-leave/downing/shared-stock checks before feature implementation. First batch asks job/difficulty chooser, readiness/launch and new arrivals during a run. Host is an organiser role, distinct from the planned shared server.

Read actual run/main/loadout/lair/loot/search/guard/trap/smoke/UI flows for the audit. Main gaps: local launch selects/spends/creates world; solo extraction/down ends entire run; one guard target/trail; browser-local lair/effect timers; single search/selection; fixed goblin ID. Existing solo checks do not establish co-op correctness. Review document supplies future co-op checks and outlines server responsibility without implementing it.

Documentation-only change: inspected coverage and proposal/agreement labels; no runtime code or generated play build changed, so no game tests rerun. V21 remains playable. Continue by resolving batch1 with user, record accepted answers, then present the next small batch. Do not treat recommendations as accepted. Keep multiplayer server setup deferred until separately authorised.


## Multiplayer review: first answers recorded

User chose team vote, everyone marks Ready, and new arrivals wait until next run. Updated multiplayer-review.md batch1 and decisions.md. Host-selected jobs are not the agreed direction. Before escape/recovery, clarify two launch details: tied-vote resolution and automatic countdown versus organiser Start once everyone is ready. Ballot grouping/readiness-reset details remain proposed. Documentation only; V21 code/play.html unchanged, no runtime tests rerun. Continue small batches; no server/network implementation authorised by these design answers.


## Multiplayer review correction: map station / departure cart

User replaced team voting with an interactable map-planning station: anyone can change map/difficulty, latest confirmed selection persists. Everyone readies at a separate minecart departure point, with tracks into darkness. Updated review batch1 and marked original vote decision superseded. New arrivals still wait for next run. No tie-break decision needed.

Next focused question: does changing destination/difficulty clear everyone’s Ready state? Recommend yes. Cart proximity/ready cancellation, departure countdown and packing-flow details remain open for the next short review. Keep reviewing rather than silently treating proposals as accepted. Documentation only; V21 executable unchanged, no runtime tests rerun.


## Readiness clarification confirmed

User confirmed Ready means ready to go; changing selected destination/difficulty never clears it. Cart leaves for the latest selection at departure. Updated review and decisions; previous readiness-reset recommendation is rejected/superseded. Next short question proposes E to board/ready, E again to hop out, and a three-second departure countdown once all are aboard (not yet agreed). Documentation only, V21 remains unchanged; no runtime tests rerun.


## Cart readiness approved; move to escape/recovery

User approved E board/ready, E again leave/unready, three-second countdown when all participating goblins are aboard, cancelled if someone hops out. Updated accepted cart flow; destination edits never clear readiness. Next discuss individual escape, teammate rescue and recoverable sack contents in a short batch. Those rules are still pending. Documentation only; V21 remains current, no runtime tests rerun.


## Escape/recovery answers recorded

User chose group extraction: everyone together, not individual escape. Revive to one health with required Packed Lunch. Sack spills immediately on downing; contents remain recoverable and must be picked/repacked normally. Updated review/decisions, removed individual-banking proposal from active batch. Next ask whether downed goblins can be carried to exit or must be revived before departure. Lunch costs/consumption, team-failure rules and exit interaction remain pending. Documentation only; no Packed Lunch/runtime code or game tests changed, V21 remains current.


## Downed extraction exception recorded

User rejected carrying: downed goblins must be revived to leave themselves and are excluded from the extraction counter. All standing goblins gather; downed teammates do not block surviving players leaving. Reviving brings that goblin back into the count. Updated review/decisions. Next confirm all-down failed-run handling and Packed Lunch consumption only on completed rescue. Still documentation only; no runtime changes/tests, V21 remains playable.


## New capture layer in recovery review

User added guards picking up downed goblins and taking them to the nearest predetermined cage. Cage sites have largely stationary jail guards; allies can rescue captives, with a harder rescue than using Packed Lunch before capture. Standing visible goblins take priority. Updated review/decisions, keeping sack spill and downed exclusion from exit count. Next two focused questions: carrier drops captive when it sees a standing goblin? Cage opening frees to one health without Lunch? Failure/all-down and detailed cage rules remain pending. No capture/jail/Packed Lunch runtime added; V21 stays current and no game tests rerun for docs.


## Capture follow-ups approved

User answered yes: carrier drops captive and chases a standing goblin in sight; cage opening restores one health without Packed Lunch. Updated active review/decisions. Body drop returns the same goblin downed at the drop point; do not re-spill/duplicate the original floor items. Next confirm no-free-standing-player failure and shared hold-E rescue/interruption/Lunch-consumption behavior. Documentation only, V21 code unchanged and no runtime tests rerun.


## Recovery accepted; heat proposal pending

User said “ok cool” to no-free-standing-player failure and hold-E rescue/cancellation with Packed Lunch consumed only upon completed revival. Recorded as agreed. User then requested anti-kiting heat and asked for thoughts. Added a clearly pending proposal to review: sustained-pursuit heat with slow cooling and capped chase-speed escalation, readable UI, no hidden-player omniscience; reinforcements only a future possibility. Next obtain reaction to heat concept, then resume remaining multiplayer batches. No runtime/heat/capture implementation, V21 remains current and no game tests rerun for docs.


## Heat accepted and reinforcement cadence recorded

User accepted shared pursuit-driven heat and requested one additional persistent guard every three chases/alerts, creating increasing run pressure. Updated multiplayer review and decisions. Next clarify whether multiple guards spotting the team together count as one team incident (recommended) or separately; continuous-pursuit counting and reinforcement arrival details remain pending. No further escalation features requested. Documentation only; V21 remains playable, no runtime changes or game tests rerun.


## Per-guard reinforcement counting confirmed

User rejected combining simultaneous detections into one team alert. Each alerted guard adds one count; two spotting together add two. Updated active review and decision log, preserving one persistent extra guard every three counts. Precise same-guard re-alert rules and reinforcement arrival details remain open. No runtime changes or tests rerun; V21 remains current.


## V22 hiding barrels ready for playtest

User approved the hiding readback. Added hiding.js/hiding-view.js; extended existing search targeting, renderer, main controls, movement, guard sight/trail/strike/navigation and gear restrictions; build includes new modules. Dedicated barrels appear about every second room. E enter/exit, goblin hidden/immobile, no search/gear/menu actions. Unseen entry stays safe while existing guard investigation finishes. Actual witnesses remember goblin/spot, walk over, pull out and resume pursuit; snares still delay them. Exit reuses the valid outside entry position. Heat/reinforcements remain documented follow-ups, not implemented.

Verification: 91 tests pass (five hiding rule tests plus expanded real main event-flow test), standalone build and bundled syntax check pass. Tests cover 100 generated spot layouts, paths/non-overlap, unseen search completion, witness pullout then damage, snare interruption, blocked actions/stock conservation, occupancy/reach/walls and keyboard/mouse control gating. Browser rendering and feel still await user. Current review artifact green-team-hiding-v22.html and canonical play.html. Team capacity/reservations, disconnect/downing cleanup, multi-target guard priorities and shared heat interaction recorded as future work; no multiplayer test claim.

Next: user tests hiding unseen versus witnessed. Adjust readability/placement as needed, then implement the agreed heat and per-guard every-third-alert reinforcements after arrival/re-alert details are settled. Continue remaining multiplayer questions in small batches.


## V23 timed hiding and occupied feedback

Added HIDING.enterTime=0.5; begin/cancel/update entry attempt in hiding.js; main holds E, cancels on release/movement/hit/blur/other actions and updates before entry completes. Existing visibility/guard behavior remains active during the hold. Reuses drawPixelProgress above the barrel. Guard witnesses are accumulated during the hold and only gain hiding knowledge on completion. Explicit one-goblin capacity is now agreed; occupancy is rechecked at completion. Green goblin-head indicator and OCCUPIED label appear for occupied barrels, clearing on exit. Updated active multiplayer review and appended decisions/README; V22 capacity uncertainty is superseded.

Verified: all 95 automated tests pass, including exact timing, interruption/reset, witnessing during entry, two competing goblins, occupied indicator clearing, existing hiding/guard/stock rules and real main hold/release event wiring. Standalone build and bundled syntax check pass. Review artifact green-team-hiding-v23.html; play.html updated. No rendered browser or online multiplayer tests. Next user playtests entry timing and readability; heat/reinforcements remain next agreed runtime work after tuning arrival/re-alert rules.


## V24 heat and guard-door reinforcements ready

User clarified guard-only doors on some upper walls and roaming/searching reinforcements. Implemented pressure.js (door placement, heat, per-guard counting, warnings, spawn queue, cached sweeps), pressure-view.js (door drawing and HUD), config HEAT values, main lifecycle/tick and guard heated chase speed/alert rearming/reinforcement pause-look routine. Renderer/build include new modules; existing UI shows a heat fill, counts and incoming warning. index.html title/controls updated to V24. Every third full guard alert adds one persistent sweeping guard, with two-second door warning. Counts stay through cooling, no population cap. Reacquisition never recounts before routine reset; witnessing completed hiding entry counts once. No global enemy knowledge.

Verified all 102 tests pass, standalone build/bundle syntax and unique HTML IDs. New pressure suite covers 100 maps' solid-wall reachable doors, counted alerts/remainder and warning/arrival order, heat/cooling/cap, real reset lifecycle, witness entry, actual broad sweep/pauses, uncapped20 arrivals and fresh-run reset. Main mock-DOM flow also checks heat/alerts and reset, preserving loot/economy/gear/hiding coverage. No rendered browser or multiplayer tests. Review artifact green-team-heat-v24.html; play.html updated. Guard count intentionally grows without cap; large-population browser/server performance needs real testing before hosting.

Next user playtests heat pacing, three-alert reinforcements, door readability and hiding/cooling; tune HEAT values based on feel. Continue remaining multiplayer rules afterward. Server-owned counting/queues, reconnect snapshots, party scaling and jail-guard integration are documented follow-ups. Capture/cages/Packed Lunch and minecart/team flow remain design-only.


## V24 accepted; multiplayer disconnect rule recorded

User says V24 works very well. Continue team-rule review before capture/rescue implementation. New agreed disconnect behavior: detected connection loss makes goblin grey/translucent and untargetable by guards for 60 seconds; players cannot interact. Reconnect resumes same goblin/sack immediately, normal visibility and no bonus safety. Timeout spills sack once and removes goblin from the run. Updated active C2 rule/decisions; vulnerable-grace proposal superseded.

Next ask whether disconnected goblins are excluded from the departure counter during grace (recommend yes, pending). Special downed/carried/caged/hidden states, no connected standing players, run-end settlement and repeat-disconnect timers remain open. Documentation only; no tests rerun or new playable version, V24 remains approved baseline.


## Disconnect departure exception confirmed

User approved excluding disconnected ghost goblins from departure checks during the 60-second grace period. Updated active review and decisions. Next settle what happens to a ghost and its sack if connected survivors finish the run before it reconnects; recommend returning it to the lair without its dungeon sack, pending acceptance. No runtime changes/tests; V24 stays current.


## Run-end disconnect settlement confirmed

User accepted returning a disconnected player to the lair without their dungeon sack if survivors depart before reconnection. Updated active review/decisions; no ghost extraction reward or closed-run resumption. Next propose no-connected-standing-player grace handling: if only disconnected standing goblins could still return, keep the run alive through their existing timers; fail when none reconnect before expiry. This is pending and must not silently override the agreed no-free-standing-player failure. V24 unchanged, documentation only, no tests rerun.


## Last-standing disconnect grace accepted

User accepted keeping the run alive for the existing remaining grace of the last disconnected standing goblin. Return resumes play; expiry with no eligible standing rescuer fails the run. Recorded this as an explicit exception to immediate no-free-standing failure, without resetting timers or treating zero-player departure as success. Review/decision docs updated. V24 remains approved playable baseline; no runtime changes/tests. Next move to the shared search/loot rules in a small batch; do not expand disconnect edge cases indefinitely. Special downed/carried/caged/hidden cleanup and repeated disconnect policy stay flagged for implementation review.


## Shared interaction batch approved; backend options explained

User approved one searcher per container, floor-drop item sharing and pass-through goblin movement. Active review and decisions updated. Added dedicated-server versus browser P2P requirements and official references as a pending architecture comparison. Recommend a single Node.js game process, secure WebSockets and durable lair storage for the original cheap-server goal; P2P still needs connection services and host-loss/save decisions. Choice remains open. Documentation only, no tests rerun, V24 remains current approved playable build.


## Server-based direction accepted; next shared supplies

User chose the dedicated-server recommendation (Node.js, secure WebSockets/HTTPS, SQLite). Updated active networking notes and decision log; P2P no longer current direction. Framework/provider/budget/party limit remain open, no purchase/deployment or network code. Next discuss taking shared gear into personal sacks during lair preparation and handling simultaneous stock use; use existing agreed shared-access intent rather than re-asking who owns the stash. V24 remains current, documentation only, no tests rerun.


## Immediate shared gear transfer accepted

User approved stash-to-personal-sack transfer during lair preparation: stock decreases immediately, returning item restores it, first successful transfer gets last copy. Departure never spends packed items again; full-bag failure preserves stock. Updated review/decisions. Next small batch: whether crafted output enters shared stash and gold recipe unlocks are immediately usable by all (both recommended and consistent with shared lair intent); handle concurrent purchases/material spends once. Other follow-ups include lair disconnect-held gear persistence. Documentation only, V24 unchanged, no tests rerun.


## Progression ownership discussion active

User wants crafted outputs in own sack first when they fit; recorded correction, stash overflow still proposed. User raised persistent lair ownership/access across logout and changing friend groups, and personal XP/unlocks inspired by Payday 2. Added clearly pending ownership brainstorm to review/decisions. Do not keep advancing permission questions as if shared-recipe progression is fully settled. Discuss persistent personal goblin progression versus named shared-lair resources/facilities before implementation. V24 remains current; documentation only, no tests rerun.


## Persistent group-home progression direction accepted

User selected a persistent home for each friend group and said run with it. Updated active G1/ownership notes and decisions: player progress/recipe knowledge travels, group stock/gold/facilities/decor stay with named server-saved home. Personal-XP recipe unlocks/shared-gold facilities supersede prototype shared-gold recipe unlock direction for future progression. Existing V24 behavior remains unchanged. Next specify one bounded personal-XP reward/unlock slice; recommend equal run-participant XP from team recovered haul (pending), then decide minimum identity/lair join flow needed for a test. Avoid building a broad account/permissions system prematurely. No runtime changes/tests.


## Team-haul personal XP accepted

User approved equal XP for all participating goblins based on team recovered loot, with no pickup-owner bonus. Updated active ownership/XP review and decisions; spectators/waiting arrivals excluded, left-behind participants still participated. Exact conversion, failure rewards and disconnected eligibility remain open, as do unlock thresholds. Next bounded playable proposal: personal XP display plus end-run earned XP, saved separately from group lair stock; defer a large unlock tree until pacing is tested. No runtime changes/tests, V24 remains approved baseline.


## V25 personal XP playable test ready

Added profile.js (separate local personal save, team-haul XP calculation, per-profile live-result reward receipts), PROGRESSION.xpPerGold=1, main profile lifecycle/save/result settlement, personal XP HUD and result text using existing styles. Existing camp save untouched. XP reflects recovered valuable sale prices including Hard rounding; no materials/equipment/debug/failed-solo rewards in provisional slice. Retains XP after gold spending, lair stock changes or later loss. Footer distinguishes personal/lair save availability. Build includes module; index title/notes updated.

Verified all 107 tests pass. New profile suite covers actual Hard run/packing/escape/bank XP, equal profile credits/idempotence, empty/lost/material/debug exclusions, separate save reload/corruption/blocked storage and integer bounds. Real main event flow verifies initial total, ruby escape+25XP, saved total, gold purchase independence and later loss+0XP without removing earned XP. Standalone build, bundle syntax and unique HTML IDs pass. Review artifact green-team-xp-v25.html; canonical play.html updated. No rendered browser or online team test.

Next user playtests XP display/pacing. Recipe unlock levels/facilities, account identity and named persistent group joining remain to specify; current prototype still has gold-paid shared recipes, solo stock prep and shared crafting output. Do not imply approved future progression/gear/network changes are already built. Server rewards need durable run/profile deduplication and transactions; local receipt Map is only live-session protection.


## V26 personal XP recipe gating ready

User approved zero-XP snare and automatic smoke at50 total XP, no XP spend, material-based crafting and workbench knowledge/progress. Added PROGRESSION.recipeXp, knowsRecipe helper, profile-aware crafting and reused workbench cards/buttons. Removed runtime gold recipe purchase/shared unlock flags. Camp schema3 preserves stock/layout and refunds schema2 smoke purchase20gold once. Personal profile save unchanged: knowledge derives from XP. No recipe flag leaks between lairs/goblins. Existing stock can still be used without knowing how to craft it.

Verified 110 tests pass. Exact49/50 threshold, personal knowledge reload/multiple lairs, novice craft rejection, material conservation/no XP or gold spending, legacy migration/one-time refund covered. Main event flow uses returning-goblin25XP fixture, rejects locked craft, earns25 through actual ruby escape, crafts smoke at50 without gold/XP payment, rejects repeat after materials exhausted and preserves all later loss/stock/gear/heat/hiding checks. Fresh runtime profiles start0. Standalone build/bundled syntax/unique HTML IDs pass. Review copy green-team-recipes-v26.html; play.html updated. Browser appearance/feel and online teamwork not tested.

Next user tests recipe progress and material spending. Agreed sack-first crafting output and direct shared stash-to-personal-sack lair prep are still planned; existing solo crafting/setup remains until that slice is built. Personal accounts/named-group joining, facilities, capture/rescue and server implementation also remain future work.


## V27 direct lair packing and crafting overflow ready

User approved overflow into shared stash. Added take/return, sack-first craft and actual-bag departure helpers in lair.js; schema4 persists local prepared bag and next item ID with stock and migrates1–3. Existing stash-view now supports E/click take-one and R/button whole-stack move; added personal sack view using shared drawInventoryGrid. Lair-view shows both, Q switches focus, craft prioritises sack, debug add-one buttons remain tagged. Main uses prepared bag on home entry/departure; loadout-view now only job/difficulty/read-only sack summary, no quantities/duplicate stock spend. Home shows temporary minecart/rails; dungeon exit unchanged.

Verified all116 tests pass. New preparation suite checks stock conservation/last-copy conflict, footprint fit/full failure, crafting priority/fallback, persisted prepared gear/IDs, launch once, escape/loss/debug stock and legacy/invalid save migration. Adapted real main interaction flow retains search/loot/XP/recipe/guard-loss/snare/smoke/heat/hiding coverage while exercising pack/return/stack move/Q focus, cancel/start and debug add-one. Existing legacy migration asserts schema4. Standalone build/syntax/unique HTML IDs pass. Review artifact green-team-packing-v27.html and play.html. No rendered browser/online team tests.

Next user tests clarity of dual grids and output fallback. Future server must store prepared bags by player/lair with atomic transfers/unique IDs and no duplicate launch/reward. Current single local camp.preparedBag is intentionally not multi-account storage. Separate map-planning spot, all-board readiness, server/auth/groups, lair facilities and capture/rescue remain future work; departure still chooses job locally.


## V28 spendable XP purchases and Quick fingers ready

User approved spending XP on personal recipes/passives: smoke50, Quick fingers30 for+10% searching, starting snare. Added explicit purchase catalog/owns/buy/rate helpers in profile.js and schema2 (availableXP, lifetime earnedXP, purchases), replacing automatic threshold checks. Legacy profile1 keeps XP and old automatic smoke knowledge; new profiles must buy. Camp4 unchanged. Workbench shares cards/buttons for balance, buy/owned and crafting. Purchase saves profile independently; craft still spends only shared materials and packs/overflows as before. HUD/results clearly label available XP.

Main assigns the goblin's owned-passive search rate at run start. Search session snapshots adjusted duration and search-view uses it, so bar matches completion; cancellation still resets, loot/guard/trap/hiding unchanged. Exact+10% speed is base duration/1.1.

Verified121 tests pass. New/updated coverage: affordable one-time purchases, permanent knowledge atzeroXP, separate-profile passive isolation, saved knowledge/lair changes, legacy profile migration, old reward replay after XP spend, all furniture faster completion and same-duration progress bar/cancel. Real main flow saved55XP fixture earns25=>80, buys50+30=>0, saves both purchases, crafts atzeroXP, then real search completes sooner with passive; prior gear/stock/XP/guard/heat/hiding checks retained. Fresh profiles start0. Standalone build/syntax/unique HTML IDs pass. Review artifact green-team-skills-v28.html and play.html. No rendered browser/online team test.

Next user tests XP choices/prices/passive feel. Server needs authenticated personal purchase transactions and authoritative rates; current local profile is not secure multi-account persistence. No extra skill tree/respecs added. Other roadmap: separate map station/team cart, group join/account/server slice, facilities and capture/rescue.


## V29 campfire passive station ready

Added campfire at(9,11.5), south of home spawn, with temporary pixel stones/logs/flame in existing lair drawing. Reused lair target/E and dialog mode; campfire displays personal balance/passives, hides stash/sack/recipes/gold, focuses passive purchase or close. Workbench retains recipes/crafting and rejects passive purchases. Passive uses same profile debit/ownership/persistence. Main welcome/help updated; save formats/costs/effects unchanged.

Verified all121 tests pass. Existing main event flow now rejects passive buy at workbench, crafts smoke, walks to campfire, checks passive-only panels, buys30XP passive, closes and continues into run/faster-search/heat/hiding loop. Standalone build/syntax/unique HTML IDs pass. Review artifact green-team-campfire-v29.html and play.html. No rendered browser or online test. Next user checks campfire location/menu readability; remaining roadmap unchanged.


## V30 map planning and boarding countdown ready

Repurposed loadout-view.js as map-planning dialog; separate upper-left table confirms saved job/difficulty, Close discards drafts. jobs.js adds explicit participant/aboard/countdown coordinator; main E boards cart and E hops out/cancels, blocks walking while aboard and launches once after3sec, snapshotting latest selection/seed. Prepared gear is spent only via existing departure transfer. Home HUD shows confirmed plan; map table temporary art reuses lair station highlight. Optional camp4 destination saves without changing prior stock/profile formats; readiness reset on home entry/reload.

Verified125 tests pass. New coordinator tests cover all listed players aboard, ignoring waiting arrivals, countdown cancellation/restart, destination edits preserving ready/time, single immutable departure and destination save/fresh readiness. Main real event flow plans/confirms/discards draft, boards/cancels/waits/reboards, asserts zero generation/stock spend before final launch and one generated run; keeps existing progression/crafting/packing/combat/gear/heat/hiding coverage. Standalone build/syntax/unique HTML IDs pass. Review artifact green-team-cart-v30.html and play.html. Browser rendering/readability and actual network play not tested.

Next user tests lair station placement, latest-plan visibility and countdown cancellation. Future backend owns shared participant membership, proximity/readiness/clock and atomic launch; current UI remains one goblin. Level/token progression riff recorded separately as future direction; current XP shop unchanged. Remaining roadmap: account/group join/server slice, lair facilities and capture/rescue.


## V31 first real two-client lair test ready

User authorised bringing multiplayer forward. Added server/lair-session.js authoritative home state with separate per-goblin bags/profiles, existing transfer/crafting/rules, input movement/collision, station checks, shared destination/cart and a single launch seed/checkpoint. Added server/index.js HTTP/WebSocket entry, localhost binding, limited static routes, same-origin upgrade, size/rate/backpressure bounds. ws8.22.0 is the first server-only dependency, locked; Node>=22. npm start serves two-tab test. No public deployment.

Added online-main.js using existing HTML/renderer/map dialog and command-capable lair-view/stash-view. Existing local callers remain supported. Renderer draws additional named goblins using supplied sprite. Standalone play.html rebuilt, still solo. Online never touches solo localStorage. Temporary per-tab tokens/reconnect preserve home bag while process is open; offline members leave cart membership, membership change cancels countdown. Late arrivals wait after launch; test return button brings all home. Home-test assumptions recorded in decisions/review; in-run60sec ghost remains future work. Server memory resets on process restart; no accounts/groups/SQLite/XP reward/dungeon sync claim.

Validation: 132 tests pass, including two actual WebSocket clients over a local socket (contested last-copy transfer, shared movement, HTTP entry/route limits), authoritative crafting/stale input/collision/private bags/map/readiness/launch/reconnect tests, and mock-DOM real online entry event wiring/rendering for shared inventory/map without solo save access. Prior125 regression tests retained. Build and module syntax pass. Browser rendering and human two-tab feel not visually tested. No hosted link; README includes local npm ci/npm start/two-tab instructions.

Next: user tests local two-tab lair; then authoritative shared dungeon movement/loot/guards. Persistent named homes/accounts/SQLite and hosting remain future stages. Do not silently ship this development identity/server as public production.


## V32 shared dungeon/search/loot test ready

User confirmed V31 movement/stock/cart cancellation worked and approved shared dungeon next. Added server/dungeon-session.js using existing generation, search, loot, movement, tunnel checks and bankEscape. Lair session launches one world for fixed participants, routes validated commands, keeps newcomers home, and returns all after one settled extraction. World seed/job and sanitized object/ground snapshots go to active players; each receives only own bag/held/profile/result. Shared search reservations/progress, cancellation, full-sack pickup failure, pickup/lift races, rotation/place/drop sharing and actual stock/gold settlement implemented. XP awards deliberately deferred/labelled; no guards/gear deployment yet.

Online-main.js now reconstructs generated layout from the server seed, reuses sack visibility/grid/ghost and result views plus established E/click/R/Tab controls, moves/searches only by server commands and clears actions on blur/visibility loss. Manual sack remains open despite a delayed moving snapshot. Shared renderer adds grey/translucent ghost labels; search-view shows remote search bars; result-view handles team slot counts and network-XP-disabled label; sack-view accepts optional equipment prompt so online never promises undeployed gear controls. Defaults keep solo behavior.

Standing-goblin disconnect basics implemented:60sec grey ghost/reconnect same sack/actor; reservation freed; timeout spills bag+held once, removes actor and waits; survivor extraction excludes ghosts and discards their carried loot; all-offline preserves grace before failure. Dead/hidden/carry/cage states and repeated grace abuse remain future, as do active ping/heartbeat detection and durable saves. Server uses real elapsed dt for grace/countdown while bounding movement displacement. Temporary single home/profile memory still resets on restart, no accounts/groups/SQLite/public deployment.

Verified141 tests pass. New deterministic dungeon tests cover hidden contents/search ownership/progress/cancel/release/stale input, contested pickup/lift, ownership/reach/rotation/fit/drop, full-bag reshuffling, Hard sale/banking once/all-together exit, reconnect/expiry/no ghost banking/all-offline grace and repeated run/new arrival lifecycle. Actual two-WebSocket integration performs shared launch/search progress, loot race and one-time bank; existing transport test retains movement/static route checks. Real online-entry mock DOM flow drives map/home/run/search/keyboard release/Tab/manual latch/pointer lift/rotate/place/drop/pickup/team results, without accessing solo saves. All prior solo tests retained. Standalone build, module/bundle syntax and unique IDs pass. No rendered browser/human V32 playtest yet.

Deliverable green-team-dungeon-test-v32.zip contains green-team-v32 folder, package+lock, server/source/assets and START-HERE.txt Mac instructions. Stop old server Control+C, cd/drag new folder, npm ci, npm start, refresh both tabs. Node already installed; do not ask user to reinstall. README current instructions/next step updated. Canonical play.html rebuilt but remains separate solo game. Next user tests two-tab dungeon then shared guards; authenticated named homes, SQLite and server reward transactions still pending.


## V33 bundled multiplayer danger test ready

User confirmed V32, asked for larger updates and approved shared guard patrol/chase/attacks, heat/reinforcements, hiding, snares and smoke as one playable slice. Added server/team-guards.js (one update per guard; stable target/nearest visible/known hide/fresh target trail; unavailable fallback avoids freezes/phantom clues) and server/danger.js (existing vitality/knockback/guards/pressure/hiding/trap/smoke coordination). Core guard.js now shares strikePlayer for single/team directional hits and rejects unavailable/down/ghost sight/strikes. Main solo behavior/defaults retained.

Dungeon session integrates authoritative actions/hold leases/aim, attack-before-search completion, hide entry/witness/occupancy, reserved trap copy/release/hold/owner clearance, smoke and shared snapshots. Downing spills once, blocks actions/movement, ignores corpse for standing exit and target/trigger selection. Survivor bank settlement excludes ghost/downed bags but includes actual recovered copies; left-behind result list does not misreport teammate-recovered gear. All-down fails unless an active disconnected goblin retains grace. Existing hit immunity decays offline; hidden disconnect releases occupancy to outside ghost without healing. Lair return restores health and clears hide/gear state; no in-run revival/capture added.

Online-main.js reuses renderer/sack/hiding/guard/trap/smoke/pressure/result components, adds health/team alert/heat/quick smoke HUD, E gear selection, keyboard/mouse preview and hold/Space controls, hiding prompts and down/left-behind feedback. Gear clicks select for E; dragging rearranges/shares. Preserves physical held E while equipping (no autorepeat release bypass) and only sends changed mouse aim so keyboard aiming works. Command-capable lair view optionally reuses Debug supplies; server validates/tagged free copies do not add real stash stock. Solo dialog default remains unchanged.

Verified159 tests pass (prior141 plus18): team target/timer stability, ghost/down immunity and patrol, committed multi-body arcs, no phantom trail capture, concurrent hide occupancy/hold/cancel/witness exposure, hidden disconnect/gear cancellation, keyboard aim/body lock/release/full hold/single consumption/owner-clear arm, overlap race, harmless goblin vs guard snare, smoke sight+committed hit, shared alert/heat/reinforcement, down spill/action blocking/recovered-gear banking/left-behind, failure vs active-ghost grace, debug conservation/home health, damage cancellation and no reconnect health/immunity. Real two-WebSocket integration checks shared guards/trap/smoke/occupancy/alert/damage/ghost/reconnect snapshots. Expanded real online-entry mock DOM flow drives gear/debug packing, keyboard equip/aim/cancel/smoke, hide/exit, downed controls and result screens as well as earlier shared loot flow. Standalone build, bundle/module syntax and unique IDs pass. Human/browser-rendered V33 playtest still pending; do not claim visual QA.

Deliverable green-team-danger-test-v33.zip contains green-team-v33 and START-HERE.txt Mac update instructions. Same npm ci/npm start setup, Node already installed. No hosted deployment, account/group/SQLite persistence or network XP settlement; temporary home resets on restart. Canonical solo play.html rebuilt. Next user tests danger loop, then Packed Lunch revival and cages. Hidden-disconnect cleanup, target prioritisation and arc multi-hit are documented provisional implementation defaults, not silently settled permanent design.


## V34 revive/cage rescue test ready

User requested the full previously agreed revival/cage slice. Added src/rescue.js deterministic cage placement/reach/target helpers and server/rescue.js helper claims/held completion, exact Packed Lunch debit/restore, nearest reachable cage, body pickup/carry/drop/delivery and cleanup. server/danger.js integrates captures before normal guard update, handles non-standing actors, coordinates hit cancellation and rescue completion, and adds dedicated stationary jailers. Capture only claims already-spilled downed bodies, preventing carry-before-spill races. server/dungeon-session.js/lair-session route validated rescue commands/cancel/removal and share carried/caged poses/IDs/results without losing standing-only extraction or active-ghost grace rules.

Added RESCUE tunables (2sec floor,3sec cage,1sec pickup,1.6 carry, up to3cages), one-slot equipment lunch metadata and existing Debug supplies button; lunch craft/recipe/unlock remains unchosen. No debug copies bank real stock. Cages can share multiple prisoners to preserve closest-cage policy; completion frees one. Stationary guard variant reuses core attacks/sight/alert reset without following paths off post; raw sight/strikes reject all nonactive states. Traps preview and server both exclude cage centers. Capture/drop never respills/moves the original bag; revived goblin gets1health, no new immunity, and an empty sack to refill normally.

Client interaction prioritises contextual revive/rescue with server rechecks, keeps physical E held, uses shared reticle/pixel bars, preserves normal floor-loot pickup when lacking lunch, and shows DOWN/CARRIED/CAGED states. Added rescue-view.js temporary cage bars/labels and shared progress in existing renderer; carried sprite follows guard, prisoners appear behind bars. Cage and helper snapshots omit private item IDs. Build includes new client modules; all callers retain defaults for solo.

Disconnect: carried captive drops down as grey ghost; caged ghost stays in cage and cannot be rescued. Reconnect preserves health/state. Timeout/close release cage/guard/helper claims; no standing status from ghosting. Existing all-free-standing failure and standing-ghost exception retained. These special-state cleanup/timing/capacity defaults are documented for playtest.

Verified172 tests pass (prior159 +12rescue domain/layout tests +1real network rescue test). Coverage includes100 real generated maps with furniture/hides/original guard homes for deterministic reachable cages, nearest-path selection, exact held timing/one-lunch completion, cancellation/resource preservation including stale input, simultaneous helpers, capture/delivery/drop/standing priority/snare pause, stationary jail attack, free one-at-time multi-captive release, disconnect/expiry cleanup, repeat down/spill/recovery and standing extraction membership. Actual two-WebSocket flow tests smoke-covered interrupted/completed lunch revive, shared cage rescue/progress and both surviving return; existing transport danger/search/loot checks retained. Expanded real online-entry mock DOM checks Debug Lunch, body/cage reticles and held rescue progress, no-lunch cage opening and resulting health/state. UI fixture isolates random patrol damage; actual combat/cancellation is verified by dedicated domain/network tests, not claimed from protected UI fixture. Standalone build, module/bundle syntax and unique HTML IDs pass. No rendered browser/human V34 playtest yet.

Deliverable green-team-rescue-test-v34.zip contains green-team-v34 + START-HERE.txt. Existing Mac update: stop old server Control+C, cd/drag new folder, npm ci, npm start, refresh both tabs. Node already installed. Test lunches in stash/workbench Debug supplies; recipe economics still to choose. Source and play.html updated in Git; standalone solo has no teammate rescue gameplay. Current server remains localhost temporary memory, without auth/named groups/SQLite/public hosting/network XP settlement. Next user tests rescue timings, readability and coordination; then choose the next persistent/reward/economy slice rather than adding unrelated systems automatically.


## V35 carrier vision correction ready

User playtested V34 and approved the rescue/cage loop; reported carrying guards saw behind themselves. Fixed server/rescue.js to select forward-only shared seesPlayer mode as soon as a captive is held, including the capture-to-carry transition. Shared sight preserves normal wall/smoke checks and range while removing rear close-range detection only for this mode. Existing chase/search/pre-pickup rules remain intact. Carrying renderer now draws the same normal cone. Updated front-distraction test and added regression tests for near/far rear positions, immediate post-pickup state and smoke-covered forward approach.

Verification:174 tests pass, including real WebSocket and online-entry event tests; standalone build and syntax checks pass. No new rendered browser QA claimed. Deliverable green-team-carrier-vision-v35.zip contains green-team-v35 with updated Mac instructions. Test following a carrying guard from behind, then step in front: it must drop the captive and chase. Git branch remains prototype/dungeon-exploration, draft PR2; no merge. Public hosting/persistence/network XP remain pending.


## V36 persistent home ready

User approved saving shared lair stock/gold and individual goblin identity/progress. Added server/save-store.js with versioned SQLite home row, strict startup validation, atomic FULL-synchronous state commits and unchanged-state write suppression. server/lair-session.js restores disconnected actors at home, saves distinct bags/profiles/counts/slots/destination/nextItemId together after operations, and projects active dungeon bags empty so departure is durable. Interrupted-run recovery returns home without carried supplies/loot and grants no haul; waiting bags survive. Successful settlement saves bank and cleared bags together. Save exceptions latch the session closed.

server/index.js npm-start path opens data/home.sqlite (GREEN_TEAM_SAVE_FILE override), prints its path and closes cleanly on SIGINT/SIGTERM. WebSocket actions/simulation pause on save failures and notify clients before closing, without acknowledging a failed mutation. Test factories remain memory-only unless explicitly given a store. SQLite is built into Node22.13+/24; no new dependency. Runtime databases/data excluded from Git/ZIP/HTTP. package engine/lock updated consistently.

src/online-identity.js and online-main.js remember browser-local online identities, preserve separate per-tab selection, merge remembered profiles across tabs, show saved/error feedback and wire the header's home-only Goblin selector. New or already-live duplicate identities retain two-tab testing. Selector controls are hidden/inert in solo. Clearing/changing browser site storage loses local recovery keys; accounts, cross-device recovery and named group joining remain future. Personal XP/purchases persist but new network XP settlement is still disabled.

Verified188 tests pass, including14 new save/identity/process checks: close/reopen conservation and stock/craft/stack/destination/purchase saves, boarding reset, run spending and waiting bags, interrupted notices, repeat bank-once restart, schema/corruption refusal, failure latching, debug no-credit persistence, actual WebSocket server restart/recovery/static-save exclusion, live save-failure no-success feedback, and actual CLI subprocess SIGKILL with no shutdown flush at home and after launch. Online entry mock-DOM test now drives save feedback/selector switching/run-disabled selection while checking only the new online browser key is accessed. Browser identity checks cover closed tabs, separate selections, stale keys, blocked storage and simultaneous registration. No rendered browser visual QA claimed. Standalone build/module/bundle syntax and unique HTML IDs verified.

Deliverable green-team-saved-lair-v36.zip contains green-team-v36 and updated START-HERE.txt. On Mac stop old server, unzip/cd to new folder, npm ci, npm start, refresh localhost:8080. V35 had no disk save to import, so V36 creates the first saved home. For future updates stop server and copy the whole data folder into the new version before starting, or configure a fixed save path. Human test: deposit/pack, restart, close/reopen tabs, select previous goblins, verify shared stock/sacks; bank a haul, restart and check gold once. Restart-in-run loss policy is recorded as an implementation default, not a separate explicit user decision. Next candidate is durable network XP reward settlement or authenticated friend-group joining, chosen with user.


## V37 personal team XP ready

User approved the proposed earn-and-spend slice. server/dungeon-session.js now uses shared awardPersonalXp for the full departure roster during one settled finish, before sack cleanup and return. Only actual successfully banked valuables produce XP, through the same existing sale-value/Hard rounding helper; all departed actors earn equally regardless of offline/expiry/down/capture state. Waiting arrivals are not in that roster. Failure/materials/equipment/debug/empty hauls earn zero. Private live receipt Map is removed before shared result snapshots. Own personalXp receipt drives existing result UI, while offline/expired actors receive a temporary notice and durable balance.

The existing lair checkpoint already commits shared bank/sacks/all profiles atomically before acknowledgement; no new save schema or dependency. A restarted live dungeon cannot be replayed and an already-committed home cannot settle again. A failed reward commit triggers existing session/server pause and retains the last launched snapshot with neither gold nor XP credited. Existing workbench50XP smoke and campfire30XP Quick Fingers(+10%) rules/UI reused. Kept balance numbers experimental; no level gates/tokens/new recipes. Online help/server V37 heading updated; profile helper comment now describes current server durability.

Verified195 tests pass (188 prior +5reward tests +2persistence cases). Coverage: equal rewards for standing/downed/caged/offline-expired roster and no late-arrival XP; failure/empty/material/equipment/debug exclusions; real sale rounding; forged reward/ownership rejection; repeated extraction/dismiss/reconnect; station purchases and separate teammate ownership; next-run personal search rate; two actual WebSocket clients earning/spending; SQLite bank/XP/purchase reload and duplicate attempts across two restarts; failed payout commits without partial gold/profile persistence. Updated shared-dungeon former XP-disabled assertion to equal38XP. Real online-entry mock DOM now verifies +50XP result/balance, campfire purchase/owned state/20XP balance and unchanged teammate50XP alongside existing rescue/gear flows. Standalone build/module/bundle syntax and unique HTML IDs pass. No rendered browser or user V37 playtest yet.

Deliverable green-team-team-xp-v37.zip contains green-team-v37 + START-HERE.txt. Stop V36 server, copy its entire data folder into new V37 folder before starting, npm ci/npm start and refresh both localhost tabs. Saves/identity keys compatible; runtime data never included in Git/ZIP. Test return with valuables, equal XP, personal station purchases, craft smoke, faster next-run search, restart and verify balance/ownership. Source saved on prototype/dungeon-exploration, no merge. Authenticated accounts/group joining/public hosting, resumable runs/history, level gates/tokens and more recipes remain future choices.


## V38 server admin tools ready

User approved the proposed server admin/debug tool. Added admin.html + src/admin-main.js separate browser UI for summary, stock/XP, scoped resets, manual/automatic backups, restore and abort. Terminal prints a private random per-start link; normal game has no admin controls. UI preserves typed values while polling, validates via server, confirms destructive actions, disables edits while a run is active and handles expired/failed access. Existing palette/buttons/item definitions reused.

server/admin.js owns validated plans and private immutable JSON backups, fsyncs file/directory before applying any mutation, restores through existing SQLite checkpoint, and retains actor identities/newer blank profiles/item counter. server/admin-http.js requires private constant-time header key plus local host/loopback and same-origin POST, bounds JSON requests and exposes only summaries, not keys/full backups/paths. server/index.js enables admin only in normal CLI startup; test server factories remain disabled by default. Runtime backup files stay under ignored data beside the configured database.

server/lair-session.js shares its durable projection with admin, adds private JS-only summary/replace/end methods (never player message commands), updates the same actor objects for connected sockets, clears home readiness/transient state and latches save failures. Avoids extra deep cloning on gameplay checkpoints; admin exports are copied. server/dungeon-session.js abort calls one failed settlement with explicit aborted marker/abandoned items and no reward. results-view reuses the existing result dialog with accurate admin-end wording. Reset scopes and runtime/identity/default behavior documented as implementation defaults, distinct from the accepted tool list.

Verified204 tests pass (195 prior +9admin cases). Coverage includes backup-before-edit/persisted profiles, all reset scopes and counter, restore into existing connected/new identities, negative/fractional/string/unknown/valuable input and traversal/corrupt backup rejection, failed backups preventing reset/edit/abort, active run edit/restore locks, forced ending with lost loot/zero XP+gold/waiter preservation, actual HTTP capability/Origin/local host/body/method validation, real WebSocket player admin rejection + live XP update, private backup/static exclusion, real admin page DOM events wired to actual controller/SQLite/backups with confirmation cancel/restore/live edit locks/expired-key feedback, and failed admin commit preserving its before-change backup and blocking further edits. Extended actual CLI kill/restart test to assert fresh private admin key across three starts. Existing saving/rewards/rescue/solo suites pass. Standalone build, module/bundle syntax and unique IDs pass. No rendered browser visual QA or user V38 playtest claimed.

Deliverable green-team-server-admin-v38.zip contains green-team-v38, including root admin.html and updated START-HERE.txt. Stop prior server, copy its whole data folder to V38 before startup, npm ci/npm start, then open the private admin link printed in Terminal. Saves compatible with V36/V37; no new package install beyond existing npm workflow. Admin test: manual backup, seedXP/stock, watch game update, restore; force end test run and verify no rewards. Backups include personal identity keys: keep data private and copy whole data directory across updates. Source on prototype/dungeon-exploration, no merge. Further gameplay progression/group joining/public hosting remain user choices.


## V39 home entry and named lairs ready

User requested home screen with goblin/level before entering any lair, named/code-based joining or creation, and trying different lairs; perks stay inside lairs. Added server/hub-session.js wrapping the reused per-lair engine, canonical personal profiles, scoped routing, create/join/leave validation, independent group runs and correct ghost/menu reconnect paths. Engine adds private server identity attachment/binding/durable export/membership helpers, without new player bypass commands. Server default/CLI now use hub; domain-focused legacy tests explicitly inject single engines. SQL save validation supports payload2/global profile consistency and per-lair boundaries; legacy payload1 migration is backed up before commit and preserved as Original Lair. No database dependency/schema-table replacement.

index.html + src/home-view.js provide goblin art/name/displayed level/XP, join/create forms and previous-name shortcuts. src/online-main.js hides gameplay until joined, reuses goblin identity selector on both screens, suppresses menu movement/blur spam, displays name/code and home-return control, and preserves normal dungeon interactions. Display-only level uses configurable100 lifetimeXP per level from1; purchases don't delevel and no gate/token/perk mechanics added. Packed bags remain per-lair while XP/recipes/passives follow canonical profile. Build embeds the new hidden home image too, preserving self-contained solo output.

server/hub-admin.js adapts existing private admin access/backups to all-server state and selected-lair stock/reset/end. Full restore keeps newer identity/lair keys at reset progress/stock; legacy backup maps into Original Lair without changing its known code. API accepts selected group for summary and scoped commands; admin UI now selects group and shows its invite code. Edits/restores require all runs closed; abort only affects selected group. Existing per-group domain/guard/loot/UI rules and personal purchase screens reused. Account login/public hosting/member roles/code rotation remain future work.

Verified218 tests pass (204 prior +12hub/domain/network/admin cases +2home/level tests). Coverage includes initial menu/no public code list, valid/invalid/name collisions/unicode codes/cooldown, stock/sack/profile/level isolation, two concurrent group runs/rewards, late arrivals and forbidden active switching, ghost versus home restart recovery, expired participant earning old-team XP after a new-group purchase without clobbering balances, SQLite reload of names/codes/bags, backup-gated legacy migration, world-profile validation/failed commit latching, global backup/restore/newer group preservation, old JSON backup mapping and code retention, real WebSocket create/join/switch/isolation plus selected-lair HTTP admin edits, real admin page dropdown event wiring, home view form/recent/poll-preservation/level boundaries. Extended actual online entry mock DOM for home/menu movement suppression/create-to-game transition and actual CLI SIGKILL test for menu/code rejoin + spent sack preservation across three restarts. Existing204 checks retained. Standalone build/module/bundle syntax/unique IDs verified. No rendered browser or user V39 playtest claimed.

Deliverable green-team-lair-entry-v39.zip contains green-team-v39, updated START-HERE and lair-entry.md. Stop old server, copy whole data folder, npm ci/npm start. Existing old home is Original Lair; open private admin Terminal link and select it to read code, then join from home. New users create a lair and share name/code with second tab. Source on prototype/dungeon-exploration, no merge. Human test group switching/level readability/migrated code and separate economy; next gameplay/progression or public setup chosen with user.


## V40 creator re-entry ready

User noted that forgetting a code blocks the lair's creator. Corrected interpretation: invite codes are for friends; the creating goblin has remembered personal access. server/hub-session.js now records/persists ownerId, exposes only own ID/name entries to menu, validates enter-owned-lair against socket identity and allows owner name-based rejoin without code. Friend history excludes owned groups; friends retain all normal code checks and cannot spoof ownership in commands. New nullable metadata is validated by save-store; migration backs up V39 missing-owner data before first-member backfill. Explicit null never auto-assigns a later visitor. hub-admin restore preserves known ownership for old backup formats and resets retain creator IDs. No admin privileges/account-recovery mechanics introduced.

index.html/home-view.js add Your lairs selector + Enter your lair outside the friend's required-code form, reuse existing controls and preserve selection across snapshots; disable while disconnected. Server heading V40. Existing XP/level/perks/stock/sacks/run restrictions unchanged. Source docs updated; data payload2/table schema unchanged.

Verified220 tests pass (218 prior +2ownership cases). New checks include creator no-code entry by ID/name, real socket code-free return to same saved sack, restart persistence, friend/visited/forged owner rejection, reset+backup/restore retention, unknown-owner save rejection, backup-gated V39 first-member backfill and explicit unowned preservation after visits/restart. Home UI test drives dedicated owner entry and disconnected state. Standalone build, module/bundle syntax and unique IDs pass. No rendered browser or user V40 playtest claimed.

Deliverable green-team-owner-entry-v40.zip contains green-team-v40. Stop V39, copy whole data folder, npm ci/npm start, choose same goblin and enter from Your lairs without code. Creator inference is a recorded compatibility fallback for old saves; friends can still use existing codes. Source on prototype/dungeon-exploration, no merge.


## V41 game builder run settings ready

User approved saved tuning/default reset for guard speeds/vision/timing, reinforcement frequency, search times and loot amounts. Added src/tuning.js shared fifteen-field definition/strict bounded validation/defaults/run projection; src/tuning-view.js reuses admin form/status styling and preserves drafts during polling. Chance inputs show percentages. Private selected-lair HTTP commands save/reset tuning with before-change backups, even during active runs. Hub metadata persists per lair; engine captures tuning at departure; independent world copies feed shared guard/search/pressure rules. Client uses run sight values for cones and threshold for alert label. No parallel rule engine, dependency or SQL table change. Old saves/backups without tuning use defaults; invalid present settings reject. Progress resets retain tuning; explicit reset-settings reverts balance. Full restore includes settings.

V40 was user-playtested and approved. Their request to hide secondary Create lair and reorganise settings/resets is recorded for the later UI/UX pass, deliberately deferred.

Verified225 tests pass (220 prior +2hub tuning lifecycle/validation +1failed-checkpoint +2shared-rule tests). Extended real HTTP/WebSocket and admin DOM tests cover private access, per-lair form routing, percent conversion, polling draft preservation, default reset with dirty draft, live-run edit unlock and unchanged launched world. Domain checks cover actual patrol/chase/search speeds, notice/windup/cooldown/sight, generated empty/two-item loot, search durations/bonuses and reinforcement thresholds/labels. Lifecycle checks cover two concurrent lairs, active-run isolation, next departure, restart, before-change backup/restore, progress-reset retention, older missing metadata defaults, invalid saves/commands, failed backup and failed checkpoint latching. Final targeted admin/hub/rescue/tuning suite passes after matching capture approach speed to edited patrol speed and guarding admin selection refresh. Build, all source modules/standalone bundle syntax and HTML unique IDs pass. No rendered browser QA or user V41 playtest claimed.

Deliverable green-team-builder-v41.zip contains green-team-v41, START-HERE.txt and no runtime data/dependencies/Git metadata. Mac update: stop server, copy whole old data folder, npm ci/npm start, refresh. Open private Terminal admin link, select lair, tune/save and start next run. User test shorter sight/slower search/one-alert reinforcement; reset while playing and verify current run unchanged/next run default; restart retains saved edits. Source on prototype/dungeon-exploration, draft PR2 remains unmerged. Next step user playtest; sprite importing/room editing/home settings UX remain later.


## V42 dungeon generator and grid furnishing

User approved architecture settings/preview and shared tile-grid wall furnishing; V41 playtest was approved/tweaked. Added generator-settings.js, generator-view.js, dungeon-preview.js and prop-placement.js; extracted shared number-fields.js from tuning view. Added configurable room sizes, passage width/bends/connection limit and wide-loop protection to existing connected-room generator. Private admin edits/save/reset selected architecture per lair, preview keeps example number and shows floor grid/searchables/hides/cages/doors/original guards. Real Human/Dwarf/Elf map-table jobs use independent Normal/Hard. Server captures config at departure and sends to clients; active worlds stay fixed. Layout presets persist in optional payload2 metadata, old saves default, invalid present settings reject; full before-edit backup/checkpoint/restore reused.

Furniture/hiding/cages share wall/corner placement, integer tile anchors/footprints, reserved inside doorway lanes and approach points. Cage jailers face inward and guard-door spawn points stay clear. Existing continuous movement/floor collision retained. Larger future prop footprints supported, current art unchanged. Search/hiding/rescue event fixtures updated to approach actual generated wall props rather than old spawn-relative coordinates; prior transaction/hold/combat tests retained. Detailed scope/defaults/limits in dungeon-builder.md.

Verified232 tests pass (225 prior +5generator/placement/preview domain cases +2hub generator lifecycle/validation). Domain sweep covers90 seeded Human/Dwarf/Elf layouts, floor connectivity/bounds, tile-aligned wall props, footprint non-overlap, reserved lanes, reachable approaches, normal/hard preview-versus-run equality, extreme/crowded settings, two-tile future-prop fixtures and invalid parameters. Existing real HTTP/WebSocket tests extended for private generator save and per-lair isolation; admin DOM event test drives architecture selection, same-number width preview, draft-preserving polling, save/reset and active-run editing. Hub tests verify map-table architecture/difficulty selection, launch capture, active-run isolation, next departure, restart, before-edit backup/restore, invalid/forged inputs and backup failure. Older transaction/search/hide/rescue/reconnect/economy suites pass after updating only old position assumptions. Standalone build, source/bundle syntax and unique HTML IDs pass.

Rendered browser QA was attempted using available Playwright, but Chromium executable is absent. No rendered QA or user V42 playtest claimed. Functional canvas drawing, DOM wiring, network and actual generator behavior are verified automatically. Default preview timings locally were approximately16–36ms; not a client performance guarantee.

Deliverable green-team-dungeon-builder-v42.zip contains green-team-v42, START-HERE.txt and source/docs, excluding runtime data, dependencies and Git metadata. Mac: stop old server, copy entire old data folder, npm ci/npm start, refresh. Private admin → select lair → architecture controls/preview/save; in-game map table selects Human/Dwarf/Elf and independent difficulty. Human test wall prop usability, preview legibility and architecture feel; presets/room density remain tunable. Source on prototype/dungeon-exploration, draft PR2 remains unmerged. Sprite imports/manual room painting/home settings UI remain later.


## V43 settings export ready

User asked for Export settings to pass tuned values back for permanent GitHub defaults. Added src/settings-export.js projecting/validating saved tuning and all three architecture sets from a fresh private admin summary into version1 JSON; lair name/version/timestamp are the only context. Browser Blob download uses safe filename and removes/revokes the temporary link. Admin button explains save-first/unsaved exclusion; available during runs and disabled without a selected lair/access or while busy. No server mutation/route/schema/dependency changes, keys or economy in exported file, or automatic GitHub publishing.

Verified30 targeted tests pass (admin + hub + settings-export), including two new export tests and extended real admin form event flow. Checks cover exact tuned values/all architectures, strict validation/no-selected-lair, explicit omission of private keys/IDs/backups/economy, JSON Blob/filename/link cleanup, selected-lair routing, fresh read-only GET with no command mutation, export during an active run and saved-versus-unsaved form values. Existing full232-test gameplay result is V42; no gameplay changed in this slice. Source syntax, standalone build/bundle syntax and unique HTML IDs pass. No rendered browser QA claimed; Chromium remains unavailable.

Deliverable green-team-settings-export-v43.zip contains green-team-v43 + START-HERE, excludes runtime data/dependencies/Git metadata. Update: stop server, copy whole old data folder, npm ci/npm start, refresh; save both builder sections then Export settings near top of private admin. Attach JSON in chat for default promotion. Source on prototype/dungeon-exploration, PR2 unmerged; export does not push GitHub itself. No pending export values supplied by user yet.


## Moss export promoted to code defaults

User attached green-team-settings-moss.json and confirmed V43 works. Validated export format/version via existing tuning/generator validators; gameplay values unchanged, only Human architecture differs. Updated all three full explicit GENERATOR_PRESETS to match supplied export exactly; Dwarf/Elf no longer inherit Human fields implicitly. Human50×40/request15/minW5/maxW8/minH5/maxH8/loops6/furniture4; remaining fields unchanged. Existing Moss already has these settings, so no install/data migration needed. New groups/default reset and standalone generation use promoted values. Refreshed standalone play.html. Existing server groups retain saved overrides.

Updated two test position assumptions: deterministic layout comparison reads launched config; long solo event test walks to the new default wall chest and generates guard/hide routes with the architecture config. No gameplay assertions removed. Verified234 tests pass, including all architecture/grid/preview, real network/admin/export, saving/rewards and solo event flows. Validated exact equality of every code tuning/generator default against the supplied export. Standalone build and bundle syntax pass. No new rendered browser QA claimed. Source committed on prototype/dungeon-exploration; draft PR2 remains unmerged. Next recommendation is Proplet art integration, beginning with floor/wall tile-sheet image plus its JSON metadata supplied by user. No art feature started without those files.


## V45 Human Proplet terrain integrated

User supplied GreenTeam-tileset.png/json and confirmed corner/mirror reuse. Copied originals unchanged to assets/human. Added terrain-art.js for validated Proplet frames, one-time asset loading, floor-facing tile selection and local mirrored draws. Existing render.js chooses this atlas only for Human Manor; placeholders retained elsewhere and on load failure. Server static whitelist/content types extended for the two exact files; standalone builder embeds PNG+JSON data URLs. No geometry/collision/save/tuning changes; approved Moss defaults retained. Existing solo/online entry tests now supply real metadata and image dimensions to their DOM fixtures. New renderer/domain/network tests cover asset interpretation and runtime selection. Detailed mapping/fallback/build workflow in terrain-art.md.

Verified240 tests pass (234 prior +6terrain domain/loader/renderer cases). Coverage includes actual Proplet frame coordinates/second row/spacing/padding, invalid frames/tags/count, top/right mirror and bottom reuse,40 generated layouts without collision changes, mirrored Canvas transforms, one-time loading/failure fallback, actual renderer Human-only/lair/Dwarf separation, and real HTTP PNG byte equality/JSON MIME. Existing online/solo interactions load the actual manifest. Standalone PNG/JSON data URLs decode byte-for-byte to originals; source copies match uploads unchanged. All source/bundle syntax and HTML unique IDs pass.

Rendered and visually inspected actual Human and Dwarf game scenes using Native Canvas, with real source PNGs decoded before drawing. Human floors/walls/mirrored corners and furniture grid look coherent; Dwarf retains placeholders. This is real renderer output, not a browser automation claim; Chromium remains unavailable. No user V45 playtest yet.

Deliverable green-team-human-art-v45.zip contains green-team-v45 and both original assets, excludes runtime data/dependencies/Git metadata. Mac: stop server, copy whole data folder from V43 or previous version, npm ci/npm start, refresh, select Human Manor at map table and depart. Offline play.html includes the art too. No save migration. Source on prototype/dungeon-exploration, draft PR2 remains unmerged. Next user playtests wall joins/art readability; general art import UI/other cultures remain later.


## V46 wall joins corrected

User screenshot shows broken side walls at corridor openings and misplaced diagonal inside corners. Reproduced seed2828433373 with the real Human renderer. Root causes: V45 selected transparent bottom cap instead of supporting side tile at north+side openings, and used outside-corner art for south+side inside joins. Shared terrainTile now reserves diagonal corners for outside cases; terrainLayers composes side support under cap, vertical trim over front faces, and mirrored halves for two-sided walls. Source PNG/JSON, generation, collision, saves and Moss defaults unchanged. Updated game header/version in solo/online, removed stale hardcoded V30 title replacement.

Verified243 tests pass (240 prior +3join regressions): both opening directions, all16cardinal neighbour masks with valid crops/support, and actual screenshot seed with unchanged floor data. Existing outer-corner/reuse, source frame/load/fallback, renderer culture split, HTTP, gameplay, save/admin/export and solo/online event tests pass. Native Canvas actual-PNG alpha checks show all14side/top masks fully supported, bottom-only rim remains8px tall. Native before/after real renderer images of seed2828433373 visually confirm closed corridor-mouth gaps and square inside joints. No rendered browser automation claimed. Build, source/bundle syntax and unique IDs verified; source assets remain byte-identical to uploads.

Deliverables: green-team-wall-joins-v46.html single-player preview and green-team-wall-joins-v46.zip full green-team-v46 folder. User prefers single preview here, so link it first. Full update retains old whole data folder; no migration. Source on prototype/dungeon-exploration, PR2 unmerged. Next user checks wall joins in motion; no new art required for this fix.


## V47 visual torches ready

User approved V46 wall fix, deferred custom inside-corner tiles, then approved the proposed visual-only torch pass. Added lighting.js and PROP_RULES.torch; renderer derives deterministic wall anchors from static room props, caches occlusion polygons per world and applies ambient mask/radial warm tint/flicker after world actors. Wall rays stop inside their first blocking tile. Torch sprites render behind props; rescue UI draws afterward; lair/HUD/minimap keep previous rendering. All dungeon types supported, no AI/server/save/economy/layout/collision change. New code uses Canvas only and builds into standalone without runtime dependencies. Constants kept in one module; builder/export lighting controls not added in this scope.

Verified247 full tests pass (243 prior +4lighting cases), including45seeded architecture/torch placement/immutability/guard-sight cases, wall versus open-door ray paths, bounded gentle flicker, lair skip, static scene/mask reuse and Canvas composite restoration. Existing scene, real network, solo/online event, saves/rewards/admin/export and art/wall tests pass. After centralising the torch rule in PROP_RULES, final9lighting/generator tests pass. Source/bundle syntax, unique HTML IDs, standalone lighting inclusion and unchanged embedded Human assets verified.

Rendered/visually inspected actual Human and Dwarf scenes via Native Canvas, including dark corridors, warm wall pools and wall clipping; no browser automation claimed. No user V47 playtest yet. Client derives visual torch positions only; no backend/server runtime dependency or network load added.

Deliverables green-team-torches-v47.html (single-player first) and green-team-torches-v47.zip (green-team-v47). Full update keeps old whole data folder; no migration. Source on prototype/dungeon-exploration; PR2 remains unmerged. Next user judges brightness, flicker, wall mounts and navigation readability. Dedicated inside-corner art and any guard/darkness interaction remain deferred.


## V48 — solid furniture ready

User approved V47 then requested solid searchables, no hallway blockage, back-wall cupboards and chest/crate art within32×32 source floor tiles. world.js separates movement solidTiles from floor geometry; shared canStand/moveActor and navigation BFS now avoid registered furniture. Search generation resets/rebuilds deterministic masks; online client registers authoritative snapshot footprints; solo creates furniture before guard route caches. Full carved corridor footprints (including widened loops) join reserved doorway lanes. Shared placement rejects candidates that disconnect walkable floor, including tiny corner pockets discovered by the new connectivity check. Cupboards require a top/back wall; no fallback to side walls. Compact art/open lids/shadows fit one floor cell at existing display scale. Loot spills at each accessible approach rather than inside furniture. Searchables remain solid after searching. Guard sight/light occlusion remains floor-wall based. No hiding/cage collision rule added.

Verified249 full tests pass. Expanded generator checks cover90layouts across all cultures, full walkable connectivity with solids, corridor exclusion, cupboard top walls, reachable approaches/cages/hides and legal guard spawns/patrol/roamer paths. New movement/knockback/guard-route and closed/open art-bounds tests pass. Search100-map fixtures now stand at legal approaches and confirm solid centres and reachable spills. Existing actual network, solo/online UI events, saving, rewards, rescue, pressure, builder/export and terrain/lighting tests pass. Built standalone and checked source/bundle syntax. Visually inspected actual Human/Dwarf game output via Native Canvas; no browser automation claimed.

Deliverables: green-team-solid-furniture-v48.html (solo preview first), green-team-solid-furniture-v48.zip (green-team-v48 full source/server). Keep previous whole data folder for server update; no new dependency/save migration. Source on prototype/dungeon-exploration, draft PR2 stays unmerged. Next user checks furniture movement, loot collection and room readability in play.


## V49 — solid hiding barrels and scenery grid rule

User requested hiding spots also be solid and grid-aligned, with all future dungeon decor/placed scenery following the grid. Shared PROP_RULES now declares solid searchables/hides and explicit non-solid cage/torch exceptions; new rules default to connectivity validation. createHidingSpots rebuilds the combined searchable/barrel movement mask deterministically. Solo/server now create hides before guards so cached routes avoid them, matching preview. Online reconstructs identical solids from both public object lists. Barrel body/shadow now fits one32px source floor tile at existing display scale; occupancy indicator/text remains UI above it. Half-second entry deliberately places a hidden actor inside the solid barrel; E exit/witness exposure/disconnect returns to its saved outside position. Existing movement suppression while hidden retained. All future static dungeon scenery uses declared whole-tile footprints/shared placement; larger art uses multiple tiles. Working process and builder/decision docs record this required convention for both AI tools. No new cage solidity or actor/loose-loot snapping.

Verified251 full tests pass. Combined 90-map culture checks cover solid barrels, corridor exclusion, complete walkable connectivity, accessible object/hide/cage approaches and valid guard paths.100-map hiding generation checks now expect solid centres/reachable approaches and deterministic recreation. New body bounds and blocked-walking/deliberate-entry/safe-exit checks pass; witness pull-out fixtures now use real solid barrel masks. Updated solo event fixture walks to approach instead of attempting a path into the solid centre, retaining all hide/cancel/exit assertions. Real network occupancy/reconnect, rescue, traps, saves, admin, economy and lighting/art tests pass. Built standalone and checked source/bundle syntax. Rendered and inspected Human scene through Native Canvas; no browser automation claim.

Deliverables green-team-grid-furniture-v49.html and green-team-grid-furniture-v49.zip (green-team-v49). Keep previous whole data folder for full server updates; no dependency/save migration. Source on prototype/dungeon-exploration, PR2 remains unmerged. Next user tests moving around barrels, entering/leaving and readability.


## V50 — grounded drawing order and smoother corners

User accepted the proposed front/behind drawing order and requested reduced wall/corner grabbing. render.js now builds a stable grounded scene queue for searchables/hides/loot/guards/goblins. Props sort by footprint front edge, actors/loot by floor position, independently of hop/spill animation. Cage backs/bars bracket the captive centre rather than all bars drawing over every foreground actor. Search/hide/guard drawing helpers expose body/UI passes while retaining default combined drawing for existing callers. Interaction/status overlays and player names draw above lighting/world; smoke remains an overlay before lighting. Terrain, reinforcement doors, torches and lair station layers remain existing layers. This is a dungeon furniture/actor pass, not general wall occlusion or lair station depth integration.

world.js replaces per-axis rejection with small-step circle/tile contact projection that preserves tangent motion around convex wall/furniture corners. Iterative contacts, bounded travel and a final canStand check retain solid geometry and speed limits; tight conflicting contacts keep legal axis motion. Radius, movement speed, controls and navigation grid remain unchanged. Shared moveActor handles solo/server walking and knockback; guard pathfollowing remains existing centred-grid navigation. No teleport/auto-path assistance.

Verified256 full tests pass. New tests cover all4corner directions, walls versus props, brushing offsets, flat walls, concave stops, one-cell doorway entry,30/60/120Hz movement and10,000random mixed contacts without illegal penetration or extra travel. Real renderer test covers goblins/guards/props/teammates, hop-independent ordering, UI above bodies and cage captive/front-actor order. Existing whole-game UI flows, real sockets, rescue/capture/reconnect, solid placement, saves/admin/export and lighting/art pass. Standalone built and all source/bundle syntax checked. Actual Human/Dwarf scenes rendered through Native Canvas; Human and paired behind/front cupboard views visually inspected. Browser feel still needs user playtest; no browser automation claim.

Deliverables green-team-smoother-movement-v50.html and green-team-smoother-movement-v50.zip (green-team-v50). Keep previous whole data folder; no dependency/save migration. Source on prototype/dungeon-exploration; PR2 remains unmerged. Next user tests brushing corners/doorways while chased and front/behind readability.


## V51 — red guard vision cones

User requested reddish cones to separate guard sight from yellow torches. Updated the shared guard-view fill colours to muted red (#ed707b24) and stronger suspicious red (#ef596640). No gameplay/shape/occlusion/state rule changed. Rebuilt standalone, updated release labels and docs.24 relevant guard/lighting/actual-renderer tests pass; source and bundle syntax valid. Actual Human scene rendered and visually inspected with Native Canvas: red cones distinct from warm yellow torch pools. No new test added for this reversible colour edit; no browser automation claim.

Deliverables green-team-red-vision-v51.html and green-team-red-vision-v51.zip (green-team-v51); previous whole data folder retained for server updates, no migration/dependency change. Source on prototype/dungeon-exploration, PR2 unmerged. Next user judges tint/readability.
