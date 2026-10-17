# Project decisions

## Agreed behaviour

- Players join through a web browser.
- Each player controls a goblin in a lightweight 2D multiplayer game for friends.
- Goblins loot dungeons controlled by humans, dwarves or elves. Guard alert and pursuit create a rush to escape.
- Between runs, players inhabit a shared lair, decorate with loot, build crafting tables and prepare items or upgrades. Craftable escape aids can include mines and traps.
- Aim for inexpensive server hosting.
- A game-specific builder should support changing parameters and assigning imported art to game content.
- Proplet supplies sprite, animation and tile sheets with accompanying JSON. Inspect actual example exports before defining the importer.
- Shared interface elements and controls should be reused across features.
- Claude and Codex follow one documented working process stored with the project in Git.
- Check interpretations with readbacks and concrete examples; keep communication short and accessible.

## First playable milestone — agreed 16 October 2026

- Local browser play with one goblin; no rented server or multiplayer testing yet.
- Top-down view showing the dungeon floor and walls.
- Procedurally generated connected rooms, with a control to generate a new dungeon.
- WASD movement, with a small visual hop while travelling. The hop does not change floor position or allow jumping over walls.
- Walls block movement.
- Keep input, game rules and drawing separate to make later multiplayer integration easier; this is preparation, not proof that multiplayer works.
- Postpone guards, loot, crafting, lair features and the builder interface until after this exploration milestone.
- Use meaningful playable chunks rather than requiring a planning discussion for every small implementation detail.

Check the milestone by loading it locally, exploring all connected rooms, moving in different directions, checking wall collision, and generating another layout. Evaluate the movement feel with the user.

The recommended next multiplayer checkpoint is after exploration feels right and before adding many interacting gameplay systems. Begin with multiple local browser windows; hosting can follow later. No multiplayer implementation or testing is included in this milestone.

Handmade room templates arranged procedurally are a proposed approach, not a required generation algorithm. Temporary art is acceptable until actual Proplet exports are supplied.

## Still experimenting

- Final multiplayer player count and run length.
- Engine, networking approach, hosting provider and budget.
- Movement speed and animation feel; combat, detection, carrying loot, capture and escape rules.
- Lair ownership, saving, progression and builder capabilities.
- GitHub repository established at https://github.com/Millstreamu/Green-Team; technical stack selection remains the next preparation step.

Earlier scrapbot and goblin-management ideas are context only, not requirements for this game unless explicitly adopted.

## Exploration feedback — 16 October 2026

- User confirmed the prototype works, then approved their supplied goblin art and the higher movement hop in the V2 download.
- Future dungeon generation should offer rooms with multiple entrances and looped routes for evading guards or hiding. This is a future design direction, not a requested change to the current prototype.
- Guard navigation and patrols on generated maps remain unimplemented and unverified. When the guard stage begins, validate reachable patrol points, pursuit and recovery from blocked or failed routes together with dungeon layout. Patrols are feasible in principle; the current game has not demonstrated them.

## Sack and loot — agreed 16 October 2026

- Initial design: always-visible 3×3 sack at the bottom right; visibility is superseded by the V8 sliding-sack decision below. Item footprints remain 1, 2 and 3 squares, including straight and L-shaped three-square loot.
- R rotates an item being held. Click a sack item to lift/rearrange it; click an empty position to place it if it fits. Drag-and-drop is also supported.
- A highlight reticle identifies the E pickup target. Prefer loot near the cursor within goblin reach; otherwise highlight the closest reachable loot. Walls block pickup.
- E with empty hands tries to pack the highlighted item automatically, trying rotations without moving packed items.
- If no placement fits, leave loot on the floor and explain that the sack needs rearranging. No invisible extra storage or automatic repacking.
- Clicking nearby floor loot lifts it onto the cursor for manual placement. While holding, E or clicking the dungeon drops it near the goblin. Dropped loot remains available.
- Invalid sack placements keep the item held and show red feedback. Never silently replace an item or delete loot.
- A sack on the goblin's body has not been agreed; the current request is the inventory panel. Item art is temporary and shared between floor, bag and held previews.
- This chunk is pickup and packing only; extraction, persistence, guards, hosting and multiplayer remain outside it.

## Secret tunnel and run completion — agreed 16 October 2026

