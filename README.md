# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

A playable local loop now includes a small lair, stash, crafting, dungeon runs, searchable furniture, a sack, guards and return-to-tunnel escapes. The local server now supports a shared multiplayer dungeon test. Named persistent lairs are implemented; public hosting, account login and player limits remain future work.




## Where things are

- `src/`, `server/`, `index.html`: the game source. `npm start` runs the multiplayer server; `npm test` runs the checks.
- `docs/`: the public GitHub Pages website (title page, `game.html` solo game, workshop, trials) plus design notes. The website pages are generated; do not edit them by hand.
- `pages-src/`, `workshop/`: sources for the website's title/creator pages and the workshop.
- `build/`: temporary build output (ignored by Git).

## Static website / GitHub Pages release

Run `npm run build:pages` to regenerate the website in `docs/`, then commit it. GitHub Pages serves **main → /docs**. See `pages-src/PUBLISHING.md`. Multiplayer still needs the separate server. Normal solo progress saves in the browser; workshop projects are exported separately.

## Dining and storage room layout trial

The local workshop now arranges longer dining tables and benches, and storage shelf rows with walking aisles. Use `green-team-workshop-room-layouts.html` → Playtest → Room to try → Dining hall/Storage room → Try room type. The source/template kit includes direct trials and the full game. Existing searchable counts and loot rules are retained; compact rooms fall back safely. 462 automated checks pass; physical phone playtesting remains pending.

## Compact lair station and map pass · V97

Campfire, workbench and potion station now match the tidier stash treatment: smaller inset paper windows with the lair visible, centred titles,44pxtop-left X and no footer toolbar. The established compact grids/placeholders, active-slot count, recipe costs, hold-to-unlock/build and tap-to-activate/craft/brew remain. Removed recipe i controls; short important item limits are visible with the selected effect. Action feedback stays beside the action rather than in a footer. Escape closes with normal hold cleanup.

Map planning now fits its contents, with centred title/top-left X, destination cards, common finds, difficulty and one E/Set route action. The difficulty tradeoff is directly visible; the saved destination has a small tick and accessible current-route label. Removed info/duplicate status/footer controls. Changing a draft still does not commit until Set route; closing discards the draft. Shared route authority and departure rules are unchanged. Departure and dungeon UIs are unchanged.

Use green-team-compact-lair-v97.html or green-team-compact-lair-v97.zip (folder green-team-v97). Preserve the whole data folder, npm ci/start:lan and refresh old tabs. V96 remains fallback. Actual browser/physical-phone playtesting remains deferred.

## Tighter, automatically sorted stash · V96

Stash paper now fits its contents rather than filling a tall window: smaller desktop/phone widths, no bottom tool row, no i button, centred Lair stash title and top-left X. Escape/Tab still closes it. Grids and the packing action remain, with the lair visible around the window.

Shared supplies display alphabetically by item name automatically. No manual Arrange control or R arrangement mode in the player stash. Display sorting preserves authoritative shared stock/save positions and amounts; selections follow their item when stock changes. Packing a stack's last copy clears the selection so the next press cannot take another type accidentally. Packing quantities, shared transfers, phone pages, WASD crossing and actual fit previews are unchanged.

Use green-team-tidy-stash-v96.html or green-team-tidy-stash-v96.zip (folder green-team-v96). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V95 remains fallback. Actual browser/physical-phone playtesting remains deferred.

## Packing-first lair stash · V95

The approved stash preview is now in the game: an inset paper panel with the lair visible around it, vertically centred stash/sack grids and one selected-item name/effect/action strip. Removed visible storage headings/counters and unrelated currency; accessibility labels still distinguish shared stock and your sack. Item counts remain on shared stacks. Selecting does not transfer; E or the action packs1, returns the selected whole stack (Return×N), or removes a debug test item. Arrange is secondary in the footer; details remain optional.

WASD crosses directly between grids: D at the stash's visible right edge enters the sack, A at the sack's left edge returns. The closest facing row is based on actual screen positions. Phone navigation respects the visible3x3stash page, and crossing back keeps that page. Q remains an optional shortcut. Only the active grid shows a selection. A dashed sack destination uses actual shape/rotation/stack packing rules without spending stock. Non-fitting items show Won’t fit; server confirmation still owns shared transfers. Real36-slot storage capacity and personal3x3sack, save format and economy are unchanged.

Use green-team-packing-stash-v95.html or green-team-packing-stash-v95.zip (folder green-team-v95). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V94 remains fallback. Actual browser/physical-phone playtesting remains deferred.

## Matching station panels and filling grids · V94

Workbench, potion station and campfire now share the campfire's panel proportions. Workbench details use the same right-panel space; campfire icons use the compact workbench slot sizes. Both left panels fill available rows/columns with faint reserved slots, rather than stopping at a fixed12-cell layout. Real recipes/abilities stay first; placeholders are decorative and cannot spend anything. Layout responds to the actual panel dimensions, using64px cells normally,48px on compact screens and44px on narrow screens. WASD uses the measured column count and skips placeholders. Right details scroll independently when needed.

Use green-team-matching-grids-v94.html or green-team-matching-grids-v94.zip (folder green-team-v94). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V93 remains fallback. Actual browser/physical-phone playtesting remains deferred.

## Compact workbench and brewing · V93

Workbench and potion station now use compact sprite grids, lock overlays and faint reserved slots for future recipes. Workbench has6real+6placeholder slots; potions has3real+9placeholders. Names/effects stay with the selected item on the right. Ingredients show available/required counts and a missing marker, rather than repeated Have text. XP is prominent; unrelated gold is hidden except when relevant to building or the stash.