- User approved the V3 sack and requested the next chunk.
- Return to the entrance to leave; it represents a secret tunnel, rather than a separate exit to find.
- Press E at the marked tunnel to end the run and show the loot brought back, with a Start next run button.
- Implementation details for this test: only packed items count; a cursor item must first be packed or dropped. While holding, E retains its drop behaviour. With empty hands inside the small tunnel interaction area, E takes priority as leave; the on-screen prompt and reticle reflect this. Outside that area, E continues to pack highlighted loot.
- Results freeze gameplay. Start next run creates a fresh dungeon and empty sack. The result is a single-run haul display, not permanent storage; lair/stash and saving remain future work.
- Empty-handed returns are allowed. The header action abandons an unfinished run after confirmation; it does not count as a successful return.

## Future map note — 16 October 2026

- User wants a map that can be opened to view the dungeon layout, with no indicator for player position or the secret tunnel.
- Deferred for later; no implementation requested now. The current always-visible diagnostic minimap and its markers are temporary prototype aids, not the intended final map behaviour.
- Opening control and whether the full layout is known from the start or revealed by exploration remain undecided.

## Guard pressure and downed players — 16 October 2026

- Guards chase and attack; catching up is not automatic run failure. Their purpose is to pressure goblins into leaving through the entrance tunnel.
- At zero health the goblin goes down. If not recovered, their stuff is lost and they return once the run is over.
- Teammate recovery is a possible future mechanic, not implemented or fully specified. Recovery method, timing, cost and treatment of loot remain open.
- Solo implementation: no active teammate remains when the only goblin goes down, so the run ends, carried bag/cursor loot is lost, and a fresh run restores the goblin. This is the solo fallback, not a rule that one teammate going down will end an entire multiplayer run.
- First guard implementation patrols generated room routes, notices visible goblins, chases, searches the last visible location after losing sight, then resumes patrol. Walls block sight and strikes.
- Initial balance choices are provisional: three health, a visible attack wind-up, a gap between damaging hits, and a chase speed slightly below the goblin's movement speed. Tune these after playtesting.
- The faint sight cone, notice indicator, attack circle and guard-status text are prototype feedback. No global alarm, player combat, guard body blocking, traps, revival or multiplayer networking are added in V5.

## Looping routes — agreed 16 October 2026

- User reported V5 works pretty well and approved improving dungeon routes next.
- Add extra connections and room entrances so players can loop around guards; keep some dead-end rooms.
- V6 extends the existing generator rather than replacing it. The configured budget is three extra connections; only accept routes that reduce a meaningful existing detour and increase room entrances. Preserve two existing single-entrance rooms where available.
- The route budget, minimum detour saving, connection length limit and dead-end preservation count are editable configuration values, not a builder interface yet. Particular layouts may use fewer shortcuts if no eligible route exists.
- Guard navigation, movement, inventory and combat rules are reused. No new guard behaviour or deferred map feature is introduced by this step.

## Search before looting — agreed 16 October 2026

- User approved V6 and deferred the suggested builder/balance panel until more core gameplay is present.
- Rooms contain searchable furniture such as chests, cupboards and crates. Valuables should fall out after searching, then use the existing floor pickup and sack controls. This adds time/risk instead of running through rooms grabbing visible items.
- Hold E while staying beside the highlighted object, with progress feedback. Releasing E or moving away cancels the search. Guards continue acting while searching.
- V7 implementation details: taking a hit, lifting an item, losing reach/sight, going down or losing focus also interrupts. Cancelled searches reset progress; the object can be attempted again. Completed objects are marked searched and cannot duplicate their contents.
- Completion spills loot to accessible nearby floor with a brief animation. It does not auto-pack or collect multiple items from the held search key. Release and press E again to pack, or click spilled loot for manual placement.
- The same reach/cursor preference and highlight style select either floor loot or an unsearched object. E still drops a held item first and exits at the tunnel when hands are empty; outside the tunnel it performs the highlighted action.
- Initial search times and contents are provisional test data. Furniture art is temporary and does not add collision yet. No builder panel, permanent stash, map redesign, new alarm system or multiplayer added in this chunk.

## Sliding sack — 16 October 2026

- User approved V7 searching and requested that the sack inventory slide right out of the way during movement, leaving a tab.
- I or the tab opens/closes it. Highlighting loose loot or picking it up reveals it automatically. This changes visibility, not inventory rules or storage.
- V8 details: new loose-loot highlights get a brief peek, pickup/full-bag attempts get a slightly longer peek, and movement tucks it away afterwards. Remaining still with a highlighted item keeps it visible. Manual dismissal is respected until target changes or a pickup is attempted.
- Holding an item keeps the sack open while moving so it can be placed safely; I/tab do not hide it in that state. Furniture highlights alone do not open it. These interaction choices were subsequently approved by the user.
- Closed panels are not clickable/focusable, and the tab remains accessible with an expanded-state label. Sliding respects reduced-motion settings. No new inventory or UI system replaces the shared sack display.

## Search bar location — 16 October 2026

- User approved the sliding sack and requested the search loading bar appear over the actual searched cupboard/chest/crate as a little pixel bar.
- V9 draws a small pixel progress bar attached to that object's world position. It moves with the camera, fills from the existing search timer, and disappears on cancellation/completion.
- Remove the separate search progress panel. Search controls, timings, cancellation rules, loot and inventory behaviour are unchanged.

## Predictable local guard patterns — agreed 16 October 2026

- User wants traps brought into runs to help manage guards, plus predictability in guard routines and a sense that exploring an unknown area is the danger.
- Agreed next step: some rooms have no guard; a fixed lookout alternates between two viewing directions; a room patrol follows a short repeating route with pauses. Previously explored areas become understandable, rather than new danger constantly wandering through them.
- Quiet rooms are normally unguarded, not invulnerable zones: a pursuing guard may follow the goblin into them. After losing/searching for the goblin, it returns to its assigned post or route.
- V10 uses three guards in distinct non-entrance rooms (two lookouts and one room patrol) and leaves other rooms unassigned. This is prototype placement/count data. Watch direction comes from room entrances; timing is regular and configured in GUARD_PATTERNS.
- Existing notice, chase, search, attacks, health and solo downed outcome are reused. Multiple guards share the goblin's damage-immunity window, avoiding simultaneous stacked damage.
- No fog-of-war/exploration tracker or global alarm introduced. The current viewport and absence of guard markers on the diagnostic map are unchanged.
- Traps are planned after reviewing guard patterns. The initial proposed direction is a placeable item that briefly holds or stuns a guard for an escape window. Loadout, sack space, placement controls, duration, crafting and replenishment still need defining; no trap implementation in V10.

## Short invisible pursuit trail — 17 October 2026

- User reported V10 works pretty well, but a guard lost sight at a hallway corner and stopped there instead of investigating the adjoining room.
- User suggested invisible, short-lived footprints after sight breaks, with slower guard search movement and a return if it finds nothing.
- V11 records continuous valid player positions for about 2.5 seconds after an alerted guard loses sight. The guard follows those saved clues in order, at a slower search speed, then looks around where the trail ends and returns to its assigned routine.
- The trail is internal data only; no footprint art is drawn. Later hidden movements do not extend it beyond the short recording window. The guard may finish following already-recorded clues after that window, so total investigation time can be longer than 2.5 seconds.
- Genuine visual reacquisition clears the old trail and resumes the chase. A subsequent sight break can begin a new short window. Unalerted guards do not gain continuous invisible tracking.
- Initial search speed (2.2 tiles/s), trail window and sample spacing are tuning values. Existing notice, damage, guard patterns, loot, search-object and escape rules are reused. Traps remain planned afterwards.


## V12: sack-selected, timed snare placement

- User specified: I opens sack, navigate to trap, E equips and hides sack; nearby floor preview, hold E for one second to place. Directionless. Goblins trigger traps without being harmed; placement must avoid triggering immediately under the setter.
- Implementation: one single-use, one-cell test snare per run. Arrows/click select within existing sack; E equips before tunnel/search actions. Release the equip key before beginning the placement hold. Existing search pixel progress drawing is shared with placement.
- Preview stays within 1.5 tiles and rejects walls, blocked reach, furniture and other live traps. Movement, changing position, releasing E or taking damage interrupts the hold. Escape cancels; the item remains reserved in its existing sack cell until successful placement.
- New snares wait for setter clearance (trigger radius plus goblin radius plus margin), followed by a short arm delay. Once armed, goblins waste them harmlessly; guards are held without movement/attacks for three seconds. All snares are single-use.
- Supplies are excluded from stolen treasure totals; downed loss lists include carried supplies as items. Crafting, loadouts, trap recovery, more trap types and multiplayer remain deferred. Multiplayer must pass every goblin to the shared trigger rule and assign stable owner IDs.