One action changes with the state: hold E (or hold the action on phone) for1second to unlock a recipe or build the potion station; a separate tap/E crafts or brews. Cancelling, changing recipe, opening help, closing or leaving the tab aborts an incomplete hold. Hold release never crafts automatically. WASD selects actual recipes and skips reserved slots. Touch targets stay at least44px; compact landscape layout and independently scrolling content preserve access on smaller screens. The item still gets the small existing success animation. Crafting destinations remain the sack first, shared stash if the sack is full; all recipe costs, stock and multiplayer rules remain unchanged.

Use green-team-compact-stations-v93.html or green-team-compact-stations-v93.zip (folder green-team-v93). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V92 remains fallback. Actual browser/physical-phone playtesting remains deferred.

## In-world cart cargo · V92

Dungeon cargo now opens in a small scene-anchored speech bubble above the cart, or beside it when a short screen has no space above. Your sack appears separately on the right. No fullscreen paper menu or dim backdrop. E opens cargo; hold E for one second at the cart to hop in (phone: hold E or the Hop in control). Tap E to hop out. In the sack, WASD selects and E/Deposit puts the selected item away. Q switches grid focus; cargo is inspection only. Escape/Tab, × or a click in the dungeon closes it; closing while aboard hops out and cancels departure readiness.

The6x6 cargo hold is shared by everyone. Deposits are one-way for all players, enforced by shared/server rules; retrieval commands are rejected. Full holds leave rejected items in their sack, and run keys stay in sacks. Cargo remains unbanked until the team escapes, with the existing three-second all-standing-players boarding countdown. Guards and time continue while browsing. Keyboard movement navigates focused grids; close the bubble to resume moving. Phone cargo uses existing3x3 pages. Costs, abilities and chase rules are unchanged.

Use green-team-cart-bubble-v92.html or green-team-cart-bubble-v92.zip (folder green-team-v92). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V91 remains the fallback. Browser/physical phone playtesting remains deferred.

## Last-seen pursuit · V91

After losing sight, guards keep running to the fixed last position where they saw the goblin. Only after reaching it do they use the existing bounded hidden tracking route at search speed, then search nearby and return. Seeing a goblin again immediately resumes direct chase. There are no visible footprints or new trail graphics. The rule is shared by solo and server guards; unreachable remembered positions cannot strand guards forever. Sleep, berry distraction, bells, target changes and routine resets clear the pending approach.

Use green-team-guard-pursuit-v91.html or green-team-guard-pursuit-v91.zip (folder green-team-v91). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V90 remains the fallback. Browser/phone playtesting remains deferred.

## Campfire UI and safe unlocks · V90

Campfire slots now show only ability sprites and active ticks; the selected name/effect/limits stay on the right. A centered, filling E keycap accompanies Hold to unlock, Activate or Deactivate. Hold E (or Enter/Space) for one second to spend XP; phone/mouse players hold the ability icon. Releasing early, changing selection, cancelling touch, closing the panel or leaving the tab cancels the purchase. Unlocking never also equips the ability. Unlocked abilities still toggle with a tap or E, with the existing three-active limit. XP is emphasized at the top, the active count is larger and centered, and bottom instructions are removed.

Use green-team-campfire-ui-v90.html or green-team-campfire-ui-v90.zip (folder green-team-v90). Preserve your whole data folder, run npm ci/start:lan and refresh old tabs. V89 remains the fallback. Physical phone/browser playtesting remains deferred.

## Chase and awareness abilities · V89

Three more personal campfire passives, using the same icon grid, WASD/E and three-active limit:
- Panic Sprint (50 XP): +20% movement for 3 seconds when a guard fully notices you; 20-second cooldown, no stacking or refresh during chase.
- Hideout Sense (50 XP): nearest guard shown as an amber square on your own map while fully hidden; disappears on exit or downing.
- Fade Away (75 XP): completed searches, including empty containers, make initial guard detection take twice as long for 3 seconds. Existing chases continue normally.

Costs and strengths are trial values. HASTE/VEIL timers appear in the existing HUD. Effects are shared between solo and the authoritative multiplayer server; selections persist personally. Use green-team-awareness-v89.html or green-team-awareness-v89.zip (folder green-team-v89). Preserve the whole data folder, run npm ci/start:lan and refresh old tabs. V88 remains the fallback. Browser/phone playtesting remains deferred.

## Raid cart and shared cargo · V88

Each dungeon starts in a small minecart room off one hallway. E at the cart opens the shared6x6 hold beside your sack. Historical V88 flow (superseded by V92): select an item and Deposit/Retrieve (or WASD/E, Q switches grids); phone cargo pages show3x3 at a time. Real item shapes and stacks use finite space. Treasure keys stay in sacks.

Board to leave is separate from unloading. Everyone still standing and connected boards for a3second countdown; Hop out or Continue raid cancels your seat. Deposited cargo only banks when the team escapes. Full wipes, aborted runs and interrupted restarts lose it. Returning loot/gold/XP includes cargo exactly once. Guards/time continue while the cart panel is open. Phone/browser playtesting remains deferred.

Use green-team-raid-cart-v88.html for solo or green-team-raid-cart-v88.zip for multiplayer. Preserve your whole data folder, npm ci/start:lan and refresh old tabs. V87 remains the fallback.

## Campfire passives · V87

Campfire now has an ability icon grid with details on the right. WASD selects; E/tap unlocks, then activates/deactivates that slot. Active slots have a green border and tick. Three abilities may be active per goblin; selections persist personally. Quick Fingers30XP gives the existing+10% search speed; Quiet Hands75XP lets container searches preserve Vanish; Lucky Goblin50XP adds5percentage points to gold finding, stacking with Lucky potion for10. New unlocks need a second press to activate. Old Quick Fingers purchases remain active when migrated.

Packed Lunch is now crafted at the workbench with the same meat/berries cost. Costs are trial values; phone/browser playtesting remains deferred. Use green-team-passives-v87.html for solo or green-team-passives-v87.zip for multiplayer. Preserve the whole data folder, npm ci/start:lan and refresh old tabs. V86 remains the fallback.

## Quiet item feedback · V86

Crafting and stash transfers now pulse only the item icon with a brief highlight and small grow/settle animation. The whole station window stays still. Reduced motion uses brightness only. Existing sounds and server-confirmed success rules remain intact.

Use green-team-icon-feedback-v86.html for solo or green-team-icon-feedback-v86.zip for multiplayer. Preserve your whole data folder, npm ci/start:lan and refresh old tabs. V85 remains the fallback.

## Stable sprite pixels · V85

Fixes uneven goblin pixels during walking/turning by drawing at higher resolution before display. The existing sprite, apparent size and movement stay the same; pointer targeting and aim bounds use shared logical scene dimensions. Native pixel checks cover both facings, walking and landscape-sized viewports. Physical phone playtesting remains deferred.

Use green-team-sprite-fix-v85.html for solo or green-team-sprite-fix-v85.zip for multiplayer. Preserve the whole data folder, npm ci/start:lan and refresh old tabs. V84 remains the fallback.

## Visual run-end book · V84

Run results now match the parchment screens: prominent gold and XP, grouped loot sprites with quantities, tap for item name/value, and one Return to lair action. Info reveals full haul/loss details, run time and XP balance. Downed and left-behind goblins see personal lost items separately from team rewards. Compact landscape layouts keep the action visible; physical phone testing remains deferred.

Use green-team-results-v84.html for solo or green-team-results-v84.zip for multiplayer. Preserve your whole data folder, run npm ci/start:lan and refresh old tabs. V83 remains the fallback.

## Routes and departure · V83

Approved map/departure previews are integrated. Choose an illustrated destination and Normal/Hard, inspect common resource sprites, then Set route. The sack appears only at Departure as its actual grid. Open the minecart to see the shared route, participant portraits, readiness and Board→Hop out. The existing all-aboard three-second countdown remains authoritative; Hop out cancels it. Lair/Escape closes the panel without changing your seat; use Hop out to cancel readiness. Compact landscape layouts keep actions outside the scrolling content; physical phone testing remains deferred.

Use green-team-routes-v83.html for solo or green-team-routes-v83.zip for multiplayer. Preserve the whole data folder when updating, run npm ci/start:lan and refresh old tabs. V82 remains the fallback.

## Visual lair book screens · V82

Approved book-style UI is now applied to the potion station, workbench, campfire and stash. Sprite-led recipes use one primary action: Build→Unlock→Brew, Unlock→Craft, Cook, or a permanent Owned stamp. Tap info for full details. Select stash or sack items, then use the shared Pack/Return control; E still transfers, Q switches grids, R moves a whole stash stack. Mouse hover reveals names without changing the selected target.

Costs, saves and multiplayer rules remain intact. Use green-team-book-ui-v82.html for solo or green-team-book-ui-v82.zip for multiplayer. V81 downloads remain the fallback. Preserve your whole data folder when updating, run npm ci/start:lan and refresh old tabs.

## V81 — Lucky potion

Agreed behaviour: drink Lucky for +5percentage points chance of finding gold coins in your own completed searches for the remainder of this run, one active dose per goblin, no stacking. Actual searching goblin owns the bonus; coins spill into ordinary shared floor loot and contribute normally to the shared haul/personal team XP if recovered. Does not change silver/copper, sale prices or other loot. Damage, searching, successful gear use and down/revive preserve luck; a new run/home vitality reset removes it. Drinking Lucky breaks concealment; later disguise/Vanish may coexist with luck.

Trial recipe:50personal XP, brew1berries+1scrap at the built shared potion station. Recipe persists on goblin, stock on lair, old saves default0new stock. Equip chosen bottle, move, Space/phone Use drinks once. Duplicate doses retain the spare bottle. Shared registry distinguishes run effects from timed concealment; search/gear interruption only clears concealment. Boolean effect appears in authoritative player snapshots and separate LUCKY badge. Guide, recipe/brew cards and tagged free test bottles use existing systems.

Implementation: original container generation/RNG and ordinary searches unchanged. Compute original whole-container probability p of at least one gold coin from empty/count/material/rare/pool probabilities, including depth, tuning and Hard rare bonus. Treasure containers replace normal contents, so p=0there. Only gold-free lucky completions get an independent deterministic coin roll at min(1,.05/(1-p)), giving overall min(1,p+.05). Existing coin searches gain no extra. Success appends one coin, preserving resources, keys and prizes; empty containers may become one item and two-item containers may become three. This is an explicit extra-coin search effect, not a valuable replacement. Roll hashes run seed/container ID separately from original RNG; cancellation, swapping searcher and retries cannot reroll. Only completed server/solo search applies it, with shared searched flag/claim preventing duplicate loot. No client effect/odds/contents fields accepted.

Use green-team-lucky-v81.html for solo or green-team-lucky-v81.zip for multiplayer. Preserve the whole data folder when updating.

## V80 — Vanish potion

Agreed slice: add Vanish first at the potion station; invisibility ends on a hit and has a short maximum duration. Implementation trial values: 8seconds, 75personal XP recipe, 2mushrooms+1cloth per brew. Searching and successful gear use end it too, as stated in the readback. Equip from Sack, move freely, Space/phone Use drinks the exact selected bottle once. Repeated/forged requests cannot spend spares; cannot refresh or stack with disguise. No passive free stock or starter unlock. Lucky potion deferred.

Vanish blocks close/far guard sight and new trails, while existing searches, last-seen positions and already committed directional swings continue. Taking an accepted hit removes Vanish and does normal damage; rejected/invulnerable hits do not remove it. Expiry restores normal sight and downing clears it. Teammates remain independently visible. Translucent goblin sprite remains readable to players, with VANISH countdown in the existing concealment HUD.