## V13: pre-run trap debug setup — 17 October 2026

- Agreed behaviour: user requested a super-simple screen before a run to choose which traps and how many enter the sack. Traps do not stack.
- Only snare currently exists; its quantity can be 0–9. Zero leaves it behind. Each snare is a separate one-square item with a unique ID, packed with the shared inventory fit rules. Full loadouts leave no initial space for loot.
- Setup appears at launch and before every new run; guards and movement are paused until Start run. Shows used/free squares and blocks invalid, fractional, negative or excessive counts. Last quantity is remembered in this open page for quick experiments.
- Replaces V12's fixed one-snare grant. This debug screen does not introduce crafting, unlocks, permanent saved loadouts, additional trap effects or multiplayer.


## V14: keyboard-first sack/placement — 17 October 2026

- Agreed: user requested friendlier keyboard-only trap placement, WASD moving the sack cursor while open, close with the same key, and Tab replacing I.
- Implementation choice for review: Tab opens manual navigation; WASD/arrows select without walking. E equips snare and hides sack. During placement, WASD/arrows move the nearby preview while the goblin stays still; mouse aiming remains available through actual pointer movement. Existing one-second E hold, directionless trap, cancel and safe arming are reused.
- Passive automatic loot peeks do not capture movement; Tab activates them for navigation. Repeated movement keys move selection. Clear held movement on mode changes to prevent drift. Tab cancels placement and opens sack; Escape cancels placement. Setup/results keep browser Tab focus controls.
- Explicit Tab closure works even with cursor loot, replacing V8's refusal to hide in that case. Otherwise held items still reveal/pin the sack. Ordinary loot rearranging remains mouse-based in this slice.


## V15: first lair loop — 17 October 2026

**Agreed behaviour:** user approved a small walkable lair, automatically storing escaped loot, a crafting table making snares from materials, and returning through a tunnel for the next run. Reuse item displays and controls; decorating and upgrades follow later. Multiplayer/server work remains deferred.

**Prototype choices for review:** safe single-room home with stash/workbench/northern tunnel; one recipe (2 scrap + 1 cloth makes 1 snare), one-square materials in searchable furniture, one guaranteed material crate in the entrance room, starter stock of 1 snare/2 scrap/1 cloth. These are test values, not final progression. Home stock is an unlimited count store; carried traps remain individual sack items. Crafted snares enter the stash; launch spends selected stock atomically. Escaping banks packed loot plus unused real traps exactly once. Going down/abandoning loses carried contents but never home stock. Deployed traps and anything left on the floor stay behind.

Shared item-list/drawItem/panel/button code renders haul, stash and crafting contents. Tab opens/closes home stash; E interacts with nearby stations, Escape closes panels. Workbench buttons retain native keyboard focus/Enter/Space. The run-prep screen now opens at the lair tunnel and has a back-to-lair action. Free debug supplies are an explicit option; tagged debug traps cannot increase real stock.

Item counts save locally to browser storage when available, with an in-memory fallback. No multiplayer sharing, run resume, sale values, decoration, building tables, upgrades or other recipes added. A future server must own stock, crafting and settlement transactions; local save data is only for this solo prototype.


## V16: fewer rewards and empty searches — 17 October 2026

**Agreed:** user says the run feels good but wants less loot, occasional materials and containers that turn out empty so players move to the next one. Stash/crafting UI improvements remain deferred.

**Tuning for review:** SEARCH_LOOT controls 60% empty containers, 15% two-item chance among nonempty results (otherwise one), and 45% materials among found items. Valuables reuse each object's existing pool; materials are scrap/cloth. Remove both V15 entrance guarantees. Rewards are seeded/generated once, not rerolled by searching. Full-duration empty searches mark the container searched and say “Nothing worth taking. Try the next one.” No repeat searches, bag drops or auto-pickup for an empty result. New-lair starter supplies remain unchanged.