Shared POTIONS registry and equipPotion/drinkPotion paths reuse reserved potionId, timing, interruption hooks and placeholder potionDrink sound. Legacy disguise APIs/command remain strict. Authoritative drink-potion derives type/duration from the owned bottle; no client supplied effect/duration. Shared snapshots include vanishLeft. Save registry/defaults preserve existing data, new stock defaults0; learned recipe persists in personal profile. Both potions require the built shared station for brewing. Guide, XP purchase, brew card and tagged non-bankable test supplies included.

Use green-team-vanish-v80.html for solo or green-team-vanish-v80.zip for multiplayer. Preserve the whole data folder when updating.

## V79 — shared potion station and mushrooms

Potion brewing moves from the workbench to a separate lair station. Build it once for 30 shared gold (initial trial price); everyone in that lair benefits. Guard disguise retains its 50 personal XP recipe unlock and now brews with 1 mushroom + 1 berries. Existing learned recipes and stocked potions remain usable. The planned station occupies a solid one-tile worksite by the right wall, using shared prop placement, a reachable approach and grounded scene ordering. No new collision appears during construction.

Mushrooms are one-square shared materials, available in cupboards/crates on every named map. Manor/Hold add weight1; Sanctuary uses berries4/mushroom4/cloth1/scrap1/meat1 and advertises both common ingredients. Chests remain scrap/cloth; item-count/empty/valuable rolls are unchanged. New resources start at zero. Old saves default to an unbuilt station; solo saves, server checkpoints, snapshots and backups preserve the shared building. Domain and server checks reject brewing before building, workbench brewing, remote building, insufficient gold and duplicate builds without spending extra stock.

Use green-team-potion-station-v79.html for solo or green-team-potion-station-v79.zip for multiplayer. Preserve the whole data folder when updating.

## Throwable berries · V78

Select berries in Sack and E equips the chosen portion. Walk into position, Space/phone Use aims, then press again to throw. Esc/Cancel returns to walking with the same berry equipped. Throwing spends that portion, including misses, and breaks disguise. Fresh presses are required; held input cannot throw spare portions.

A short4tile projectile blinds the first guard hit for1second and breaks its chase/attack/hiding knowledge. A blind guard briefly stops, cannot see or strike, then returns to normal observation/routine; use the second to reach cover. Repeated hits do not extend an active blind. Walls, solid props and locked gates stop berries. Sleeping guards stay asleep, snare timers remain independent, and blind carriers pause without dropping/reviving captives. Existing alert totals are not refunded, and blindness itself adds no alert. Solo and server share swept collision with sleep darts.

Berries still bank and cook into lunch as before. Throw them to escape or save them for food; there is no recipe/XP unlock for throwing. Gear guide includes both uses. Free tagged test berries are in Test supplies; unused test portions never add real cooking stock. Berry throw/hit sounds remain replaceable placeholders. All342tests pass; phone aim/audio feel remains for user playtesting.

Use green-team-berry-throw-v78.zip or green-team-berry-throw-v78.html. Preserve whole data folder, npm ci/start:lan and refresh old tabs. Map resource biases and food/cooking stay intact.

## Map resource biases · V77

The map table now shows Common finds. Human Manor favours meat/cloth, Dwarf Hold favours scrap/meat, and Elf Sanctuary favours berries. All four basic resources remain available on every map; chests still contain scrap/cloth as their resources. Empty, resource/valuable, rare-item and item-count chances stay the same. Start a new run to use the new weights; existing rolled contents stay intact.

Resource weights and Common finds live together in src/resource-profiles.js, with generic resource/container entries for future content. Add ingredients and profile weights without new loot/UI branches. See docs/resource-profiles.md for exact weights, fallback behaviour, save compatibility and extension steps. No placeholder mushrooms or upload editor added.

Use green-team-map-resources-v77.zip or green-team-map-resources-v77.html. Keep whole data folder, npm ci/start:lan and refresh old tabs. Existing lair stock, recipes and tuning stay intact.

## Meat, berries and campfire cooking · V76

Find meat and berries by searching cupboards and crates. Each portion takes one sack square, uses the existing drop/share/pickup controls, and banks into shared lair stock when recovered. Food is a crafting resource, not instant healing or sale gold/XP. Chests keep their previous resource pool.

At the campfire, Cook Packed Lunch uses1meat+1berries, known from the start with no XP/gold cost. The lunch packs into your sack first, overflowing to shared stock when full. Other gear stays at the workbench; gear guide and Team rescue costs now include food. The existing revive remains hold E2seconds near a downed teammate, consuming one lunch to restore one health. Two players cannot cook from the same last pair of ingredients.

Food uses one-third of cupboard/crate material results, split equally between meat/berries, with the remaining two-thirds split scrap/cloth. Empty, valuables, rare-item and two-item chances are unchanged. This material split is a first-playtest value; it reduces the scrap/cloth share in those two container types. Saved tuning keeps its values and old saves gain zero food, preserving prior stock/progress. No mushrooms, berry ability, spoilage or new starter grants.

Use green-team-food-and-cooking-v76.zip or green-team-food-and-cooking-v76.html. Preserve whole data folder; npm ci/start:lan, refresh old tabs and start a new run to find food. Phone layout still needs user playtesting.

## Stash item names · V75

Hover a stash square, highlight it with WASD/arrows, or tap it on phone to see a small item-name tag beside the highlighted square. It stays within the grid and never intercepts transfers. Empty squares, moving stacks and page changes hide the tag. Existing pack/return controls and gear guide stay the same.

Use green-team-stash-tooltip-v75.zip or green-team-stash-tooltip-v75.html. Preserve the whole data folder when updating.

## Gear guide and suggested loadouts · V74