## V17: one local roaming guard — 17 October 2026

**Agreed:** add a guard that patrols several connected rooms alongside existing lookouts/single-room patrols, to make door timing, alternate routes and snares more useful. User approved this next slice.

**Implementation choices for review:** retain two blue lookouts and one brown room patrol; add one purple roamer on normal layouts. Deterministic two/three-room out-and-back route, three-second stop pauses, normal patrol speed. Choose cached adjacent tile centres through actual corridors, excluding the entrance room and limiting outbound path length to 55 points. Most rooms remain outside all normal routines. Prefer a separate home room from existing guards. Skip extra guard safely if layout cannot support such a route.

Uses existing guard actor/state/vision/combat/trail/return/snare code. An unsuccessful search sends it home to restart the fixed route. Pursuit/return can go outside routine territory as with other guards. No new room locking, alarm or multiplayer mechanic. Parameters live in GUARD_PATTERNS; guard-routes.js only chooses the local route.


## V18: depth-weighted search rewards — 17 October 2026

**Agreed direction:** user likes the roaming guard, proposes better loot farthest from the entrance and more trap materials in closer containers. Sparse rewards/empty searches remain desirable.

**Tuning for review:** calculate each container's shortest walking path from world.spawn using existing findPath; normalise against the longest container path in the current map. Interpolate empty chance .7→.5, material chance .75→.2, rare-valuable chance .1→.8 with depth. Two-item chance remains .15 conditional on nonempty. Split existing furniture valuables into common/rare pools: chest common coin/horn, rare ruby/candlestick; cupboard common scroll/coin, rare candlestick/horn; crate common scroll/coin, rare sword/horn. This expresses “better” through rarity and success odds; no prices/selling system is introduced.

Generate once per seed, retain empty outcomes everywhere and permit materials anywhere. No guaranteed near/far reward. Path distance includes winding corridors rather than physical proximity. Keep loot generation separate from searching controls/state. No guard or lair economy change.


## V19: quicker directional guard attacks — 17 October 2026

**Agreed:** user finds current wait-then-hit too easy; wants a quick pause, swing in that direction, then chase, with a little player knockback. Values should remain parameters for later editing.

**Tuning for review:** lock aim at attack start; .18s preparation, .14s directional swing, .45s attack cooldown. Trigger within .95 tiles, strike up to 1.2 tiles in a 120-degree forward arc, checking walls. Deal damage once at swing start. After the short swing, pursue even during cooldown. Draw the actual sector/weapon sweep instead of a full-circle strike. Keep health3 and one-second immunity.

A damaging hit pushes the player .55 tiles over .1s away from the guard. Share collision-safe displacement with walking, preserving facing and allowing movement inputs. Immune hits do not add another push. Search/placement interruption and snare cancellation remain shared. COMBAT exposes all new timing/reach/angle/knockback values. No general stun or new combat subsystem.


## V20: central gold/stash, recipe progression and quick-use smoke — 17 October 2026

**Agreed:** returned valuables sell for gold in a central lair store; materials/crafted items and gold use a large stackable stash grid accessible by everyone. Carried copies stay separate in the sack. Gold unlocks recipes for the whole lair, then materials craft actual items. Distinguish placed gear and Space-activated quick gear. User explicitly requested implementing shared stash/gold/recipe foundation followed by smoke as first quick-use item. Job/map selection/difficulty, timed traps and sleep darts remain later work.

**Prototype choices for review:** 6×6 stash, one unlimited-count stack per type, whole-stack rearranging with the sack's WASD/E/click/Tab/Escape patterns. Automatic sale/deposit at successful extraction. Values: coin3, scroll8, horn10, candlestick12, sword20, ruby25 gold. One canonical counts.gold powers both gold stack and workbench balance. Basic snare known; smoke recipe20 gold once, craft cost1 scrap+2 cloth per bomb. No per-player wallets/unlocks. Shared pool is modeled locally while multiplayer/server stays deferred.

Equip smoke from sack with E, use one carried copy with Space; HUD shows remaining copies, each still occupies one square. Clouds stay at activation point, radius2 tiles, duration5s; block guard sight and its visual cone, while normal lost-sight trail/search and committed attacks still apply. No damage/stun/path blocking from smoke. Existing trap placement controls remain. Debug gear can include both supported items but never create real stock on return.

Save schema2 migrates old held valuables to gold once and persists counts, shared unlocks and stash positions. Existing storage key retained. Source stacks remain reserved while being moved; occupied drops cannot overwrite. Recipe/launch/sale mutations validate before spending. Future multiplayer must run these operations authoritatively on the server; no network implementation added here.


## V21: first job and selectable difficulty — 17 October 2026

**Agreed:** user approved choosing a job at the tunnel, starting with one job and two difficulties. Harder changes guard coverage/reward, not just health. Shared stash/recipes/smoke V20 approved.

**Prototype choices for review:** Human Manor uses the current procedural rooms/art; Normal is existing play. Hard adds one lookout and one room patrol in rooms outside existing guard and roamer coverage, preferring deep and middle-distance coverage. Original routines stay intact. Hard rare-pool chance +.15 among valuables, saleMultiplier1.5 rounded per item. Keep sparse empty/material/count probabilities and combat/gear unchanged. Both difficulties available immediately; no job unlock/XP gating yet.

Job/difficulty inputs and upfront risk/reward preview extend the existing tunnel gear dialog. Validate before stock spend; record profile on world/run/results. Price metadata stays on found valuables; one itemSaleValue function powers floor/haul/bank. Preserve quiet rooms and entrance routine exclusion. More job types, theme art and progression gates are later work.


## Multiplayer rules audit — 17 October 2026

**Agreed process:** user identified that map/job choice needs an explicit multiplayer rule and requested a pass through comparable questions across current systems. Review group behavior alongside each feature, even while server testing remains deferred. Ask short batches and record unresolved choices rather than assuming solo code defines co-op behavior.

Created multiplayer-review.md with current-source audit evidence and seven batches: job/readiness, escape/recovery, joining/leaving, searching/carrying, shared resources, guards/effects, persistence/difficulty/session operation. Existing agreed shared-lair/downing/trap principles are separated from new proposals. First proposal: organiser chooses job/difficulty, all participating players ready their own gear before organiser launches, new arrivals wait until next run. These are **not yet accepted**. “Host” here means organiser role, not a player's PC running the world/server.


## Multiplayer batch 1 original answers — 17 October 2026 (job voting superseded below)

**Agreed explicitly:** job/difficulty chosen by team vote; everyone marks Ready; new arrivals wait for the next run. This replaces the earlier proposed host-selected job. Reconnects are separate from new arrivals.

**Still open:** vote ties, ballot grouping/timing, readiness invalidation on selection changes, and whether everyone-ready triggers a countdown or enables an organiser Start button. Proposed next follow-ups: random selection among tied options and a short automatic countdown after all are ready. Do not mark these details accepted until answered. No runtime change yet.


## Revised job selection: planning station and minecart — 17 October 2026

**Agreed correction:** user replaces team vote with an interactable map-planning spot in the lair, alongside existing stash/workbench. Anyone can select a map/difficulty there; the latest confirmed choice persists until another player changes it. Everyone readies at a separate departure minecart; the cart is on tracks leading into darkness. The selected destination is where the group goes once everyone is ready. New arrivals still wait for the next run.

Do not retain voting/tie-break logic or restrict selection to an organiser. Keep the selected job/difficulty visible to teammates. Planning edits do not change an already-departed run.

**Still open:** whether destination changes clear existing readiness (recommended yes), whether players must remain near the cart, countdown/cancellation details and where gear preparation fits. Record the user's design before implementation; the current local job/gear dialog is a prototype, not the final team flow. These are design documentation changes, not multiplayer or new station implementation yet.


## Ready means ready to go — confirmed 17 October 2026

User explicitly confirmed: readiness is not destination/difficulty approval. If a player readies while Normal is selected and another changes it to Hard, they stay ready. Departure uses whatever destination/difficulty is currently selected. This supersedes the suggested readiness reset in earlier notes; do not implement that reset or an extra approval gate. Snapshot the run profile when the cart actually leaves.

Next proposal, not accepted: E boards/marks ready, E again gets out/unreadies; a three-second countdown begins once everyone is aboard and cancels if someone gets out. This settles physical readiness and departure timing only if the user accepts it. Gear preparation remains a later open detail.