At the stash or workbench, open Gear guide. Gear shows each item's controls, duration, limits and disguise-breaking rules. Loadouts compares Distraction, Sneaking and Team rescue with your packed sack and shared stock; all are three-square suggestions leaving six squares in an otherwise empty sack. Costs compares personal recipe XP with shared materials. These are packing suggestions; use the stash to pack items. Short selected-sack summaries and crafting controls share the same gear descriptions. Phone labels use Stick/Use/Cancel.

Costs were reviewed together and retained for comparative playtesting. Bell25XP, smoke/disguise50XP, dart/orb75XP; snare known. Sneaking recipes total200XP from a fresh profile versus75XP for Distraction, so treat it as a later kit. You can use stocked gear without owning its recipe. Packed Lunch still has no crafting recipe; Team rescue needs a stocked/test lunch. Full values, kit material totals and review rationale are in docs/gear-selection-and-balance.md. No progression or saved tuning changes.

Use green-team-gear-guide-v74.zip for multiplayer or green-team-gear-guide-v74.html for solo. Preserve whole data folder and use npm ci/start:lan; refresh old tabs.326tests pass. Physical-phone layout/feel still needs user testing.

## Scrying orb · V73

Select a packed orb in Sack and E equips it. Walk normally, then Space/phone Use consumes that exact orb and pings the three nearest guards by straight-line distance. Purple diamonds mark their positions on everyone's map for5seconds; they stay where the guards were when pinged. Open the map toggle if hidden. Fewer than3guards produces fewer marks; sleeping/jailer guards count too. This is a snapshot, not live tracking.

Each orb takes one square/use. Simultaneous orbs share their own independently expiring snapshots; duplicate requests cannot consume a spare. Active marks remain for the team if the user goes down or disconnects, and vanish at expiry/run end. The server chooses guards/positions/timer. Orb use breaks guard disguise as other successful gear use does. It creates no guard distraction, alert or change in combat.

Free tagged orbs are in Test supplies. Trial economy: personal recipe75XP, craft2scrap+1cloth. Old saves gain zero orb stock and no recipe unlock; real unused orbs bank normally and test copies never add stock/XP. Other gear and saved tuning remain intact.

Use green-team-scrying-orb-v73.zip for multiplayer or green-team-scrying-orb-v73.html for solo. Preserve whole data folder, npm ci then npm run start:lan, and refresh old tabs. Phone feel remains for user playtesting.

## Guard disguise potion · V72

Pack a potion from stash/Test supplies, select it in Sack and press E to equip. Walk into position, then Space/phone Use drinks the exact selected bottle. Your goblin looks like a guard for10seconds with a small countdown by health. Teammates see the same costume/timer and retain your name. Guards beyond1tile cannot see through it; within1tile they use normal sight, walls and smoke rules. The disguise grants no damage immunity and does not undo earlier alerts or legitimate last-known positions. It stops guards learning fresh distant movement trails while disguised.

Starting a valid search or successfully using gear breaks it: smoke, dart, bell, placed snare or a spent Packed Lunch. Equipping, aiming, cancelling and invalid attempts preserve it. It ends on expiry/downing and resets between runs; timers keep ticking during disconnects. Another potion cannot refresh an active disguise or spend a spare automatically. Each potion takes one square/use. Unused real bottles bank normally; tagged test copies never grant stock/XP.

Free disguise potions are in Test supplies. Trial economy: personal recipe50XP, craft1scrap+2cloth. Old saves gain zero potion stock and no recipe grant. No new materials, other potion types or sprite/audio editor are included.

Use green-team-guard-disguise-v72.zip for multiplayer or green-team-guard-disguise-v72.html for solo. Preserve the whole data folder; npm ci then npm run start:lan and refresh old tabs.316tests pass; phone feel remains for user playtesting.

## Clang bell · V71

Equip a Clang bell from Sack with E, move into position, press Space/phone Use to aim, then press again to throw. Esc/Cancel keeps it equipped. Gold preview means a legal clear-floor landing; red means blocked. One square, one use,5tile throw range. The bell rings once on landing, with a visible ripple and temporary sound slot.

Guards within8tiles by walkable path investigate, including around corners. Visible goblins, attacks, sleeping/snared guards, carrying/pickup and fixed jailer posts take priority. A guard that spots a goblin abandons the distraction. Investigators look around for2seconds on arrival, then return;8seconds is the overall limit. Later bells replace the destination. Blocked routes cancel safely. No direct alert/reinforcement is added by ringing. The thrown bell is non-solid and cannot be recovered.

Get free tagged bells from Test supplies. The personal recipe costs25XP; each bell costs1scrap+1cloth. Old saves gain zero bell stock and no free unlock. Solo and multiplayer share rules, effects and authoritative spending; repeated requests cannot consume a spare bell. Existing dart controls remain intact.

Use green-team-clang-bell-v71.zip for multiplayer or green-team-clang-bell-v71.html for solo. Keep the whole data folder, run npm ci then npm run start:lan, and refresh old tabs. Physical-phone aim/audio feel still needs playtesting.

## Sleep darts · V70

Sleep darts now work in solo and multiplayer: one square per dart, one shot, eight seconds of sleep on the first guard hit. Equip a selected dart with E, close Sack and walk normally. Space/Use starts aiming; mouse/WASD or the left phone stick aims while standing still. Press Space/Use again to fire. Esc/Cancel returns to walking with the same dart equipped. Each step requires a fresh press. Opening Sack/Menu, switching gear, losing focus or going down cancels aim. The reticle stays visible on short screens and a small equipment hint/count sits by the controls. A launched miss still spends the dart; repeated firing cannot use a spare copy. Darts stop at walls, solid furniture and locked gates.

Sleeping guards cannot see, attack, expose hiding goblins or carry/pick up captives. A carrier drops its captive still downed, with original spilled loot untouched. Repeated hits do not extend sleep; snare timers run independently. On waking, normal sight/search/return rules resume. Sleep itself adds no reinforcement alert; earlier sightings are not refunded. All peers share authoritative projectiles/timers.

Get free tagged test darts through lair Test supplies. The personal recipe costs75XP, then each dart costs1scrap+2cloth. Crafted copies pack first with stash overflow as before; unused real darts bank on escape, debug copies never add stock/XP. Old saves default missing dart stock to zero. Starter supplies, other prices and V67loot/V68door fixes stay intact. Clang bell remains deferred.

Use green-team-dart-controls-v70.zip for multiplayer or green-team-dart-controls-v70.html for solo. Keep the whole data folder and the same npm ci/start:lan setup. Physical-phone aiming/audio feel still needs user playtesting.

## Treasure-room doorway fix · V68

Locked treasure gates now occupy the actual entrance tiles, matching collision and artwork instead of sitting one tile inside the room. Treasure selection rejects hallway-length openings: entries must be bounded by wall ends, no wider than the configured corridor and connect outwards. The selector tries another eligible optional room without carving or sealing floor tiles; its existing reachability checks keep unrelated hallways and key access open. Multi-entrance rooms can still share one key when each opening is valid. Gate art follows each opening's side, including east/west and mixed-side rooms.

Use green-team-treasure-doors-v68.zip for multiplayer or green-team-treasure-doors-v68.html for solo. Preserve the whole data folder and use the same npm ci/start:lan workflow. All295tests pass;600Normal/Hard generated layouts pass diagnostics without warnings. V67loot settings and saved-lair opt-in remain as below. Dart/bell implementation remains deferred.

## Early-loot tuning · V67

Fresh solo games and new server lairs now use45%near/35%far empty-search endpoints and55%near material mix (previously70%/50%/75%). Depth still blends these odds; far material odds remain20%, with existing rare pools and15%two-item chance. Starter1snare/2scrap/1cloth,9-square sack, gear recipes, sale values, XP and30/50upgrade prices are unchanged. Sleep darts, bells and the recorded abilities remain future ideas.

Existing saved lairs keep their selected run settings. V66 saves acquire an explicit75%near material field to preserve the old implicit value, with a before-update backup when needed. To try V67 on an existing lair: open Private server admin, select that lair, set Empty searches near entrance45%, Empty searches far from entrance35%, and Materials near entrance55%, then Save settings. Only these three fields need changing; the next run uses them and an active run keeps its launch settings. Do not reset all tuning if you want other custom values retained.

Use green-team-early-loot-v67.zip for the server or green-team-early-loot-v67.html for solo. Keep the whole data folder, npm ci then npm run start:lan. This is a playtest balance pass: the example20/30/35gold progression is not a guaranteed reward sequence. See docs/early-balance-proposal.md and docs/v67-balance-audit.json for measured content and limits.

## Loot, inventory and lair feedback · V66

Picking up loot or packing a held item gives the sack a short gold pulse and quiet temporary chime. A blocked placement, packed rotation or outside touch drop flashes red with a low cue; cancelling a gesture is quiet. Valid rearrangements/rotations remain quiet. Successful stash transfers, stack moves, crafting and purchases pulse the lair panel green with a short confirmation. No central narration or guard changes.

Sound on/off lives in Menu and applies for the current page session. Audio starts only after a user interaction; unavailable/blocked audio leaves gameplay and visual feedback working. Multiplayer confirmations come privately from the server after the action and required save succeed, rather than from guessed shared-stock changes.

Use green-team-feedback-v66.zip for the server or green-team-feedback-v66.html for solo. Preserve the whole data folder and start with npm ci / npm run start:lan. The sound slots are temporary and replaceable. A future game editor will support user sprite/audio uploads; that editor and final media formats are deferred (docs/feedback-assets.md).

## Full-loop playability fixes · V65

Reviewed the solo and shared-server flow from lair preparation through dungeon interactions, extraction/results and returning home. Fixed fast touch drags that arrive without an intermediate move event, held Tab repeatedly opening/closing lair stock, and landscape sack CSS being overridden by later short-screen rules. The landscape sack now renders its grid at 168px (56px squares). Viewport resize/rotation cancels held controls and uncommitted touch drags so old coordinates cannot continue an action.

Use green-team-playability-v65.zip for the server or green-team-playability-v65.html for solo. Keep the whole data folder, then npm ci and npm run start:lan. See docs/playability-pass.md for coverage and the remaining physical-device checks. No new gameplay systems or balance changes.

## Compact lair stations · V64

Stash, workbench, campfire and map table now share a viewport-sized layout with a fixed header and action footer. Long content scrolls inside the station. Touch stash taps select an item, then Pack one or Return item transfers it; mouse clicks and E keep their existing transfer behaviour. Phone stash pages show nine source slots at a time, with Move stack available for rearranging shared stock. Multi-square item icons fit inside their stash slot.

The workbench separates Craft and Recipes tabs. Test supplies open their own panel. The campfire focuses on personal upgrades, and the map table separates destination choices from preparation, with a packed-sack meter and fixed confirmation button. Server validation, crafting costs, XP, saves and dungeon sack gestures are unchanged.

Use green-team-lair-ui-v64.zip for multiplayer, or green-team-lair-ui-v64.html for solo. Keep the whole data folder on update; phone startup remains npm ci then npm run start:lan. All 288 tests pass; actual phone layout playtesting remains needed.

## Compact run-end screen · V63

Run results now use one full-viewport summary for solo and multiplayer: outcome/job header, shared/team gold, personal earned XP/available balance, run time and a fixed Return to lair action. View haul opens the recovered-item details; failed/left-behind runs offer Lost items. Only the item panel scrolls. The result header and return action remain visible, with Back to result (or Escape) returning from details. Escape does not silently dismiss a completed run.

Success, empty escapes, downed/left-behind players and admin-ended runs retain their existing reward/loss data. Team gold is labelled separately from this goblin's losses; earned personal XP remains visible for eligible left-behind goblins. No changes to reward calculations, save rules or server messages.

Try green-team-run-end-v63.html for solo or green-team-run-end-v63.zip for the server. Keep your whole data folder when updating; phone startup remains npm ci then npm run start:lan. Compact landscape/portrait layouts still need on-device visual playtesting.

## Compact start screen · V62

The live-server home screen now fits one viewport: goblin/level/progress on one side and the main lair action on the other. Returning creators see their lair name and Enter your lair. New goblins see Create your lair. Join friends opens its own name/code panel. Goblin details opens XP and goblin selection. Options contains goblin switching and, once a lair is owned, Create another lair. Multiple owned lairs use a compact selector instead of a long list.

Join/create/profile/options share one native modal panel with Back, Close and Escape. Existing form IDs/server commands are preserved. Drafts survive ordinary state refreshes; error messages appear inside the active panel. Entering gameplay closes it. Long forms and the phone keyboard scroll only the panel, while the main home screen stays within the viewport. Short landscape and portrait layouts use compact profile cards.

Download green-team-home-screen-v62.zip for this update, keep the previous whole data folder, then npm ci and npm run start:lan for phones on the same Wi-Fi (npm start for local desktop-only play). This home screen belongs to the live-server version; the existing standalone solo play.html continues to start in the lair.

## Mobile sack controls · V61

In the dungeon sack, a touch tap highlights an item without lifting it. Drag to another square and release to move it. The grabbed square within a multi-tile item stays under your finger; green/red previews show whether the destination fits. Releasing outside the grid, cancelling a touch or choosing an invalid location leaves the item packed at its original position. Rotate works on the selected packed item (or an explicitly held item), shifting inward at a bag edge if necessary; collisions leave it unchanged. Coin-stack moves preserve overflow in the original square. Equipment remains E-to-equip; the existing explicit Move button still allows lifting an item for sharing/dropping.

Landscape phones get larger sack squares in a panel beside the action controls. Touching the sack pins it open until closed. Mouse/keyboard inventory rules and the lair transfer grids keep their existing controls. The central running-context prompt and action narration are hidden; object search bars, health/danger and critical display feedback remain.

Solo and multiplayer use the same packed-item validation; the server looks up the actor's own item ID, validates the whole operation and commits it atomically. No lifted intermediate state or lost item if a snapshot is delayed. Use green-team-touch-sack-v61.html or the V61 server ZIP, retaining your data folder. Phone startup remains npm ci followed by npm run start:lan.

## Updated goblin art · V60

Replaced assets/goblin.png with the supplied untitled-atlas.png, preserving the exact16×16 transparent image. Shared in-world drawing scale is1.5 instead of2: goblins render25% smaller, with a proportionally smaller floor shadow. Portrait/home images use the same new art. Feet anchoring, facing/mirroring, hopping, labels and shared teammate rendering remain consistent. No movement/collision/save changes.

Use green-team-new-goblin-v60.html or the V60 full-game ZIP. Keep your data folder when updating; phone startup remains npm ci, then npm run start:lan.

## Floating phone movement · V59

There is no fixed joystick on screen. Touch the left46% of the game view to set a fresh thumb origin; drag to move or aim a trap. A faint stick appears only while held, then disappears on release. Initial contact is neutral wherever you touch. The existing eight-way movement/dead zone and normal speed stay unchanged. The right thumb can use actions independently. Mouse clicks still reach the world on touch-capable PCs; menu/inventory interactions keep their normal targets.

Gameplay text and action controls now explicitly disable selection and long-press menus; the invite code remains selectable and native fields remain editable. Control presses also clear any old text selection. Home forms are unaffected. Phone browser long-press behaviour still needs an on-device check.

Use green-team-floating-stick-v59.html or the V59 server ZIP. Keep your data folder when updating. Phone startup is still `npm ci` then `npm run start:lan`.

## Game screen · V58

The world now fills the browser viewport without the page title bar/footer. Portrait, health, danger and selected route sit at the upper-left. Map, fullscreen and Menu controls sit upper-right; Map can be hidden. The sack uses the same moss/brass frame, with a horizontal desktop toggle and landscape touch controls. Context prompts sit at the lower centre; action notifications fade instead of staying as a page footer. Touch hints use Stick/Sack/Use/Cancel labels. Cancel only appears during trap placement. Compact layouts reserve room between both thumbs and keep inventory above the action buttons.

Menu contains goblin selection, lair name/invite code, personal XP, save details, Help and the existing abandon-run action. Opening it clears held controls; closing it cannot leave movement stuck on. The world keeps moving while it is open. Existing stash/crafting/map/result dialogs inherit the shared frame; home remains independently scrollable. This is a first gameplay UI pass, with detailed menu/home redesign deferred.

Fullscreen requests target the whole document so station dialogs, results and the home screen remain available. Requests use the browser's supported fullscreen method, reflect external exits, and show a short message if unavailable/denied. Support guidance: [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen). No forced fullscreen or orientation lock.

Use green-team-game-hud-v58.html for the standalone preview, or green-team-game-hud-v58.zip for the server. Keep your whole data folder when updating. Phone startup remains `npm ci` then `npm run start:lan`; open the printed phone URL on the same Wi-Fi. Gameplay/save rules are unchanged. Automated checks pass; browser layout and physical-phone spacing still require playtesting.

## Landscape phone controls · V57

Touch devices show a left movement stick and right-side E, Use, Sack and Cancel buttons. E shares keyboard interactions: hold to search/hide/place; release to stop. Use activates equipped smoke. Sack opens inventory (or the lair stash at home). Tap normal items to lift, then tap a free square to place; Rotate turns held loot. Equipment taps select it: E equips, Move lifts it for rearranging. While placing a snare the stick aims instead of moving; Cancel abandons placement without spending it. Movement pauses while manually arranging the sack. Keyboard/mouse controls remain available.

For a phone, keep the server computer and phone on the same Wi-Fi. Stop the previous server, then run `npm run start:lan` instead of `npm start` and open the printed phone URL in the phone browser. `npm start` stays local to the server computer. Admin remains limited to the server computer through its private localhost link. Turn the phone sideways. Dialogs scroll separately and inventory transfers/crafting use their existing tap targets.

Automated input and solo/multiplayer flows are checked; physical phone touch feel and browser layout still need playtesting. The standalone HTML is also included, but serving from the computer is the practical phone test route.

## Locked treasure room · V55

Runs now select one optional treasure room with guaranteed better valuables. Its key is guaranteed in a searchable container elsewhere and takes one sack square. Carry/share/drop it normally; E beside a locked entrance consumes the matching packed key and opens the room for the whole team. The room may have several entrances, all opened together. Unused keys cannot be sold, earn XP or carry between runs. You can leave without opening the room.

Closed threshold gates block walking, guard sight, searches and torchlight. They occupy the room side of the entrance, keeping passing hallways clear. Room selection checks that the rest of the dungeon stays connected and its key remains reachable. Guard routines, cages and reinforcement entrances stay outside the locked room; guards can pursue inside after opening. Door opening refreshes light clipping without moving torches. Very constrained custom layouts may have no safe room; preview reports a warning.

Try green-team-treasure-room-v55.html or update with green-team-treasure-room-v55.zip, keeping the previous whole data folder. No new dependency or database migration.

## Stackable coins · V54

Searches can now yield gold, silver or copper coins. Each metal stacks to9 per sack square. E pickup fills compatible partial stacks first; overflow uses another square or stays on the floor. Clicking a held stack onto a matching stack combines it, leaving excess in hand. Coin types/difficulty price/debug status stay separate. Existing lift/drop/share/down/disconnect flows preserve whole stack counts; gear/materials remain individual in the sack. Shared item art shows quantities in inventory/held preview.

Provisional unit values are3/2/1 shared gold for gold/silver/copper. Escape value and personal XP count every coin, applying difficulty rounding per coin. Existing gold coins keep their type/value; missing quantity means1. Old saves default the two new denominations to0. New/old solo and server saves validate carried stack quantities. No database/schema/dependency change; keep the old whole data folder when updating.

Try green-team-coins-v54.html; full update green-team-coins-v54.zip.

## One game screen · V53

The game scene now fills the browser viewport. Its toolbar, lair controls, map, health/alerts, sliding sack and status sit inside that frame. The long sidebar is replaced by Help, which scrolls independently and closes with Escape. The map stays visible at smaller widths; short windows place it lower-left to keep it clear of the sack. Home and crafting/results dialogs keep their own layouts/scrolling. Canvas resize and pointer/sack coordinate handling reuse the existing code.

Try green-team-game-screen-v53.html. Full server update: green-team-game-screen-v53.zip, keep the previous whole data folder, start and refresh.

## Dungeon route checks · V52

The existing private admin dungeon preview now checks connected floor, protected hallway/doorway lanes, prop alignment/overlap/approaches, guard patrols and cage/reinforcement routes using real navigation and collision. Problems have red outlines and descriptions; missing cage/hide/door locations are orange warnings. Check30 layouts runs the current architecture/difficulty and current form settings, yielding between maps. Listed problem layouts can be reopened by number. Edits cancel stale batches. Checking never saves settings or alters a live run.

For source checks, `npm run check:dungeons -- 100` checks100 seeds per architecture/difficulty (600 maps). This tests walking routes, not every possible chase or subjective movement feel.

Update with green-team-dungeon-checks-v52.zip, keep your whole old data folder, start the server and open its Private server admin link. Single-player gameplay is unchanged by these builder-only checks.

## Red guard vision · V51

Guard vision cones now use a muted red tint, with a stronger red when suspicious, to distinguish them from yellow torchlight. Shared drawing applies to solo and online.

Try green-team-red-vision-v51.html or update with green-team-v51, keeping your whole old data folder.

## Smoother corners and drawing order · V50

Movement now slides the goblin's circular feet along wall/furniture corners instead of rejecting each movement direction independently. Slightly off-centre doorway approaches are easier; walls and props remain solid. The same movement helper handles online players and knockback, with small steps, speed limits and a final collision check.

Furniture, hiding barrels, loose loot, guards and goblins draw in order of their grounded position, so objects in front cover those behind. Hopping does not change order. Cages bracket captives between their backs/bars, while goblins in front draw over the bars. Labels, highlights and progress bars stay above the scene. Walls/torches remain terrain decorations; lair stations keep their existing layer.

Try green-team-smoother-movement-v50.html or update with the full green-team-v50 folder, keeping your whole old data folder. No new dependency or save migration.

## Grid furniture · V49

Hiding barrels are now solid and their bodies/shadows fit one floor tile. Goblins interact from beside them to hide and return outside when leaving. Guards route around them. The existing half-second entry, one-goblin limit and occupied indicator remain. Shared placement protects hallways and connected floor. All future static dungeon scenery must use the shared grid/whole-tile footprints; larger props use multiple tiles.

Try green-team-grid-furniture-v49.html, or update with the full green-team-v49 folder and keep your whole old data folder. No new dependency or save migration.

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

For an update on Mac: stop the previous server with Control+C, unzip the new download, type `cd ` in Terminal and drag the new folder onto that line, press Return, then run npm ci and npm start. Node does not need reinstalling. Refresh both game tabs. The new archive folder is named green-team-v55 to distinguish it from older copies.

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
