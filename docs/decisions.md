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


## Cart boarding approved — 17 October 2026

User approved: E climbs aboard and marks ready; E again hops out/unreadies. When everyone participating is aboard, a three-second countdown starts. Someone hopping out cancels it. Destination/difficulty changes continue to preserve readiness as already agreed. Gear-preparation placement remains open; proceed to escape and teammate-recovery questions. No runtime implementation in this design review.


## Team extraction and Packed Lunch recovery — 17 October 2026

**Agreed:** everyone must be together to leave, replacing the proposed individual escape/spectate rule. Rescue restores one health and requires an item named Packed Lunch. On downing, the goblin's sack items spill out and can be picked up again; revival does not repack the sack automatically. Preserve original item identity and metadata; do not duplicate equipped references.

**Pending:** carrying a downed teammate versus requiring revival before extraction; all-downed/failure/disconnect outcomes; group exit activation; repeated rescue limits; Packed Lunch recipe/unlock/consumption details. Proposed completed rescue uses one lunch; interruptions preserve it. No new recipe prices or mechanics implemented yet. Next focused question is whether a downed goblin can be carried to the exit.


## Downed goblins do not block extraction — 17 October 2026

**Agreed clarification:** a downed goblin must be revived to leave itself; no carrying downed goblins out. Downed goblins do not count in the leave-check counter. Thus all standing participating goblins must gather, but they can extract without reviving every downed teammate. Revival restores participation in the standing-player extraction requirement. This refines “everyone together,” rather than requiring recovery of all downed teammates.

**Next pending checks:** everyone down causes failed-run end (never a successful zero-player extraction); a Packed Lunch is consumed only on completed rescue, with interrupted attempts preserving it. These proposals await confirmation. Floor contents remain recoverable as already agreed; loot carried out by a teammate must not also be deleted as someone else's lost sack.


## Guard capture and cage rescue — 17 October 2026

**Agreed new recovery layer:** after a goblin goes down, a guard can pick it up and carry it to the closest cage. Cage sites are predetermined for the generated map; cages have an accompanying jail guard that largely stays put. Allies can rescue the captive there, but this is harder than a coordinated Packed Lunch revival before capture. Guards prioritise standing goblins in sight. Existing downed sack-spill and standing-only group extraction rules remain.

**Still open:** when a carrying guard spots a standing goblin, does it put/drop its captive down to chase? Does opening a cage restore one health without using Packed Lunch? Cage opening method/duration, transport/pickup delay, jail-guard pursuit limits/cage capacity, and team-failure rules when no free standing rescuer remains are unconfirmed. The earlier all-down instant-failure proposal was never accepted; do not implement it as a settled rule. Nearest reachable cage by path distance is the implementation recommendation.


## Carrier interruption and cage release confirmed — 17 October 2026

User confirmed both: a carrying guard drops its captive when it sees a standing goblin and prioritises chasing that goblin; an ally opening the cage releases its goblin with one health and does not need a Packed Lunch. Keep two rescue paths: resource-based revival on the floor, or harder guarded-cage rescue without the item. The original sack contents stay on the floor independently of body transport/release.

Still pending: failure with no free standing rescuers, Packed Lunch consumption/interruption, and cage-opening interaction. Proposed next discussion: no free standing goblins ends the run; same hold-E/cancel-on-movement-or-damage rescue pattern, with lunch spent only upon completed ground revival. These proposals are not yet accepted.


## Recovery closure and heat discussion — 17 October 2026

**Agreed through “ok cool” to the preceding two proposals:** when no free standing goblins remain, the run ends unsuccessfully and everyone returns to the lair; loot left behind is lost. Rescue is hold E at teammate/cage, cancelled by movement or damage. A Packed Lunch is used only on completed ground revival, not interrupted attempts. Cage rescue needs no lunch and restores one health as already agreed. Keep zero-standing failure separate from successful survivor extraction.

**New requested goal:** prevent indefinite kiting by making guards more dangerous over sustained pursuit. User asked for a proposal, not immediate implementation. Draft idea in multiplayer-review.md: readable shared heat, pursuit-driven buildup, delayed slow cooling after contact breaks, capped gradual chase-speed increase. High heat can let alerted guards slightly outrun a goblin; hiding/gear can break contact. Shared/per-guard scope, exact effects/values and scaling are not approved. No heat code added.


## Heat accepted; accumulating reinforcements requested — 17 October 2026

User accepted the preceding shared-heat proposal and added one new guard entering after every three chases/alerts. Heat gradually increases alerted chase speed, capped just above goblin speed; escaping pursuit allows delayed slow cooling. Reinforcements persist for the run independently of cooling, accumulating pressure until staying becomes untenable. No extra escalation systems requested. Exact heat values remain tuning details.

Counting clarification pending: recommend one separate team alert incident, even when multiple guards spot players together; continuous pursuit and brief reacquisition do not generate repeated counts. Ask before marking that interpretation agreed. Entry location and warning remain unspecified. Documentation only; no runtime implementation.


## Reinforcement alerts count per guard — 17 October 2026

User explicitly chose each guard alert as one count: getting caught by two guards adds two, intentionally making multiple-guard detection a bigger problem. This rejects the proposed combined team-incident count. Every three guard alerts bring one permanent-for-this-run extra guard; keep remainder counts and do not reset on heat cooling. Count events, not pursuit frames or one event per observing browser/player. Same-guard re-alert/reset details remain unspecified. Documentation only.


## Hiding spots approved and implemented locally — 17 October 2026

User accepted E enter/E exit, no movement/search/item use while hidden, guard pulls you out if it sees entry, unseen entry remains safe during nearby searching. Next playable slice is hiding before heat/reinforcements. Implemented dedicated temporary hiding barrels, separate from searchable furniture, with existing targeting/highlight and controls. No heat/reinforcement/capture runtime added.

Prototype choices for testing: one barrel roughly every two rooms, including entrance; exit returns to collision-safe entry position; only actual sight at entry gives a guard knowledge, respecting walls/facing/smoke. Existing invisible clues can still be searched but hidden position produces no new trail samples. Witness walks to the entry point and pulls the goblin out before ordinary chase/attacks resume; snare delays it. No automatic exposure timer or bonus damage.

Team behavior to confirm before networking: the local model reserves one occupant per barrel using player/spot IDs. Capacity and simultaneous-use/disconnect/downing cleanup are not accepted multiplayer policy yet. Future server must atomically reserve/release spots and store witness knowledge by pursued goblin; hidden players must not freeze other guards or reveal positions to them. Shared heat cooling still depends on the whole team's pursuit, not one player hiding.


## Half-second hiding and one-goblin capacity — 17 October 2026

User requested a half-second hiding timer, one goblin per spot and a visible occupancy indicator. Implemented hold E for 0.5 seconds using the same pixel progress bar and cancellation pattern as searching. Movement, release, damage/downing or conflicting actions reset progress. Goblin stays visible/vulnerable during the hold; guards seeing any of the entry attempt are remembered only if it completes. Exit remains immediate E. One-goblin capacity now supersedes V22's pending capacity decision. Local completion rechecks occupancy; losing simultaneous attempts cancel. Occupied barrels show a small green goblin icon and OCCUPIED for other players; the occupant sees HIDDEN · E EXIT. Server must eventually own the final capacity check and cleanup; no multiplayer runtime added.


## Reinforcement doors and heat implemented — 17 October 2026

User specified reinforcement entrances as doors on some rooms' top walls; clarified goblins cannot interact with them. New guards patrol around and search. Counts happen at each guard's alert, not chase completion. The rest of the previous heat proposal, brief arrival warning and reset after finishing search/returning to routine were accepted. Implemented V24 with local shared heat and individual guard alert-cycle latches. No repeated counts during chase/sight reacquisition. Completed witnessed hiding entry counts as a full alert. Every third count queues an extra persistent guard; counts/remainders never cool away and there is no population cap.

Prototype tuning (editable, not final balance): buildup30s, quiet grace4s, cooling20s, max chase speed1.08×goblin speed, arrival warning2s. Doors in solid north walls cycle deterministically, exclude entrance-room placements, preserve wall collision and never join interaction targeting. Reinforcements cache broad room sweeps with pause/look-around stops, reuse all normal guard/gear/hiding rules and never target unseen player coordinates. Shared heat affects chase/known-hide approach only; slower trail search, routine speeds and directional attacks are preserved. No other escalation effects added.

Future server must own one heat/alert/spawn state per run and replicate it rather than updating per browser/player. Stable door IDs and reinforcement serials avoid duplicate entities; reconnects must snapshot live timers/counts. Party/difficulty scaling and jail guards still need review. This slice is local; no server/multiplayer or capture implementation.


## Disconnect grace revised and agreed — 17 October 2026

User chose a grey, see-through disconnected goblin for 60 seconds. Guards ignore it and other players cannot interact with it, replacing the proposal that it remain vulnerable. Reconnecting restores control and ordinary visibility immediately; being spotted at that moment is fair game, with no extra reconnect protection. User accepted the prior proposed timeout outcome: sack spills and goblin is removed from that run. Preserve identity/actual sack contents; never duplicate gear or spill twice. Later arrival waits for the next run under the existing arrival rule.

Next pending question: exclude disconnected goblins from the group exit counter during grace? Recommended yes, not yet accepted. Downed/carried/caged/hidden disconnects, all-connected-player departure/failure, run ending during grace and repeat-disconnect handling remain to decide before implementation. No networking or runtime change; V24 stays current. User also approved V24 heat/reinforcement playtest.


## Disconnected goblins excluded from departure — 17 October 2026

User confirmed: a disconnected goblin does not count towards the group leaving check during its 60-second ghost grace period. Connected standing survivors may leave without waiting for it. Reconnecting during an ongoing run restores normal standing-player participation. Run ending during grace and handling retained sack/return destination remain pending; do not assume a ghost receives extraction rewards automatically. Documentation only, V24 unchanged.


## Team leaves before disconnected player returns — 17 October 2026

User confirmed: if the team leaves before a disconnected player reconnects, that player returns to the lair without their dungeon sack, like anyone left behind. No automatic sale or banking of ghost-held items. Reconnect after completion returns to the lair, not the closed dungeon. Preserve actual item ownership: loot already recovered and carried out by teammates settles normally. This resolves survivor extraction during disconnect grace; all-connected-player disconnect/failure policy remains pending. Documentation only; V24 unchanged.


## Last standing goblin disconnected — 17 October 2026

User confirmed the explicit failure exception: if the only standing goblin is disconnected, the run remains open for the remainder of its existing 60-second grace. Reconnecting resumes play; expiry without a standing rescuer ends the run as a loss. Do not restart the timer or grant successful zero-player extraction. If multiple standing goblins disconnect, honor each existing timer and fail once none can still return. This exception does not revive downed/carried/caged goblins. Special disconnect-state cleanup and repeated disconnections remain pending. Documentation only; V24 unchanged.


## Shared searching, floor exchange and pass-through movement approved — 17 October 2026

User explicitly approved all three: one searching goblin per container, dropping items for teammates to pick up, and goblins walking through each other to prevent doorway blocking. Update active D1–D3 rules accordingly. Existing item identity/conservation and single-spill constraints apply regardless of networking architecture.

User asked what backend is needed for dedicated server versus P2P. Added a pending architecture comparison: recommended Node.js/secure WebSocket game server with durable shared-lair storage versus WebRTC host-authoritative browser plus signaling/STUN/TURN and explicit save/host-migration policy. No stack, provider, party size, server budget or P2P topology chosen; no network implementation begun.


## Server-based multiplayer selected — 17 October 2026

User accepted the recommendation: a small rented server runs shared game state independently of browsers. Starting backend is Node.js, secure WebSockets, HTTPS and SQLite for durable shared-lair storage. P2P is not the current plan. Colyseus is still only a candidate framework; no provider, machine size, price, party cap or deployment selected. No server/network implementation or paid provisioning started. Continue remaining multiplayer behavior review, next shared stash/crafting and supply preparation.


## Shared stash-to-sack gear preparation approved — 17 October 2026

User confirmed: taking gear from shared stash immediately transfers it to that goblin's sack and removes it from shared stock. Returning gear restores stock. Each goblin packs before boarding the minecart. Simultaneous attempts on the last copy resolve to the first successful transfer, with no duplicates. Full sack cannot consume stock, and departure must not spend those supplies a second time. Reuse existing item footprints/fit checks and actual item identity. This is the agreed future team preparation flow; the solo setup dialog is not replaced yet. No runtime changes.


## Sack-first crafting; progression ownership reopened — 17 October 2026

User corrected output priority: if the crafter's sack has room, crafted items go there first. Shared stash as overflow remains proposed. Do not treat always-shared crafting output as agreed. User questioned whose lair/save is used after logout and across different friend groups, and suggested individual XP/unlocks with Payday 2 as inspiration. This opens a design discussion, not authorisation to replace the economy. Personal profile versus named shared-lair saves is a proposal to explore; gold/recipe ownership and member/offline access remain undecided. No runtime changes.


## Persistent friend-group homes selected — 17 October 2026

User chose persistent home per friend group and accepted running with the proposed personal/group split. Named group lairs save on the server across logout, independent of session organiser. Goblin XP/level, learned recipes and personal improvements travel between groups; shared gold/materials, stations and decorations stay with the group's lair. Players can belong to several homes and select/join the relevant one via invitation/link/code.

Personal XP learning recipes and shared gold improving lair facilities are the agreed progression direction, replacing shared-gold recipe purchases as the eventual design. Exact rewards/levels/effects/station costs and account/access/gear portability rules remain open. V24 economy is unchanged until a defined progression slice is built. Proposed next check: equal personal XP to run participants based on team recovered haul, not ownership of each pickup. Not yet approved. Documentation only.


## Equal personal XP from team haul approved — 17 October 2026

User approved the proposal: all run participants earn the same personal XP based on the team's recovered loot, independent of who personally picked it up. This supports rescuing/helping rather than competing for loot ownership. Participants left behind remain participants; players waiting to join the next run do not receive XP for a run they did not enter. No exact XP conversion, failed-run reward, disconnected participant eligibility, level thresholds or recipe schedule set yet. Resolve reward once per run and credit each eligible profile once. Existing V24 remains unchanged; next bounded playable slice can show personal XP/results separately from group lair stock.


## V25 personal XP first playable slice — 17 October 2026

User approved personal XP display, XP on results and a separate personal save. Implemented without choosing level/unlock thresholds. Starting tuning is 1 XP per gold of recovered valuables; materials/gear/debug supplies do not generate XP in this test, empty/failed solo runs yield zero and earned XP is retained. Reuse existing sale values including Hard per-item rounding. Spending group gold cannot change personal XP.

profile.js separates personal XP from existing camp save and credits each profile once per live team-haul result, allowing equal rewards to multiple profiles. This local single-profile prototype has no accounts, named group joining or server reward persistence. In-memory duplicate prevention must become durable run/profile transactions on the server. Final XP values, material/failure rewards, disconnect eligibility and recipe/level schedule remain to decide. Current gold-funded recipe UI is retained until a personal-recipe slice replaces it explicitly.


## Personal smoke recipe at 50 XP approved and built — 17 October 2026

User accepted snare known initially, smoke learned at 50 total personal XP, knowledge not spending XP, unchanged crafting material costs and workbench display of current/next knowledge. Implemented knowsRecipe(profile,type), configurable PROGRESSION.recipeXp, acting-profile craft checks and existing workbench cards. Gold is no longer used to learn recipes. Existing shared stock can be used without knowing its recipe; only crafting requires knowledge. Other goblins never inherit knowledge from the lair.

Migration choice: schema2 purchased smoke unlock refunds its former 20 gold once when becoming schema3, preserving existing stock/layout and profile XP. No free personal XP/unlock granted. Schema1 sale migration retained. Sack-first crafting output/direct lair packing and group facility upgrades remain separate planned slices; this implementation changes recipe knowledge only.


## Crafting overflow approved; lair packing built — 17 October 2026

User approved full-sack crafting overflow into the shared stash, completing the previously agreed sack-first output/direct packing design. V27 implements side-by-side stash/sack: E/click transfers one item, stock changes immediately, Q switches grids, R/button preserves whole-stack rearranging. Crafts spend materials once and output to sack when fitting or stash otherwise. Personal knowledge/XP rule unchanged. Departure now uses the actual packed sack, with no quantity selection or second stock deduction; cancelling keeps prepared items. A temporary minecart drawing replaces the home tunnel appearance; full team-ready/map-station flow remains future work.

Implementation choices: schema4 saves prepared single-local-goblin bag/next serial together with shared stock, retaining gear across home reloads and clearing its saved home copy on launch. Old saves migrate with empty prepared bags, preserve stock/layout and prior recipe refund. Debug add-one supplies moved to a collapsed section in the home dialog, remain tagged and cannot return as real stock. Future shared server needs per-player/per-lair bags and atomic unique-ID transfers; current local schema does not claim accounts/multiplayer implemented.


## Spendable XP and first passive approved and built — 17 October 2026

User requested earned XP that can be spent on recipes/passives, and accepted the concrete first test: smoke recipe costs50 XP, Quick fingers costs30 XP for10% faster searching, snare known initially. Replaces automatic total-XP recipe unlocks. Purchases are personal, permanent and one-time; spending the balance never removes ownership. Crafting still costs shared materials, with existing sack-first/overflow behavior. Workbench shows available balance, costs and owned states using the same recipe cards/buttons.

Implemented profile schema2 wallet/earned-XP/purchases. Existing schema1 profiles retain saved XP as available and retain previously automatic smoke knowledge if old XP>=50; compatibility choice avoids erasing earned knowledge or forcing spending. New profiles buy it normally. Search passive rate1.1 applies only to actual furniture searches and their shared pixel bar; no other timing/loot effects added. Costs/bonus provisional and editable. Server-side identity/purchase transactions remain future work.


## Campfire for personal passive upgrades — 17 October 2026

User requested moving personal passives to a little campfire. Added lower-lair campfire station with existing E/highlight behavior and reused dialog/cards in passive-only mode. Recipe learning/crafting stay at workbench. Quick fingers purchase is accepted only from campfire mode; recipes/crafting only from workbench mode. No costs, effects, ownership or save changes. No new UI system or networking added.


## Future level/token progression riff — recorded, not implemented

User suggested XP-driven levels granting spendable tokens, with multi-token costs, minimum levels and prior-unlock gates. Proposed response was to keep the current XP shop as a working prototype and design a small set of useful upgrades before choosing level curves/token prices. Record this as a likely future direction, not an accepted numerical progression schedule or a skill-tree implementation. No progression behavior changed in the subsequent map/cart slice.

## Separate map planning and cart departure built — 17 October 2026

User approved implementing the previously agreed lair flow: map table selects job/difficulty; E boards/marks ready at a separate minecart; E again hops out; all participating goblins aboard starts three seconds; hop-out cancels; selection edits preserve readiness and departure uses latest plan. Implemented V30 with one playable goblin and an explicit participant coordinator for future server use. No seed/world/stock consumption until final launch; prepared bag moves once. Latest confirmed selection persists across visits/runs/reloads; unconfirmed drafts cancel, readiness never persists. Destination is visible in the home HUD. Online multiplayer remains deferred.


## V31 — first multiplayer lair test authorised and implemented

**Agreed scope:** user accepted bringing the first server test forward: two browser tabs see each other, share stash/materials, use existing crafting/maps and board together, with one winner for the last shared item. Shared dungeon follows later. Dedicated Node/WebSocket direction retained; `ws` selected as a small transport dependency, not a game framework.

**Bounded test implementation:** server-local temporary home, separate per-tab goblins/bags/profiles; same domain rules/UI as solo, authoritative inputs/stock/clock, single shared launch checkpoint with job/seed. No actual dungeon starts in this test. Test-only return button returns everyone to home. Normal standalone solo game remains available. No rental/deployment.

**Still experimenting / not final policy:** temporary memory-only home and fresh zero-XP test identities; per-tab opaque reconnect token while process stays alive, no accounts/SQLite yet. Lair disconnect preserves bag offline, excludes from ready membership, and membership changes cancel countdown. No automatic countdown restart: hop/board again. This is a home-test cleanup choice, not a substitute for the agreed in-run 60-second ghost policy. Runtime does not grant starter XP/free debug stock; existing solo saves remain separate. Pending public hosting/auth/groups/persistence/in-run networking/rescue remain pending.


## V32 — shared dungeon searching and loot

**Accepted:** user personally tested V31 movement, shared stash and cart boarding/countdown cancellation and confirmed all work. User approved the next bounded slice: both goblins enter the same generated map, see each other, search shared containers and collect shared floor loot once; guards follow later, then revival/cages.

**Implemented:** one server-selected generated dungeon, authoritative movement/search timing/container reservation/item ownership, shared observable search bars, hidden container contents until spill, distinct sacks/cursor ownership and existing packing/rotation/drop sharing. Full sacks leave floor loot untouched. Both use existing controls and sack visibility patterns. Tunnel extraction requires every connected participating goblin nearby with no held cursor item, then banks actual recovered loot once to shared stock/gold and reuses the team haul result screen. No new departure countdown added to extraction. Floor loot disappears when the run closes.

Previously agreed disconnect basics are now implemented for these standing, unhidden goblins: detected disconnect => grey translucent60sec ghost, excluded from extraction, reconnect restores same actor/bag; expiry spills once and waits at home; survivor exit discards ghost sacks rather than banking them; all-offline run honors remaining timers before failing. There are still no guard, hiding, downing/carry/cage special states in network runtime. Repeated disconnect abuse policy, transport heartbeat detection and durable recovery remain future work.

**Still deferred:** multiplayer guards/heat/trap deployment/hiding/recovery, XP settlement, authenticated profiles/groups, SQLite persistence and public hosting. Network XP is explicitly labelled disabled in this slice, retaining zero-XP test profiles. This does not change the agreed eventual equal team-haul XP rule or solo XP behavior. V31 artificial departure-checkpoint return button is replaced by actual all-together tunnel return. Temporary local server memory and browser solo saves remain separate.


## V33 — larger multiplayer danger update

**Accepted:** user confirmed V32 worked, asked to tackle a larger connected change, and approved multiplayer guard patrol/chase, attacks/knockback, team heat/alerts/reinforcements, hiding, snares and smoke together. Reviving and cages remain the following update.

**Built:** Node runs the existing guard/attack/pressure/hiding/equipment rules once per shared simulation step. Each guard keeps its visible target and may choose the nearest other visible active goblin; a committed swing keeps its direction and can hit standing goblins inside that arc. Downed and disconnected goblins never provide fresh sight/trail clues, take hits or trigger snares. Routine/search timers continue when nobody is targetable. One guard alert counts once for the existing full alert cycle, never once per victim/switch/client. Team heat and warning/spawn queue remain shared, with one persistent reinforcement every3alerts.

Existing half-second hide entry/cancellation and one-occupant completion check apply to both actors. Shared barrel indicator marks occupancy. Witnesses retain the known entry and may expose that goblin unless distracted by a visible teammate. The existing reserved-item/release-E/one-second stationary trap placement, keyboard aim, owner-clear arming, harmless goblin trigger,3second guard hold, E-equip/Space smoke and5second sight blocking are authoritative. Smoke does not stop an already committed strike. Reused Debug supplies is now available online in stash/workbench; free tagged gear cannot increase real stock on return/escape.

Downing spills bag and held item once at the body, blocks interactions/movement, and removes that goblin from the standing extraction count. Others may recover the actual items; extraction banks those recovered copies once and does not also delete or report them lost under the old owner. No standing goblin => failure unless an active ghost still has remaining reconnect grace. Downed ghosts do not gain standing status. Home return restores full health for the next run; in-run revival/capture are deliberately absent in this intermediate version.

**Implementation defaults still open to playtest:** stable visible-target preference, nearest visible alternative, multi-goblin directional swing; hidden disconnect releases the barrel and leaves its grey ghost at its outside entry position, so reconnect is outside. Damage cancels hide/search and requires releasing E again before restarting trap placement. Existing hit immunity decays while disconnected and reconnect grants no health/immunity. Public deployment/auth/SQLite, repeated-disconnect abuse, account/group persistence and server XP reward transactions remain deferred.


## V34 — Packed Lunch revival and cages

**User requested:** implement the previously agreed revival/cage rescue loop after V33 delivery. This authorises the full connected recovery slice; it does not itself claim human V33 playtest signoff. Ground rescue uses a Packed Lunch, restores1health, consumes only on completed hold, and leaves spilled loot on the floor. Guard priority remains visible standing goblins; otherwise approach/pick up a downed body and walk it to the nearest reachable predetermined cage. A standing goblin in sight causes drop-and-chase. Cage rescue restores1health without lunch; stationary jail guards make it dangerous. Revived goblins rejoin the standing extraction check; all-free-standing-goblins lost still fails, except remaining active-ghost grace.

**Built:** shared rescue target/hold reservation, completion-time lunch debit, cancellation on movement/release/damage/reach/ownership/state/disconnect changes, and one helper per target. Guard pickup/transport follows existing navigation, preserving original spilled loot and never duplicating a captive/body/spill. Cages/posts are selected once per map, reachable and outside the entrance, avoiding props/guard posts; jailers reuse core stationary sight/attack/alert routines. Shared snapshots/progress/body/cage art reuse the existing renderer, reticle and pixel bars.

**Playtest defaults, not permanent economy/balance:** floor revive2seconds, cage opening3seconds, guard pickup1second, carrying1.6tiles/sec, up to3 cages. Closest cage supports several captives so fullness never silently changes the requested nearest-cage rule; one captive is freed per completed hold. No rescue immunity is granted. Test Packed Lunch is a nonstacking1slot sack item, supplied by the existing Debug supplies panel; craft cost/recipe/unlock remain undecided. Tagged lunches cannot create real stash stock on return/escape.

**Connection cleanup choice:** carried disconnect drops the goblin as a downed ghost at the carrier, never standing; caged disconnect stays caged/grey and cannot be interacted with. Timely reconnect preserves health/state. Timeout/run close clears transport/cage/helper claims without duplicating old floor loot. Existing standing-ghost grace rules remain unchanged. These special-state cleanup defaults are recorded for testing; repeated disconnect abuse/auth/persistence remain future.


## V35 — forward vision while carrying

User confirmed V34 works and requested sneaking behind a guard carrying a teammate. A carrier uses the existing normal sight distance/cone, walls and smoke, without chase-mode all-around awareness or the usual close-range rear detection. The captive claim switches this on immediately after pickup, before the carry state label updates. Seeing a standing goblin ahead still drops the captive and chases; normal chase/search and pre-pickup detection remain unchanged. Carrying guards display the existing vision cone. Exact overlap can still be detected; following close behind is safe from that carrier until it turns toward you.


## V36 — persistent shared home

**Agreed:** user approved saving the shared lair/gold/materials/crafted stock and each goblin's identity/personal progress across server restarts. Implemented one durable home in server SQLite, including stash layout, destination, separate prepared sacks and existing personal XP/purchases. This supersedes the V31–V35 memory-only home restriction. No new XP rewards or upgrade economy are added.

**Implementation defaults for this slice:** home positions, health, readiness and countdown reset at restart. Live dungeons are not resumed: departure durably consumes prepared sacks; interrupted participants return home without dungeon supplies/loot, while lair stock and waiting goblins' sacks survive. Completed haul banking and cleared participant sacks save atomically, preventing repeated rewards. These restart choices were stated during implementation and remain adjustable; do not relabel them as a separately explicit user decision.

**Identity/storage scope:** browser remembers local goblin keys, with a shared Goblin selector and distinct per-tab selection. An already-connected identity creates a separate test goblin in the new tab. Selecting is restricted to home with no active run. Local keys are not accounts; cross-device recovery, named groups/invites and production authentication remain future work. Server saves default to data/home.sqlite, ignored by Git/downloads. Keep/copy data when updating; no extra database installation. Bad/unsupported saves stop startup; failed writes pause the session without success acknowledgements. Existing solo saves remain separate.


## V37 — earned personal XP from team runs

**Agreed:** user approved adding equal personal XP from the team's recovered valuables to every goblin who departed, with no reward for failed runs or waiting arrivals, and spending through the existing workbench recipe/campfire passive screens. This supersedes the V31–V36 disabled-network-XP restriction. The departure roster includes downed, carried/caged, disconnected and expired participants; their actual sacks still follow existing banking/loss rules, while all get the same successful-team XP.

**Implemented:** server settlement reuses teamHaulXp/awardPersonalXp and the existing lair SQLite checkpoint. Only the team's banked non-debug valuables produce XP. Shared gold, cleared sacks and all participant profile changes commit together before successful snapshots/results. A settled live run cannot pay again; restart loads the completed home, never a replayable dungeon/result. Clients cannot supply rewards/ownership/run completion. Recipe/passive purchases remain server station/balance checked, personal and durable; no new unlock economy is introduced.

**Existing playtest values retained:**1XP per valuable gold,50XP smoke recipe at workbench,30XP Quick Fingers at campfire (+10% search speed). These remain balance parameters in PROGRESSION. Material/equipment/debug/empty returns yield0XP. Level gates, upgrade tokens, extra recipes and a progression tree remain later choices. V36 save schema remains compatible. Temporary reward receipt caches are excluded from network snapshots; offline participants' balance is saved even if they miss the temporary result notice.


## V38 — server debug/admin tools

**Agreed:** user accepted the proposed separate server admin tool with backup/restore, reset all/lair/one goblin, setting test gold/materials/XP, and ending a stuck run. Every reset automatically backs up first. Implemented a browser admin page reached through a private per-start Terminal link, separate from ordinary player controls. Automatic backup also covers stock/XP edits, restoration and forced run ending.

**Implementation defaults:** reset lair returns shared stock/layout/destination to starter values and preserves personal bags/profiles; reset goblin clears its sack/XP/purchases but retains its identity; reset all combines those scopes while retaining all identities/backups. Restore keeps post-backup identities but resets their progress/bags, and never rewinds the item counter into prior IDs. Set XP keeps existing ownership/lifetime XP; quantity editing covers gold/materials/crafted gear, not sellable valuables. Edits/restores/resets require no active run. End run abandons current dungeon supplies/loot with zero gold/XP, returns everyone home and preserves waiting sacks. Active dungeon/cage/floor state is not backed up or resumed. These clarified defaults were communicated during implementation and remain adjustable.

**Durability/access:** write and flush backup before changing state, then existing SQLite checkpoint before success. Failure to back up leaves state unchanged. Failed DB commit pauses/blocks game/admin edits and retains before-change backup. Backups live in data/backups and survive all resets; no retention/deletion feature. Private random admin capability rotates per process, requires local host/loopback and same-origin commands. Keys and full backup contents never enter game snapshots/static routes. No hosted admin accounts/roles or public deployment introduced.


## V39 — home screen, named lairs and portable personal progression

**User requested:** begin on a home screen showing the goblin and level, join a lair by name/code or create one, and test moving between different lairs. Perk management remains in the lair. Implemented home entry, generated six-character invite codes, previous-name shortcuts, code/name display in game and a Home screen return action. No public directory or automatic cross-lair membership bypass.

**Shared versus personal:** each lair keeps its stock/gold/layout, prepared sacks, destination and separate live run. Personal identity, XP/earnedXP, recipes and passives are canonical across lairs. Packed bags stay with their lair to avoid moving group stock; this implementation default was stated up front and remains adjustable. Active participants cannot leave their run through the home button; waiting/expired arrivals can. Ordinary home reconnect/server restart starts at the home screen; live in-run reconnect preserves the existing60second actor recovery. Groups can run concurrently.

**Display-only experiment:** level1 + floor(lifetime earnedXP /100). Spending XP never lowers level. No tokens, unlock gates, level perks or permanent curve chosen; PROGRESSION.levelXp is tunable. This display rule was stated during implementation, not promoted to a final user-selected progression system.

**Persistence/admin:** V36–V38 home payloads are backed up before migrating to Original Lair with old identities/bags/stock/progress intact; generated code shown in admin. Payload2 stores canonical profiles and separate lairs atomically, preserving reward conservation even if an expired old-team participant earns XP while in another lair. Old backups restore into Original Lair. Admin selects a lair for shared stock/reset-lair/end-run; personal XP/reset-goblin and full backups/restore operate globally. Reset all keeps identities/lair names/codes but resets every group's economy and progression. Edits/restores block while any run is active. Still local server identity keys and invite codes, not public accounts/roles or hosted deployment.


## V40 — creators do not need invite codes to return

User corrected the V39 join rule: a lair's creator should not be locked out for forgetting the code; codes make sense for other goblins. Added persisted ownerId bound to the actual creating server identity, Your lairs with dedicated code-free entry, and owner recognition in normal name-based joining. Other goblins still need a correct invite code even if they previously visited. This supersedes V39's universal code-on-rejoin rule, without adding admin privileges or member roles.

Compatibility default: V39 had no creator field, but inserted its creator as the first member before acknowledging creation. Back up before backfilling that first member for existing groups; empty groups get explicit null, which never auto-claims on a later visit/restart. Legacy Original Lair uses its first saved member as the provisional owner. Restore retains known ownership when older backups lack it; normal reset/restore retains identity/ownership. This is a migration fallback, not invented historical certainty.


## V41 — first game builder settings

User accepted the proposed first builder: guard speeds/vision/attack timing, reinforcement frequency, loot amounts and search time; saved settings for the next run and reset to defaults. Existing shared functions are reused. Sprite import/room editing remain later. Implementation defaults: per-lair settings in private server admin, editable during live play but copied only on the next departure; backup before each save/reset; progress resets retain settings, full backup restores include them. See game-builder.md for exact scope and checks.

V40 owner re-entry was playtested and approved. Deferred UI note: after a goblin creates a lair, remove Create lair from primary home controls; secondary creation/settings/reset organisation waits for a later UI/UX pass. Not implemented in V41.


## V42 — dungeon preview and tile-grid furnishing

User accepted saved generator parameters and a small preview with Human/Dwarf/Elf architecture presets, independent difficulty, and shared tile-grid placement for furniture/hiding/future decor. Implemented per-lair, per-architecture settings; example number retained during edits; Generate another samples again; actual next runs choose fresh numbers using the saved type. Map table now offers all three types. Shared wall/corner/footprint rules protect doorway lanes; cages also use them. Art remains temporary. Fourteen editor fields and initial architecture numbers are experimental. See dungeon-builder.md for parameter meanings and limits. V41 was user-playtested/tweaked and approved. Deferred home/settings UI pass stays deferred.


## V43 — export tuned settings for GitHub defaults

User asked to add the proposed one-file export immediately. Export settings in private admin downloads the selected lair's saved gameplay tuning plus all three saved architecture presets. User attaches this file in chat to have the desired settings committed as code defaults; export itself does not write to GitHub. Unsaved form edits are excluded, explicitly explained in the screen. Implementation: read-only fresh summary, versioned JSON whitelist, no invite/identity/admin keys or player economy; available during runs. No import/publish/account feature added.


## Approved Moss defaults — 17 October2026

User supplied green-team-settings-moss.json after requesting export-to-GitHub promotion and confirmed everything works. Validated format/version and complete settings. Promoted Human Manor to50×40, requested15 rooms, room width5–8/height5–8,6 attempted loops,4 searchables per room. Other Human fields, all Dwarf/Elf fields and gameplay tuning match prior defaults. Architecture presets now each specify their full values, preventing a changed Human base from accidentally changing another culture. Existing lairs keep overrides; new groups/reset-defaults use these code defaults. No stock/progress migration or auto-merge to main.


## V45 — supplied Human tile sheet

User supplied a five-tile Proplet32×32 PNG/JSON pair. Accepted mapping: top-right mirrors top-left, bottom-left and bottom-right both reuse wall_bottom_horz, side walls mirror as needed. Integrated Human Manor only in existing renderer, preserving source files/metadata and gameplay geometry. Dwarf/Elf/lair retain placeholders. Standalone embeds both files. No general upload UI, new inner-corner art, collisions or camera zoom added; current tile selection uses deterministic adjacency. See terrain-art.md.


## V46 — correct wall joins from screenshot

User reported wall pieces not lining up in the single-player Human preview and supplied screenshot seed2828433373. Fixed shared art selection/composition rather than changing supplied tiles or dungeon geometry: thin bottom rims retain side support underneath; inside joins use square faces; outer corners retain the agreed tile reuse/mirroring. New shared layers apply to solo and online, with updated standalone preview.


## V47 — visual torch lighting

User accepted warm torch pools/gentle flicker/darker corners as a first visual pass. Darkness does not affect guard vision or gameplay. Added decorative wall torches through existing placement rules, cached wall-clipped gradients and a moderate ambient shade in browser rendering. All dungeon architectures receive it; lair/HUD stay bright. No interactive torch, new loot/recipe or dynamic stealth rule introduced. Strength/art are experimental for user playtest; dedicated inside-corner art remains deferred after approved V46 correction.


## V48 — solid grid furniture

User requested solid searchables, clear hallways, cupboards always on the top/back walls, and chests/crates within a32×32 ground tile. Searchable footprints now block movement for players/guards. Entire carved corridor footprints plus doorway-to-centre routes are reserved; placement rejects disconnected walkable floor. Cupboards skip placement if no back-wall slot is available. Compact chest/crate bodies/open lids/shadows fit one floor tile; tall cupboards retain wall height. Source art tile32px still scales into the existing24px display cell. Search loot spills at the accessible approach. Existing guard sight and lighting remain based on floor walls; furniture vision occlusion was not requested.


## V49 — hiding spots and future scenery on the grid

User requested solid hiding spots and established grid alignment for all future dungeon decor/placed scenery. Barrels now use the same solid tile movement rules as searchables and compact single-tile art. Existing half-second entry, single occupant, indicator and E exit remain; entry is a deliberate interaction into the solid barrel, exit returns to the legal outside position. Guards route around barrels and can still expose witnessed occupants. All new static scenery must declare whole-tile footprints using shared rules, preserve corridor routes and default to solid when floor-standing; explicitly wall-mounted/flat decorations may be non-solid. This governs scenery placement, not actor movement or loose loot. Larger art uses multiple tiles. No new scenery catalogue or cage rule change in this patch.


## V50 — drawing order and smoother wall corners

User accepted drawing furniture/actors in grounded front-to-back order and requested less grabbing at wall corners. Shared renderer sorts searchable/hiding bodies by footprint front edge and guards/goblins/loot by ground position; hopping leaves order unchanged. Captives draw between cage back and bars; actors standing in front draw over bars. Interaction/status overlays stay above world bodies. Terrain/wall/torch placement is retained; this pass does not change wall art/geometry. Player walking and knockback use circular contact resolution that preserves tangential motion around convex corners, with bounded displacement, short substeps and final canStand validation. Same helper runs on the server. Collider size, speed, controls and solid footprints remain. Movement feel needs user playtest; no general auto-navigation or doorway teleport added.


## V51 — red guard vision

User requested reddish guard sight cones to distinguish them from yellow torches. Shared guard-view uses muted red for regular cones and stronger red for suspicious cones. Pure display change; shape, visibility states, wall/smoke clipping and guard detection stay the same.


## V52 — inspect generated dungeon routes

User accepted generator verification while making art: batch-generate maps, detect blocked/unreachable areas and guard/cage/reinforcement routing problems, show issues in existing builder. Shared read-only checker operates on actual preview generation/navigation/collision, and actual reinforcement construction. Preview outlines errors red and warnings orange and lists descriptions/tile coordinates. Check30 layouts snapshots current form settings/architecture/difficulty, yields between maps and lists affected seeds to inspect; edits/lair switches/locked state cancel stale work. It does not save draft settings or touch active runs. Missing cages/hides/doors are warnings, not claims of broken floor; normal lower requested room/loop counts remain preview information. Guard route/corner simulation is a deterministic navigation check, not a guarantee of every chase or movement feel.


## V53 — one viewport for the game

User reported the side map/long page causing the sack to disappear below the viewport when maximising, and requested one game screen. Main gameplay frame now owns viewport height with map, reused sack/vitals/status and compact toolbar inside it. The long controls/tips sidebar becomes native Help with independent scrolling. Sack remains anchored lower-right and keeps the established slide/Tab controls. Map remains visible, moving lower-left in short windows to avoid the sack. Header/lair controls remain accessible inside the frame; home/forms/dialogs keep separate scrolling. Canvas viewport resize and coordinate conversion remain shared. Help is a live overlay, not a multiplayer pause; Escape closes it and returns keyboard focus.


## V54 — coin denominations and stack limit

User requested findable gold/silver/copper coins stacking up to9. Each metal uses a separate one-tile sack stack. E pickup tops up compatible partial stacks first, then a new slot; partial success leaves excess on floor. Manual placement combines same-metal compatible stacks with excess in hand. No new split-stack controls; existing drop shares whole held stack. Other sack items remain individual. Matching also preserves difficulty sale multiplier and debug status. Search rarity/empty chances and item-count rolls remain the existing settings; normal valuable pools now include all denominations.

Provisional implementation prices (not user-chosen balance): existing gold coin keeps3gold, silver2, copper1. All auto-sell to central gold under the existing escape rule; difficulty rounds per unit before multiplication, and XP uses full sale totals. Legacy coin type is retained and missing count means1; new denomination stock defaults0 in old saves. Carried counts require whole numbers1–9 for coins,1 for other items. Shared item drawing owns badges across sack/stash/ghost.


## V55 — optional locked treasure room and searched key

User accepted one locked treasure room, a guaranteed key in searching elsewhere, one sack slot/shareable key, unlocking for everyone and optional escape without opening. Implementation prefers a distant leaf room; when none is suitable, a multi-entrance room is allowed only if closing every entrance leaves all outside routes connected. One key opens all of that room's entries. Gates occupy inside-threshold grid tiles so passing hallways remain clear. The source is deterministic among reachable containers outside the room, preferring outside the starting room when available; source contents remain hidden in player snapshots. Key is an extra guaranteed search drop. Treasure containers each guarantee a valuable (ruby/candlestick/horn/sword, provisional reward balance). Extremely constrained custom layouts skip unsafe objectives with a builder warning.

Packed matching key + E near the entrance consumes it once and permanently opens the room for the team in that run. Wrong/distant/downed/hidden/held-cursor attempts fail. Existing pickup/drop/down/disconnect spills preserve key identity; unused keys are run-only, excluded from banking/XP/results/withdrawal and reset on run end. Closed doors block movement/sight/interaction/light; opening updates shared collision and light clipping without moving torches. Guard posts/patrol goals/cages/reinforcement doors stay outside while guard pursuit may enter once open. Prototype door/key art is code-drawn and grid aligned, awaiting user's art.


## V56 — landscape phone interaction button

User chose landscape phones as mobile target and corrected the requested interaction key from F to E. Add a right-side E touch button sharing keyboard E actions, including press-and-hold searches. Remaining mobile controls are future work.


## V57 — first full landscape touch control pass

User approved left-thumb movement, right-thumb E/use/sack and tap inventory with rotation. Eight-way stick shares normal movement/aim rules and is paused during manual sack arrangement. Tap normal items to lift/place; equipment remains tap-select, E-equip, with explicit Move for rearranging. Cancel stays available for trap placement. Stick/actions have separate pointer ownership; release/cancel/focus loss stop input. Touch releases clear obsolete hover targeting, preserving intentional manual equipment selection. Keyboard/mouse remain supported. Optional start:lan exposes the game on the local network for phone testing; normal start remains localhost and admin stays localhost-only.


## V58 — gameplay HUD and fullscreen pass

User said mobile is usable but both phone/PC still read as a webpage, and approved a gameplay-screen UI pass before detailed station/home work. The viewport has no page header/footer; health/portrait/route sit upper-left, map/menu/fullscreen upper-right and prompts lower-centre. Meta information moves into Menu; map can be hidden. Common moss/brass framing carries through inventory and existing dialogs. Actions show transient notifications rather than permanent footer instructions. Touch prompts name the touch controls. Opening Menu clears/blocks player controls, without pausing the simulation; it says the world keeps moving. Outside clicks close the menu without also picking up/dropping loot. Fullscreen is explicit and targets the document so existing dialogs/home remain usable, with feature detection and failure feedback.


## V59 — floating left-side joystick and control text selection

User requested invisible left-side phone movement instead of a fixed stick and reported text highlighting while holding Use. Agreed behaviour: neutral thumb origin wherever a left-side touch begins, drag for movement/aiming, faint stick only during contact and invisible at rest. Left46% is the implementation touch area. Preserve eight-way/dead-zone/speed rules and independent right-hand buttons. Gameplay controls do not select text or open long-press menus; invite code and form inputs retain selection/editing.


## V60 — supplied replacement goblin and smaller display

User supplied untitled-atlas.png and requested replacing the goblin and making him a little smaller. Use the supplied16×16 transparent PNG unchanged; in-world scale2→1.5 gives25% smaller dimensions. Match the shadow scale. Existing feet/facing/hop and collision rules remain, and the shared asset updates home/HUD art too.


## V61 — touch sack gestures and no central narration

User reported unreliable tap-to-pick-up inventory behaviour and requested dragging on mobile, tapping to highlight/rotate, and removing the central what-is-happening text. Dungeon touch taps now only select; drags commit one packed move at release, never implicitly lifting an item into the cursor. Rotation works on the selected item. Invalid/outside/cancelled drags retain the original packed item. Larger landscape sack squares sit beside right-hand actions. Existing explicit Move remains for intentional lift/drop/sharing and E still equips gear. Central context/action narration is hidden; object progress and danger indicators remain.


## V62 — one-screen home dashboard and contained panels

User requested fitting the starting screen all at once using submenus/panels. Dashboard shows goblin, level/progress and one primary creator/new-player action. Owned goblins see Enter your lair; first-time goblins see Create your lair. Join friends, goblin details and Options open contained panels. Create another lair is under Options after ownership, fulfilling the deferred UI preference from V40. Several owned lairs use one selector. The dashboard itself does not scroll; longer forms/keyboard use their panel's internal scrolling. Existing ownership/code/server rules remain.


## V63 — one-screen run-end summary and item details

User requested the same bounded-screen/subpanel treatment for run results as the home screen. Run-end summary keeps outcome/job, gold, personal XP and time visible without a page-length haul list. Item breakdown opens within the same result dialog and scrolls independently; header/return button stay outside the switching panels. Back/Escape leaves item details; only the existing Return to lair action dismisses results. Reward/loss meanings and team eligibility unchanged.


## V64 — compact lair station panels

User accepted applying the home/run-end treatment to stash, workbench, campfire and map table. All four use bounded station shells, internally scrolling content and persistent main actions. Touch stash selection precedes explicit transfer; fine-pointer click and E retain immediate transfer. Coarse-pointer stash pages show nine of the existing 36 source slots; pagination does not change shared storage. Workbench separates Craft and Recipes, free test supplies use a subpanel, campfire focuses on upgrades, and map planning separates destination from sack preparation. No economy, save or authority changes.


## V65 — playability pass before more systems

Agreed behaviour: user accepted checking the complete lair → packing → dungeon → loot → escape → results → lair loop on phone/PC before additions. Small corrections preserve existing game rules: fast touch drags use final release coordinates even without move events; landscape sack keeps usable grid size; held Tab does not repeat-toggle station stock; viewport changes release held controls and cancel uncommitted gestures. No balance changes. Physical phone/browser feel remains to be judged in device playtesting (docs/playability-pass.md).


## V66 — loot, inventory and lair cues; future user-made assets

Agreed behaviour: user accepted loot pickup feedback, failed inventory move/rotation feedback and lair packing/crafting/purchase confirmation. Guards remain deferred. Use brief gold/red/green local pulses with quiet temporary sounds; keep central narration hidden. Sound can be muted. Valid packed rearrangement/rotation and cancelled gestures remain quiet. In multiplayer, only the requesting player receives the authoritative outcome after action/save; contested shared state must not generate guessed successes.

Agreed future direction: user wants to replace all audio with their own recordings and use an eventual game editor to upload both sprites and audio. User mentioned MP4 or another file format as a possible delivery; exact supported formats, conversion/import behaviour and the editor UI remain undecided. V66 supplies named replacement slots, not an upload editor. Preserve user-supplied goblin art unchanged.


## Early progression review after V66 — proposal, not applied

Agreed scope: user accepted reviewing current starting supplies, rewards, crafting and XP prices and sketching the first three successful runs before gameplay changes. Read-only700-map audit uses production generation/default Normal presets and paired seeds; no real player/survival/packing simulation. See docs/early-balance-proposal.md and scripts/audit-early-balance.mjs.

Still experimenting: near/far empty endpoints70/50%→45/35%, near material75%→55%; keep starter stock, gear costs, sale values, XP and30/50 upgrade prices. Illustrative solo20/30/35gold successes buy Quick fingers after run2 and smoke after run3, not guaranteed progression or a team timetable. Existing per-participant team XP and saved lair tuning must remain explicit. Runtime and saved values unchanged pending review of the concrete proposal.


## Future items/abilities brainstorm —18October2026

Agreed scope: user asked to record ideas while reading the early-balance proposal. Added docs/future-items-and-abilities.md, preserving8item ideas and11ability/upgrade ideas. Sleep darts; guard disguise, next-hit invisibility and5%gold-finding potions; shared3-guard scrying orb; throwable Clang bell; placed warning pottery shards; existing Packed Lunch revival. Abilities: highest-level still-in-shadow invisibility except very-close guards; sacrifice one sack item to open nearby chests; marked hiding-spot return teleport;1second berry blind/chase loss;20second locked-room bearing; searched-crate1second stun that contributes to guard increase; health; sale value; alert-triggered speed; nearest-guard map view while hiding;3second post-search hard-to-see (slower guard detection, not invisibility).

Still experimenting: names, unlock tiers beyond the explicit highest-level shadow idea, timing/range/cost/stacking/team rules and ambiguous next-hit/5%meaning. “Anchor” is an assistant name suggestion for the marked hiding spot, not a chosen name. No new gameplay authorised/built by this recording request. Packed Lunch remains existing functionality with crafting undecided. Early-balance candidate remains proposed, not accepted by this brainstorm.


## V67 — accepted early-loot tuning slice

User accepted the proposed next step after the balance review: fewer empties and a better early valuable/material mix, keeping starter gear and upgrade prices initially. Implement near/far empty45/35%and near-material55%; keep far-material20%, rare depth10→80%, two-item15%, stock, item values, crafting, personal XP and30/50prices. These remain playtest values and do not guarantee the example three-run progression. This supersedes the “proposal not applied” status of the earlier audit, not the pending19future item/ability ideas.

Saved lairs retain their selected tuning. Legacy exact editor settings add explicit near-material75%for compatibility, backed up before checkpoint; new/fresh defaults use55%. Add the field to the existing editor/validation/export and retain strict new submissions. Existing-lair opt-in changes only three fields45/35/55, applying at next departure. No sleep darts, bells, potions or abilities included.


## Sleep dart / Clang bell design proposal —18October2026

Agreed scope: user accepted drafting gear design while testing V67, covering phone/PC aim, guard reactions, cost/unlocks and multiplayer. Added docs/sleep-dart-and-clang-bell-proposal.md. Original effects remain user intent; all further controls, values and team rules are explicitly proposals, not approved implementation.

Recommendations for review: one square/use each; shared aim→Use/Space/cancel;6tile dart/8second sleep,5tile bell throw/8tile path-distance hearing/2second arrival inspection/8second investigation cap. Proposed personal recipe prices75dart/25bell XP, crafting1scrap+2cloth/1scrap+1cloth. No duration stacking; bell does not override a visible goblin; ordinary sightings retain alerts. Actor-owned costs, authoritative shared effects, carrier drop and reconnect/repeated-use rules specified. No gameplay or V67 balance change.


## V68 — treasure locks on bounded doorway thresholds

User reported a lock about one space off and a room side filled with doors beside an intersecting hallway. Fixed shared placement rather than changing art offset alone. Gate cells are now the actual outside-room entrance floor cells, superseding the previous inside-threshold choice. Eligible openings have solid lateral end caps, contiguous cells no wider than the configured corridor and an outward continuation; hallway-length exposures are rejected. Prefer existing single-entry candidates; preserve bounded multi-entry fallback with one key. Existing outside-route/key/optional-room checks remain, and selection does not edit floor geometry. If a constrained custom map has no safe candidate, retain the existing skip-lock fallback. Each cell carries its side so east/west/mixed-side gate art aligns with collision. No loot-economy/guard/tool changes.


## V69 — sleep dart first playable slice

User accepted building sleep darts first using the proposed equipment/aiming foundation, then checking wake/team interactions before adding the bell. One square, one shot,8second sleep. Implement6tile/12tile-second straight projectile, personal75XP recipe and1scrap+2cloth craft cost from the reviewed proposal as playtest values; tagged free test darts available. No starter grants or changes to existing upgrades/loot/door rules. Bell remains deferred.

E equips/reserves exact packed dart; mouse/WASD or left stick aims while stationary, Space/Use fires once, Escape/Cancel preserves it. Reticle constrained to visible viewport and local equipment hint sits beside controls; central narration remains hidden. Sack/menu/focus/viewport resets/downing cancel aim. A launched miss costs its item. Server validates selected own ID/aim/state and collision; replay cannot substitute another copy. Projectiles stop at first guard or solid/locked scenery. Sleep cancels attack/sight/hiding exposure/carrying, drops a captive downed once and preserves original spilled loot. No refresh/stacking or early wake from normal noise/passers; snare timer independent. Wake returns to legitimate observation/search/routine. No automatic reinforcement count from sleep. Shared snapshots carry projectiles/sleep timers; old saves add missing dart stock0without granting gear. Sounds remain replaceable placeholders.


## V70 — equip, move, aim, fire

User corrected dart controls explicitly: equip from Sack, move into position, Space to aim, then Space to shoot. This supersedes V69 entering aim immediately on equip. E selects the exact packed copy as ready gear without locking movement. First fresh Space/phone Use begins stationary aim; the next fresh press launches. Esc/Cancel returns to ready movement with that copy still equipped. Sack/menu/focus/viewport cancellation likewise abandons only aim; switching gear/downing clears equipped dart. Successful launch consumes and clears that exact copy; no automatic spare substitution. Retain sleep/cost/collision/team rules and hidden central narration.


## V71 — Clang bell first playable slice

Agreed behaviour: user requested implementing the bell after accepting corrected dart controls. Use the recorded bell design with V70 equip→walk→Space/Use aim→Space/Use throw; cancel preserves equipped exact copy. One square/use, range5, reachable clear landing and unobstructed throw, ring once after short flight. Hearing uses walkable path distance8tiles and valid guard-radius approach. Eligible routine/search/lost-sight guards investigate; any currently visible standing goblin, attack, sleep/snare, known hiding pursuit, body pickup/carrier or fixed jailer duty takes priority. Seeing a goblin interrupts investigation. Inspect2seconds on arrival, cap8seconds from ring, return normally; later bells replace rather than queue. Blocked routes abandon. Non-solid, unrecoverable thrown bell, temporary landing ripple/question mark, no central narration or map reveal. Ring itself adds no alert. Shared authoritative action validates own exact equipped copy/state/aim and atomic spend; repeats cannot consume spares. Existing save/item return/debug conservation rules remain. Recipe25personalXP and1scrap+1cloth craft cost; no starter grant.

Still experimenting: these recorded ranges/timers/costs and temporary synth sounds are first-playtest values. The user’s future audio/sprite editor, potions and abilities remain separate work.


## V72 — guard disguise potion

Agreed behaviour: user accepted proposed next potion slice:10seconds, guards recognise within1tile, searching or using gear breaks disguise. Equip selected packed potion with E, Space/phone Use drinks; ordinary walking remains available before drinking. Shared solo/server sight checks suppress distant visibility and fresh tracking trails while disguised; close guards retain normal sight/wall/smoke checks. Keep existing alert totals, legitimate last-known information and committed attacks; no invulnerability. Render using existing guard artwork in grounded actor order, with personal/teammate name and health-area countdown, without central narration.

Implementation choices for this test: exact-copy consumption; one square/use; no refresh/stacking/automatic spare substitution. Begin a valid search breaks immediately; successful smoke/dart/bell/snare placement/Packed Lunch spend breaks. Equipping/aiming/cancelled or invalid use does not. Buff ends on expiry/downing, resets per run and ticks through disconnects. Shared authoritative validation/snapshots own spending/timers; no client duration input. Free tagged test potions reuse established debug rules.

Still experimenting:50XP personal recipe and1scrap+2cloth craft cost are assistant-selected trial economy values, not user-specified balance targets. Reuse current materials rather than creating a new ingredient system. Temporary potionDrink sound slot is replaceable. Other potions, abilities and upload editor remain deferred.


## V73 — scrying orb

Agreed behaviour: user accepted the proposed scrying orb slice: equip from Sack, Space/Use consumes one and marks the three closest guards' current positions on everyone's map for5seconds. Marks are fixed snapshots rather than tracking. Reuse selected-copy gear controls, one square/use, normal movement before activation and no new aim mode. Purple map diamonds distinguish pings from green self/gold tunnel; preserve map-toggle choice. All guards, including sleepers and jailers, are eligible. Server owns targets/positions/lifetime; stale/repeated same-copy requests cannot consume a spare.

Implementation choices: nearest means straight-line distance, stable guard-ID tie break. Fewer guards means fewer marks; no guards still spends. Independent simultaneous snapshots expire without extending older ones; overlapping coordinates draw once. Pings survive user's down/disconnect for remaining team lifetime, reset on run end and create no distraction/alert by themselves. Successful use breaks guard disguise; invalid attempts preserve it. Existing stock/return/debug rules apply; legacy stock defaults0without a grant.

Still experimenting:75XP personal recipe and2scrap+1cloth craft cost are assistant-selected trial balance. Existing materials and temporary replaceable orbPing sound reused. Other items/abilities/editor remain deferred.


## V74 — gear selection and balance review

Agreed scope: user accepted clearer item controls/durations/limits, reviewing recipe/craft costs together, and three suggested loadouts (Distraction, Sneaking, Team rescue) leaving sack room for loot. Added Gear guide inside stash/workbench's existing contained scroll area, with Gear/Loadouts/Costs sections and Back to station. Shared descriptions use live config/recipes and translate phone control names. Short sack selection summaries and craft-card controls use the same content. Seven gear types include Packed Lunch, explicitly showing no equip/no recipe.

Implementation choices: suggestions are read-only lists, not automatic purchases/crafts/withdrawals. Distraction2bells+1smoke; Sneaking1orb+1disguise+1dart; Team rescue1lunch+1smoke+1orb. Each uses3squares leaving6in an empty sack. Compare required/current packed/shared stock and actual item footprints, missing items, resulting free space, fresh-kit materials and unlearned recipe XP. Explain recipes are needed for crafting, not using stocked gear. No server commands are sent by browsing.

Review outcome: retain current25/50/75XP and material costs; usability feedback does not establish quantitative balance. Sneaking unlocks total200XP from fresh versus75for Distraction, so present it as a later suggestion. Packed Lunch's missing normal recipe/source is the concrete remaining rescue-economy gap; no new price/unlock is silently added. docs/gear-selection-and-balance.md records exact tables, rationale and next playtest observations. Still experimenting: kit compositions and existing trial gear prices; no claim of proven balance or fixed progression target.


## V75 — highlighted stash item name

User requested a small name tooltip on the highlighted stash item. Add a non-interactive tag anchored to the selected square: mouse hover, keyboard highlight and phone tap. Clamp horizontally and show below first row/above other rows so it stays in the stash grid. Hide on empty/moving stack, mouse leave or page/reset; phone selection retains its name after touch ends. Mouse hover changes highlight but never transfers stock. Existing mouse-click/E/Pack one semantics retained. No extra descriptions, gear/economy changes or new gameplay.


## V76 — meat, berries and campfire Packed Lunch

Agreed behaviour: after rejecting a cloth-only food recipe in favour of food resources, user accepted meat/berries from cupboards/crates and Packed Lunch1meat+1berries, known from the start. Keep campfire crafting from the preceding proposal; this supersedes its2cloth suggestion. Mushrooms remain for a later potion pass, berry-blind ability remains unimplemented. Add two one-square material items, shared-bank-on-escape and existing inventory/drop/share/loss/save rules; no direct eating/healing/sale value/XP or starter grant.

Cook at campfire using shared ingredients, pack lunch first with stash overflow; other gear uses workbench. Server and solo enforce matching station, no spending on missing/held/invalid attempts. Existing lunch2second revive/1health, interruption and disguise-break behaviour unchanged. Shared stock spending is authoritative; contested last ingredient pair makes only one lunch. Existing saves default missing food counts0without discarding prior inventory/settings. No paid lunch recipe or profile migration. Guide, recipe list and Team rescue material totals updated.

Still experimenting: cupboard/crate material pool weights scrap2,cloth2,meat1,berries1. Thus one-third of material results are food, equal meat/berries, with unchanged overall empty/valuable/rare/count probabilities and no food in chests. It reduces those containers' scrap/cloth yield; new runs use it, current saved tuning retains values. This split is an assistant implementation choice for initial testing, not a user-set balancing target. Historical balance reports predate food; audit script now reports food and identifies current-generator versus old-tuning presets.


## V77 — map resource biases with room for content

Agreed behaviour: user accepted map resource biases, then explicitly asked to leave room for more content. Manor favours meat/cloth, Hold scrap/meat, Sanctuary berries (mushrooms later). Every basic resource remains obtainable on each map; preserve overall resource/valuables/empty/count/rare probabilities. Map table shows Common finds before choosing a route.

Implemented one shared data registry keyed by map and arbitrary container/resource IDs, with common labels sourced from item names. Integer relative weights within material outcomes only. Manor stores meat4/cloth3/scrap1/berries1, chest cloth3/scrap1; Hold stores meat4/scrap3/cloth1/berries1, chest scrap3/cloth1; Sanctuary stores berries6/cloth1/scrap1/meat1, chest scrap1/cloth1. All4basics retain positive cupboard/crate weights. Unknown maps/containers use established fallback pools, protecting future additions without adding placeholder resources. New resource definitions still need normal item/save/recipe integration. No content editor built.

Still experimenting: exact weights are assistant-selected first-playtest values. Layout/container/depth differences mean biases do not promise equal per-run yield. New runs apply weights; active rolled contents, saved tuning, stock, recipes and XP remain intact. Extension process and compatibility documented in docs/resource-profiles.md.


## V78 — throwable berry chase break

Agreed behaviour: user accepted berries as the first active ability/tool, using existing resource as a choice against cooking. Equip from Sack, Space/Use aims, next fresh press throws; hit blinds guard for1second and breaks chase, normal recognition afterwards. No paid unlock/level gate proposed. Added equipment capability to the existing berries material; real unused portions still bank/cook as before. Cancel retains exact equipped portion; switching equipment/downing/missing item clears ready state.

Implementation choices: one portion spent on valid launch, including misses (announced in readback),4tile/10tile-second projectile and normal solid/locked/first-guard collision. Blinded guard stops briefly and clears attack, target, hiding knowledge, last-seen and tracking trail. No sensing/strikes during1second, then normal observation/return resumes; no refresh while already blind. Sleeping guards unaffected; sleep clears prior blindness; independent snare timer continues. A blinded carrier/pickup claim pauses and resumes, without sleep-dart's captive-drop effect. No damage or direct extra/refunded reinforcement alert. Successful throwing breaks disguise. Shared authoritative effects/selected-copy validation, no auto-spare substitution; fresh input required.

Shared dart sweep extracted to src/projectiles.js, retaining previous dart behavior. Berries use same aim/bounds/input/renderer foundations; purple pellet/reticle and brief BLIND head label/cone suppression. Replaceable berryThrow/berryHit cues and guide entry explain resource tradeoff. Tagged free test berries cannot add real food/XP. Still experimenting: range/speed and future ability-unlock structure; user’s1second blind is the implemented effect. No change to food/map pools or lunch recipe.

## V79 — shared potion station and mushrooms

Potion brewing moves from the workbench to a separate lair station. Build it once for 30 shared gold (initial trial price); everyone in that lair benefits. Guard disguise retains its 50 personal XP recipe unlock and now brews with 1 mushroom + 1 berries. Existing learned recipes and stocked potions remain usable. The planned station occupies a solid one-tile worksite by the right wall, using shared prop placement, a reachable approach and grounded scene ordering. No new collision appears during construction.

Mushrooms are one-square shared materials, available in cupboards/crates on every named map. Manor/Hold add weight1; Sanctuary uses berries4/mushroom4/cloth1/scrap1/meat1 and advertises both common ingredients. Chests remain scrap/cloth; item-count/empty/valuable rolls are unchanged. New resources start at zero. Old saves default to an unbuilt station; solo saves, server checkpoints, snapshots and backups preserve the shared building. Domain and server checks reject brewing before building, workbench brewing, remote building, insufficient gold and duplicate builds without spending extra stock.

## V80 — Vanish potion

Agreed slice: add Vanish first at the potion station; invisibility ends on a hit and has a short maximum duration. Implementation trial values: 8seconds, 75personal XP recipe, 2mushrooms+1cloth per brew. Searching and successful gear use end it too, as stated in the readback. Equip from Sack, move freely, Space/phone Use drinks the exact selected bottle once. Repeated/forged requests cannot spend spares; cannot refresh or stack with disguise. No passive free stock or starter unlock. Lucky potion deferred.

Vanish blocks close/far guard sight and new trails, while existing searches, last-seen positions and already committed directional swings continue. Taking an accepted hit removes Vanish and does normal damage; rejected/invulnerable hits do not remove it. Expiry restores normal sight and downing clears it. Teammates remain independently visible. Translucent goblin sprite remains readable to players, with VANISH countdown in the existing concealment HUD.

Shared POTIONS registry and equipPotion/drinkPotion paths reuse reserved potionId, timing, interruption hooks and placeholder potionDrink sound. Legacy disguise APIs/command remain strict. Authoritative drink-potion derives type/duration from the owned bottle; no client supplied effect/duration. Shared snapshots include vanishLeft. Save registry/defaults preserve existing data, new stock defaults0; learned recipe persists in personal profile. Both potions require the built shared station for brewing. Guide, XP purchase, brew card and tagged non-bankable test supplies included.

## V81 — Lucky potion

Agreed behaviour: drink Lucky for +5percentage points chance of finding gold coins in your own completed searches for the remainder of this run, one active dose per goblin, no stacking. Actual searching goblin owns the bonus; coins spill into ordinary shared floor loot and contribute normally to the shared haul/personal team XP if recovered. Does not change silver/copper, sale prices or other loot. Damage, searching, successful gear use and down/revive preserve luck; a new run/home vitality reset removes it. Drinking Lucky breaks concealment; later disguise/Vanish may coexist with luck.

Trial recipe:50personal XP, brew1berries+1scrap at the built shared potion station. Recipe persists on goblin, stock on lair, old saves default0new stock. Equip chosen bottle, move, Space/phone Use drinks once. Duplicate doses retain the spare bottle. Shared registry distinguishes run effects from timed concealment; search/gear interruption only clears concealment. Boolean effect appears in authoritative player snapshots and separate LUCKY badge. Guide, recipe/brew cards and tagged free test bottles use existing systems.

Implementation: original container generation/RNG and ordinary searches unchanged. Compute original whole-container probability p of at least one gold coin from empty/count/material/rare/pool probabilities, including depth, tuning and Hard rare bonus. Treasure containers replace normal contents, so p=0there. Only gold-free lucky completions get an independent deterministic coin roll at min(1,.05/(1-p)), giving overall min(1,p+.05). Existing coin searches gain no extra. Success appends one coin, preserving resources, keys and prizes; empty containers may become one item and two-item containers may become three. This is an explicit extra-coin search effect, not a valuable replacement. Roll hashes run seed/container ID separately from original RNG; cancellation, swapping searcher and retries cannot reroll. Only completed server/solo search applies it, with shared searched flag/claim preventing duplicate loot. No client effect/odds/contents fields accepted.

## V82 — approved visual lair book screens

Agreed behaviour: user selected Recipe book mockup, then requested sprites/icons with minimal text and explicitly requested a single primary control that transforms when actions are mutually exclusive (Unlock→create). User approved visual potion, workbench, campfire and stash previews, then authorised applying them to the game. Later top-down brewing bench scenery remains deferred. V81 standalone/ZIP kept as fallback.

Implemented one shared parchment book shell with a stable recipe sidebar and selected detail page for workbench/potion/campfire. One primary action reads current state: Build potion station→Unlock recipe→Brew; Unlock→Craft; Cook lunch; Unlock permanent upgrade→noninteractive Owned stamp. No competing buy/craft cards or recipe-library tabs. Own XP and shared ingredient counts retain their existing ownership and costs. One short effect summary, temporary pixel item/ingredient sprites, quantities and available counts; info button reveals exact effect, controls, limits and ingredient names. Full guide and tagged Test supplies stay in secondary panels. Sidebar nodes remain stable while shared snapshots update counts.

Stash keeps actual shared6x6 and prepared3x3 grids with mobile3x3 paging, original item footprints, quantities, Q/WASD/E/R and stack rearranging. Mouse/touch select before the shared Pack1/Return action; R or secondary Move stack→Cancel move preserves explicit rearranging, while primary becomes Place stack as required. Selected item name/source/sprite and info are shown once. Hover shows only a tooltip and cannot replace an explicit target. Unknown or larger items retain original footprint art;19named resources/equipment/coins get shared station-only placeholder sprites. Dungeon rendering, loose-loot interaction, collision and gameplay art remain unchanged.

Network primary actions disable while waiting for both private acknowledgement and fresh authoritative state; failed acknowledgements restore usable controls. Native repeated key activation and double-click follow-ups cannot unlock and inadvertently craft. Existing server commands, validations, shared-building/recipe/stock persistence and sack-full crafting fallback remain authoritative. No server/save schema, economy, cost, recipe or dependency change. New modules station-art, station-item-view, station-book; shared inventory-grid uses book option only for lair; lair/stash views, inline station styles, online acknowledgement wiring and standalone module list updated.

## V83 — approved map and departure screens

Agreed: integrate the approved illustrated route/departure previews with compact landscape layouts. Map planning shows three route cards, resource sprites, Normal/Hard and Set route; unchanged selection shows disabled Route set. Full difficulty/resource explanation is on info. Sack removed from planning and shown only as the actual prepared grid at departure, without a name/capacity/free-space heading. Departure displays the real participant roster/portraits, shared route and readiness, Board→Hop out, and existing authoritative three-second countdown. Existing E at minecart now opens the screen; E within it toggles the seat. Hop out cancels readiness. Lair/Escape closes only the view (the existing seat remains); outside the panel E still hops out if aboard. Closing is disabled while a network boarding request is pending. No save, cost, cart authority, item footprint, or multiplayer participation changes.

Implementation: src/loadout-view.js shares landscape art across route cards/ticket and uses resource registry/station sprites and shared inventory renderer. index.html uses viewport-contained paper shells, 44px action targets and compact-height two-column departure; long details/rosters scroll inside. Solo frame continues cart timing while dialog pauses movement. Online snapshots drive the roster, countdown and seat; a pending request prevents double toggles until seat state changes or rejection arrives. Panels close on launch, identity changes, home navigation and disconnect. scripts/build.mjs embeds every goblin image reference, including the new portraits.

Verification: 364/364 full tests pass (v83-tests.log). Additional updated real online event-wiring test passes (v83-online.log), including actual server/session board/cancel/reboard and duplicate-request suppression; solo integration covers opening then boarding, cancellation beyond original deadline, sack conservation and launch. New departure view test covers actual bag labels, peer name, acknowledgement vs seat snapshot, authoritative countdown/cancel, shared route changes and rejection recovery. Build/standalone syntax/embedded assets/unique IDs and ZIP source bytes/integrity checked. No rendered browser or physical-phone test claimed; phone fit/touch playtest deferred by user. No production data or dependency changes. V82 files retained as fallback.

Deliverables: green-team-routes-v83.html/.zip, ZIP root green-team-v83. Preserve whole data folder; npm ci/start:lan and refresh old tabs. No Git remote configured; no GitHub update claimed.

## V84 — visual run-end book

Agreed: update the run-end screen to match the new sprite-led parchment UI, prominent gold/XP, optional details and one Return to lair action. Recovered loot (or personal lost items for a downed goblin) appears as grouped sprite tiles with quantities; select a tile to reveal name and per-unit sale value. Shared/team gold and personal XP remain separate, including left-behind results. Info toggles the existing full text/list breakdown, elapsed time and XP balance; Escape returns from details without dismissing the result. Return retains existing solo/online dismissal handlers.

Files: index.html paper run-end layout with fixed header/footer, scrolling summary/detail content and compact-height two-column rewards/loot; src/results-view.js state/reset/outcome labels and sprite painting; src/item-list.js optional tile mode reuses grouping by type and per-unit value, station sprite renderer and real footprints with original item fallback. Existing detailed item list is unchanged. No reward, banking, save or server mechanics changed. Tests/results-view.test.js checks stacked quantities, selection/name/value, selection reset, escape/left-behind/down/admin/empty states and details/Escape focus behaviour; existing real solo/online interaction fixtures cover return and rewards. Browser/physical-phone tests remain deferred. V83 retained as fallback.

V84 verification: 364/364 full tests passed (v84-tests.log); standalone JavaScript syntax, 230 unique markup IDs, embedded assets and ZIP exact source bytes/integrity verified. Deliverables green-team-results-v84.html/.zip, ZIP root green-team-v84. No production data/dependency changes or Git remote; no GitHub update claimed.

## V85 — stable goblin pixels while walking and turning

User reported goblin pixels looking uneven and changing during movement. The16x16 source was being rasterised at1.5x (24x24) into a half-resolution scene, then enlarged by CSS, producing uneven source-pixel widths. Renderer now draws into a2x backing bitmap with a2x world transform: each goblin source pixel occupies exactly3x3 bitmap pixels, preserving the existing apparent48px sprite, facing, hop, depth order and gameplay scale. Canvas bitmap matches rounded CSS bounds, including odd phone dimensions, avoiding the former fractional final enlargement. Sprite art is unchanged.

src/viewport.js supplies logical scene dimensions to pointer/world conversion and dart/bell/berry aim bounds. src/render.js retains world coordinates/FOV and sets scene size independently of bitmap size. src/darts.js uses that shared logical size; scripts/build.mjs includes viewport helper. One extra scene raster pixel per axis increases bitmap area4x relative to V84; physical phone performance/fit remain untested. No mechanics, saves, actor size, dependency or server changes.

Verification:365/365 full tests passed (v85-tests.log), then3/3 targeted renderer/real solo/real online tests passed after odd-viewport rounding refinement (v85-targeted-final.log). New renderer regression checks walking/facing sizes, exact doubled transform, resize667x375, pointer target equivalence and dart aim equivalence. Native Canvas actual renderer16frames at800x600 and667x375, walking phases and both facings, match intact3x source pixels byte for byte (v85-pixel-qa.mjs; v85-sprite-qa.png inspected). This is raster verification, not a browser/device playtest. Build/standalone syntax, unique IDs/embedded assets and ZIP integrity/exact bytes verified. Deliverables green-team-sprite-fix-v85.html/.zip; ZIP root green-team-v85; V84 retained as fallback. Preserve whole data folder, npm ci/start:lan, refresh tabs. No production data accessed; no Git remote/GitHub update claimed.

## V86 — quiet item feedback

User requested replacing the distracting whole-window craft/transfer flash with a small flash and grow/shrink on the icon itself. Shared feedback remaps lair-panel effects to the selected recipe hero or stash context icon. A300ms pulse goes1→1.1→.98→1 with mild brightness; no panel border/glow or panel movement. Reduced motion uses180ms brightness only. Rapid pulses cancel the previous icon animation. Network feedback still waits for the matching private receipt; failed actions use the same small icon treatment and existing messages. Dungeon pickup feedback and sound slots are unchanged.

src/lair-view.js caches the last painted icon so transferring the final item out can finish its pulse, including fresh online snapshots; timed cleanup clears only an empty selection, and a per-effect token prevents an old cleanup clearing a newer pulse. src/feedback.js owns routing, animation and cleanup. Tests cover station icon targeting/no panel animation, reduced motion, authoritative receipts and existing solo/online actions. Physical phone/browser visual testing remains deferred. V85 retained as fallback.

V86 validation:366/366 full tests passed (v86-tests.log); after icon-cache optimisation and added final-item cleanup regression,14/14 targeted feedback/station/online tests passed (v86-targeted-final.log). Build/standalone syntax,230unique markup IDs, embedded assets and ZIP exact source bytes/integrity verified. Deliverables green-team-icon-feedback-v86.html/.zip (root green-team-v86). No production data/dependency changes; no Git remote/GitHub update claimed.

## V87 — campfire passive grid and workbench lunch

Agreed: campfire becomes an icon grid with the highlighted ability explained on the right. WASD navigates, E or a grid-slot click performs Unlock→Activate→Deactivate; no separate unlock/equip button. Activation gets a green border and corner tick. Three active personal slots, room to extend the passive registry later. Packed Lunch moves to the workbench, still known/free to learn and using1meat+1berries.

First passives: Quick Fingers keeps its existing30XP/+10% search-speed values; unlocking no longer automatically activates new purchases. Quiet Hands trial75XP preserves remaining Vanish invisibility when a valid container search begins; hits/gear use and the original expiry still break/end it. Guard disguise still breaks on searching. Loose loot pickup already preserves invisibility. Lucky Goblin trial50XP adds5percentage points to the searching goblin's completed-search gold chance, stacking with the Lucky potion for10points; original generated rolls, other loot and selling prices unchanged. Same deterministic completion stream and gold-free-only, one-coin/no-replay rules apply to the combined bonus. Existing Quick Fingers purchases without a saved selection migrate active; new unlocks require a separate activation press.

Implementation: profile.js passive registry/three-slot validation/desired-state activation/personal effects and optional activePassives saves. Solo and server derive effects from the personal profile at launch. save-store validates owned, unique, known passive selections and defaults old Quick Fingers appropriately without mutating input saves. Server set-passive accepts a boolean desired state only near campfire while at home and not aboard; recipes/unlocks stay personal, activation/deactivation costs no XP. Server derives effect fields, rejects unlocked ownership forgery and mid-run edits. Own/peer snapshots include quietHands/passiveLuck; Lucky HUD shows the combined5/10 bonus. No items or shared supplies are spent on activation.

New passive-view.js uses three stable native grid-slot buttons, keyboard highlight/focus and right-side effects/limits/state; future entries extend the registry. lair-view retains authoritative pending confirmation and uses the new panel only at campfire. Grid is separated from the scrollable recipe book; compact landscape two-column layout, green active border/tick, separate highlight outline and personal active-slot count. Existing sprite icons reused. Icon-only feedback retained. Workbench now contains lunch; guides/help and server crafting-station checks updated. Existing recipe costs, sacks, team rewards, potion consumption and invisibility hit/expiry rules stay intact.

Verification:373/373 full tests pass (v87-tests-complete.log),22/22 final targeted UI/domain/reward/real solo/online tests pass after paper-panel height/legacy-code cleanup (v87-targeted-final.log). Five new passive domain tests cover ownership/separate unlock activation/personal effects,3-slot validation, desired-state replay/malformed inputs, solo save/reload/old Quick Fingers migration and invalid server saves, actual valid searches preserving only Vanish, combined lucky chance/no extra original rolls/one-coin replays, authoritative campfire range/ownership/launch/run restrictions and two actual sockets confirming personal unlock/activate/deactivate while rejecting replays/forged purchases. New UI test covers WASD/E, no repeated unlock/activation, ticks, no book action and workbench lunch. Existing food socket test now contests lunch at workbench and rejects campfire. Existing search/economy/potion/persistence/admin/hub/socket tests pass. Build/standalone syntax/unique IDs/embedded assets and ZIP exact source bytes/integrity checked. No rendered browser/physical phone test claimed; phone testing deferred by user.

Deliverables green-team-passives-v87.html/.zip; ZIP root green-team-v87. Preserve whole data folder, npm ci/start:lan and refresh tabs. V86 retained as fallback. No production data accessed, dependency changes or Git remote; no GitHub update claimed.

## V88 — raid minecart room, shared cargo and return boarding

Agreed: every playable dungeon has a small starting cart room, connected to the main dungeon through one hallway. Interact with the cart to unload into a bounded shared6x6 hold, retrieve supplies/loot, or separately board to leave. Cargo is stored, not banked: successful escape recovers it; full wipe/admin abort/restart loses it. Starting capacity36physical squares uses actual item shapes and stack counts, not the permanent stash's type-stack layout. Auto-fit transfers try rotations; manual cargo rearrangement is deferred. Run-only treasure keys stay in sacks.

Room geometry: dungeonConfig enables cartRoom for solo/server/builder previews. The main room generator reserves a northern strip before carving; cart-room.js adds a7x5 room with one single-width hallway to the northernmost main floor, avoiding crossed rooms and unintended doors. A wall minecart is placed with shared PROP_RULES/placeProp, its one-tile solid footprint joins every shared solid-mask rebuild, and spawn/interaction sits at its reachable approach. It remains separate from ordinary rooms, searchables, hiding spots, guard/cage assignments and optional treasure selection. A wall torch uses the existing lighting/placement system; original main-room torch indices/phases stay stable. Rendered cart body participates in grounded depth order. Native actual renderer inspected at844x390 (v88-cart-room-qa.png); this is raster QA, not browser/phone layout verification.

Domain: run-cart.js owns finite cargo, exact-instance atomic deposit/retrieve, desired-state boarding and3second countdown. Loot fits/findSpace accept an optional grid size, default unchanged3x3. Counts, rotation, sale multiplier, debug/test tags and IDs travel with the item. Transfers require a free cursor and reject run-only keys, full target or wrong ownership without spending anything. Server validates actual cart proximity, active/not-hiding/not-placing state and disallows transfers/actions while aboard. Shared claims serialize so only one client retrieves an item. Successful transfers clear stale equipped references for that exact item. Recovered cargo joins eligible connected standing sacks for normal bank/reward settlement; sale and personal team-XP attribution remain the existing rules. Depositor death does not lose already stored cargo if teammates escape. Run cargo/readiness never enters durable saves; interrupted runs remain lost on restart. Fulldown/abort results include lost cart cargo. Result details count recovered cart squares separately from sack squares and include deposited loot once. No XP or shared stock is credited at deposit time.

Return UI: raid-cart-view.js shares item/grid rendering and parchment shell, actual6x6 cargo beside personal3x3 sack, select then Deposit/Retrieve, WASD/E and Q grid switching. Coarse pointers view four spatial3x3 cargo pages; items keep their true shapes across page boundaries. Names appear for selection, icon-only feedback remains, and network controls wait for a matching private receipt plus changed state. Board to leave→Hop out is separate from transfer; all connected active survivors must board for the server-owned3second return timer. Movement is stopped while aboard, but guards/time keep running; leaving reach, downing or disconnect invalidates seats. Continue raid/Escape cancels your boarding, including a queued boarding request. Cart interaction takes priority over nearby downed-body interaction while inside cart reach, allowing lunch retrieval; step clear of cart reach to revive. Legacy proximity-gated extract API remains for existing scripted integrations (requires every connected standing goblin at the cart, free cursors; immediate settlement); shipped game clients use explicit cart-board and countdown. Existing solo domain finishRun remains a pure immediate settlement operation invoked by its cart timer.

Verification: full suite and targeted results recorded below. New run-cart tests cover150room layouts/three architectures, single doorway and connected bounded floors, solid cart/reachable approach, exact shaped capacity/stack conservation/keys/full grids/held item/replay, solo deposit-only vs escape/wipe, authoritative shared claims/remote/aboard rejection/countdown cancel/rewards once, deposited loot recovered after depositor death, wiped/aborted cargo loss, interrupted restart loss and two actual sockets competing for one cargo item then boarding to bank exactly once. New panel test covers paging, selected transfer, private-receipt+state gating, board/hopout and Continue raid cancellation. Results test covers cargo square totals/loss tiles. Existing real solo/online interaction fixtures updated to walk actual generated paths and use the new return panel; original recorded treasure-door regression layouts remain explicitly constructed without the new cart-room geometry so those exact past failures retain coverage. Guide/help/abandon text updated. Physical phone/browser playtesting remains deferred by user.

Files include new cart-room/run-cart/raid-cart-view modules; world/generator-settings/prop-placement/loot/run/lair/render/lighting/feedback/results/main/online/server dungeon session/build/index, tests and documentation. No production saves accessed, dependency changes, or Git remote; no GitHub update claimed. Deliverables green-team-raid-cart-v88.html/.zip; root green-team-v88. Preserve whole data folder, npm ci/start:lan and refresh old tabs. V87 kept as fallback.

V88 final validation:381/381 full tests passed (v88-tests-release.log);20/20 release-targeted cart/panel/online/results tests passed (v88-release-targeted.log), plus final real solo interaction check (v88-solo-final.log). Standalone syntax,265unique markup IDs, embedded sprite assets and ZIP source-byte/integrity checks passed. Actual shared renderer room inspected at844x390; no browser/physical-phone claim.


## V89 · chase and awareness passives
Agreed behaviour: extend the existing campfire grid with a speed burst on spotting, nearest-guard awareness while hiding, and brief reduced visibility after searching. Personal unlocks and three equipped slots remain. No new action buttons.
Still experimenting: Panic Sprint50XP, +20% for3s/20s cooldown; Hideout Sense50XP, own-map nearest amber square only fully hidden; Fade Away75XP, initial notice time doubled for3s after a completed (even empty) search, with no effect on established chases. These values are tuning choices for playtesting. Burst cannot stack/refresh from other guards during cooldown. Timers reset on new runs, burst/veil clear on downing, cooldown continues. Other players do not gain effects from an equipped teammate. Marker is computed locally for the viewer, never added to shared scrying pings; existing dungeon guard snapshots remain unchanged.


## V90 · approved campfire preview applied
Agreed: left grid contains sprites and active corner ticks only; names, description and action live on the right. Larger centered active count, prominent top XP, no bottom keyboard instructions. Replace quoted E sentences with a keycap plus short action label. Hold E for one second to unlock and spend XP; keycap fills, release cancels. Pointer/touch users hold the grid slot. Activate/deactivate remain single presses on owned slots. Completing an unlock must not equip automatically. Enter/Space offer the same hold through focused native slots. Cancel on selection change, touch cancellation, close, lost focus or hidden tab. Existing personal ownership, three-slot limit and server purchase validation remain.


## V91 · last visible position before hidden tracking
Agreed: after line of sight breaks, guards continue running to the last position at which they actually saw the player. Then use the existing internal tracking route, followed by a local search and return. No actual/visible footprint graphics. Reacquiring sight immediately resumes direct chase. Store a fixed approach flag alongside the existing search state, keep bounded trail capture while approaching, and consume no tracking points before arrival. Direct approach uses existing heat/tuning-aware chase speed, later tracking uses existing search speed. Unreachable points fall back rather than locking a guard. Solo and multiplayer share the rule; distraction/sleep/target changes clear the pending approach.


## V92 · scene-anchored cart and one-way shared cargo
Agreed: avoid fullscreen dungeon menus; replace cart paper modal with a small speech-bubble cargo grid anchored to the cart. Tap E opens it and the sack on the right; hold E1second at cart boards. E hops out once aboard. Inspect shared cargo but never retrieve deposits during a run, regardless of depositor. Shared finite6x6 hold, shaped items, run-key exclusions and banking only on successful team escape remain. Guard/time simulation continues.
Implementation choice: nonmodal stage-local dialog, transparent outside panels, above-cart positioning when it fits and beside-cart placement on shorter screens. Existing3x3 phone cargo pages retained. WASD/E deposits selected sack item; Q switches grid focus. Hold the Hop in control on touch/mouse, or hold E while inspecting cargo; release/cancel/blur/range loss/close cancels an incomplete hold. ×/Escape/Tab or dungeon click closes and cancels an existing boarding seat. No new full-menu navigation or separate cargo ownership. Existing server serial action validation handles simultaneous final-space deposits atomically.
Inspiration: Grounded storage places player inventory alongside container and confirms selected-item deposits (https://grounded.wiki.gg/wiki/Storage_Chest); Sea of Thieves container inventory separates inventory focus and transfer (https://www.trueachievements.com/game/Sea-of-Thieves/walkthrough/2). Adapted for the user's one-way cart deposits, not copied as two-way storage.


## V93 · approved compact station preview applied
Agreed: carry the reviewed workbench layout into crafting/brewing: much smaller icon-only grids, locks over unlearned recipes, visible empty room for future items and mobile-friendly controls. Selected name/effect on right, ingredient sprites with available/required counts, one keycap action changing from Hold to unlock into Craft/Brew. Unlock1s holds cancel safely and never also craft on release. Future slots are noninteractive and distinct from locks. Workbench6recipes+6reserved, potion3recipes+9reserved; no new recipe content.
Implementation choices: potion station build uses the same1s confirmation for shared-gold spend. Desktop64px cells shrink to48px for compact landscape and44px on narrow screens. Actual recipe selection supports WASD; native focused action supports E/Enter/Space and touch hold/tap. Preserve recipe prices, ownership, shared material validation and actual craft destinations (sack first, shared stash fallback); isolated preview's sample stash counter was illustrative, not a new destination rule. Details/help remain optional; footer Back label shortened. Existing item-local success feedback retained. Actual phone/browser QA still deferred.


## V94 · matching panels and space-filling reserved grids
Agreed: workbench right side uses the campfire panel size; campfire uses compact workbench grid sizes and placeholders. Both left sides fill with grid slots. Apply same shared station treatment to potion station. Keep actual action behaviours and costs.
Implementation: common1.3:1 panel split, gutter/padding/detail width and compact cell sizing. Shared station-grid helper measures available content area and fills whole rows/columns with decorative plus slots. At least one future row remains; very tight panels can scroll rather than hide real actions. ResizeObserver updates dimensions and actual column count for keyboard navigation. Right details have independent scroll.64px cells normally,48px for short/narrow layouts,44px at very narrow widths. No gameplay, save or purchase changes.


## V95 · approved packing-first stash
Agreed: preparing the sack is primary, organisation secondary. Apply reviewed two-grid preview, single selected name/short effect and changing Pack1/Return×N action. D/A crosses facing grid edges, sack centred vertically against stash; remove visible Shared stash text. Menu is inset so lair remains visible behind it. Keep phone hit areas/paging and expose item-specific blocked reasons. Empty stash cells remain real storage, not decorative future recipe slots.
Implementation: keyboard crossing maps actual row-centre screen coordinates to nearest receiving row; paged stash navigation uses local3x3indices, preserves the page on return and does not cross while carrying a stash stack for rearrangement. Secondary Arrange lives with footer tools, extended details behind i. Dashed destination calls existing packItem on a cloned bag, including automatic rotation and stack merging; cannot reserve or spend anything. Render selection only on active grid. Existing one-unit take/whole-stack return/server authority preserved, test supplies labelled Remove test. Currency/count headings hidden; stack counts and accessible ownership labels remain. Right/left canvas sizes preserve44pxphone cells. Physical-phone/browser rendering QA deferred.


## V96 · content-sized stash and automatic alphabetical order
Agreed: reduce whitespace/window size, remove bottom buttons and i, centre Lair stash title, close X at top left. Replace player-facing manual arrangement with alphabetical automatic sorting. Keep packing strip/action and visible background.
Implementation: content-sized stash shell,540pxdesktop/380pxtouch maximum widths and existing viewport margins/internal overflow. Footer and i hidden for stash only, shared station controls retained elsewhere. Close X invokes normal cleanup. Sorted display is derived by English item names, without rewriting authoritative shared slot arrangements or stock. R/Arrange inactive in this view; underlying compatibility API remains for saved/server data and legacy callers. Selection follows type through reordered peer changes; depleted selected type clears to an empty slot rather than silently selecting another transfer. Other station UI/domain/ownership/capacity unchanged.


## V97 · carry tidy stash treatment across lair stations and map
Agreed: another equivalent pass over campfire/craft/potions/map after approving the compact stash. Smaller inset windows, visible lair background, centred titles and top-left close, reduced peripheral buttons/text.
Implementation: station windows bounded720pxwide/480pxhigh desktop and660pxwide/viewport-minus48pxon short landscapes, with existing responsive real grids and internal scrolling. Remove footer toolbar/i for those screens; existing ability and recipe primary actions/XP/materials retained. Critical item limits shown concisely inline and success/failure status moved beside action. No recipes, currency costs, effects or multiplayer validation changes. Station Guide/Test controls no longer visible in player footer; compatibility handlers/data remain.
Map: content-sized620pxpanel, destination art/names, common finds, difficulty and contextual E/Set route. Inline standard-vs-Hard tradeoff replaces info button; current route tick and accessible label distinguish saved choice from selected draft. Removed duplicate visible route-status and Lair footer button. X/Escape cancels draft, Set route commits existing command and E repeats ignored. No departure changes.

## Game Workshop · 20 October 2026

Agreed direction: tileset drawing guidance/templates; importing tilesets, item sprites and audio; editing costs and drop rates; map-specific graphs; testing drafts in conversation.

First implementation for review: separate disposable solo workshop based on V97, not an automatic change to multiplayer saves. Uses the existing five32pxtile mapping in a128×64atlas. Per-map loot edits and charts share the current search pools/depth/count rules; existing generator/run-setting bounds are retained. Imported assets/settings travel together in a version1JSON export. Exact averages exclude treasure replacements and personal Lucky effects. Broader animation/furniture authoring and multiplayer editor writeback remain future work.

### Approved next slice: prove the tileset workflow

Add a bright diagnostic sheet, review wall/corner/hallway joins, and verify importing, playing, exporting and reopening before expanding editor features. The test sheet preserves existing transparency, numbers/colours all five pieces and marks source orientation. It is applied only to the selected map draft. Three join views use production terrain-layer rules. Automatic draft saving remains a later improvement, not part of this slice.

### Lair artwork setup approved

The lair also needs its own terrain and station art in a separate workshop section, with drawing templates and the real room layout preview. Added independent five-piece terrain sheet and static PNG slots for stash, workbench, campfire, map table, departure minecart and both potion-building states. Larger legacy station visuals use 64×64 canvases with their interaction anchor at (32,48); potion visuals use32×32 at (16,16). These are replacement art bounds, not new colliders or a layout editor. Existing station locations/targets remain unchanged. Custom bodies use grounded depth ordering. Rails/rug/bedding retain current drawing. Version2 project export carries the new lair section; exact version1 exports migrate without replacing earlier choices.

## Deep layered terrain workshop — approved direction, 20 October 2026

The 47-pattern guide was too large and too shallow for the intended full-height walls. User approved a simpler assembled-room concept with substantial wall faces and separate caps, and requested map/tools changes toward it. Replaced the proposed atlas with a 128×128 4×4 layered sheet: 13 active pieces and three spare cells. One 32px floor, cap and full-height face, four cap edge trims, four inside-corner overlays and two face ends. Screen-down wall projection, local foreground fade and boundary shell composition are first-pass implementation choices for playtesting. Same floor/collision/guard geometry and station anchors. Workshop default terrain is the new example for lair/all three maps. User PNGs auto-detect deep vs legacy dimensions; legacy art is never repainted or converted. Existing V97/multiplayer downloads are unchanged. Continue validating actual art feel and phone movement before promoting the sample to a multiplayer release.

## Narrow corridor visibility correction

User reported one-tile vertical hallways hidden by the raised walls. Rendering must preserve visibility of every walkable floor cell even when no goblin is nearby. Raised caps whose projected destination is floor now draw as a six-pixel cutaway lip inside their own wall cell, after the face. Other caps keep their full elevation; tall faces and the existing grid remain. No additional drawing pieces or changes to generator widths are required.

## Reference-style classic walls — 20 October 2026

User supplied upload/image.png to identify the chosen Classic Roguelike Tileset reference, then accepted the readback: a continuous outline, taller back faces, narrow sides, low foreground rims, coherent corners/ends and visible one-tile paths. This supersedes the raised-block/cutaway experiment as the target direction. Build a small proof before switching workshop defaults. Exact texture/palette matching is secondary to the wall silhouette and join readability.

## Classic wall workshop integration approved — 20 October 2026

User approved classic-walls-preview.png and requested the map/sprite/tile workshop update. Default lair and all dungeon test terrain now use that fixed-silhouette style. New128×96sheet has9pieces: floor, back, left/right sides, front rim and four outer corners;3sparecells. Unlike the prior raised-cap experiment, these cells do not project into walkable floor and do not require proximity fading. The renderer combines fixed pieces for inside joins/ends. Existing128×64and128×128art remains supported without converting PNGs. The approved proof layout is selectable alongside existing join scenes. Station/item/audio/balance workflows and isolated-save rules are retained.

## Ordinary room-door trial — 21 October 2026

Agreed experiment: hold E to open an ordinary room door progressively; releasing before fully open closes it quickly, while fully opening leaves it open. This is separate from key-operated treasure locks.

Trial values: 2s to open, .3s to close, stationary hold, one opener at a time. Closed and partly open doors block movement and sight; full opening releases both for the whole team. Interrupted holds cancel on movement, hit, unavailable state, stale/disconnected input or incompatible actions. Initial placement is at most one suitable single-width, single-entrance ordinary room; spawn, treasure/key-source rooms, initial guards and cages are excluded. Some layouts have no suitable door. Wider doors and guard-operated doors are deferred until the basic interaction is reviewed.


## Door gaps and guard test room — 21 October 2026

Agreed: closed ordinary doors block guard sight; opening gaps reveal the room progressively according to the panel position. Releasing E before latching closes the panel and breaks sight again. Guards retain last-seen pursuit/search memory. Fully opening leaves the door open for the run. This supersedes the trial's all-or-nothing sight mask; movement remains blocked until fully open.

Built a disposable two-room workshop fixture with one guard looking toward the door, searchable furniture, a hiding barrel and an escape point. Uses real guard/search/hiding/door rules, without reinforcements, normal-save access or external calls. Test-room loot remains in containers; the separately discussed visible surface coins/keys are not implemented in this pass.


## Room purposes and loot — 21 October 2026

Agreed direction: rooms should have purposes such as dining hall, storage room, prayer room, bedroom, kitchen and armoury, and purpose can influence loot. Implemented first-pass seed-based room assignments in actual solo, server dungeon and generator previews, plus room/furniture snapshot metadata. Arrival room remains the original setup.

Still experimenting: the initial room weights, weighted material multipliers and placeholder furniture sets. Reuse the existing one-tile placement/solid mask, doorway reservations, object counts, search durations and empty/one/two/rare/depth rolls. Map cupboard supply weights provide the room's material base before room preference multipliers. Existing item registry supplies all common and rare valuables. Special treasure-room/key placement rules remain unchanged. Larger furniture footprints, room-specific architectural shapes, surface coins and placed keys remain future passes.

## Visible furniture coins and treasure keys — 21 October 2026

Agreed: visible coins on suitable furniture and the treasure key placed visibly rather than requiring a container search. Tap E to pack into the ordinary finite sack; escape banks coins, and the matching run key opens the shared treasure lock once. Multiplayer has one authoritative shared item: the first successful pickup removes it for everyone. Full sacks leave it in place. Searching the supporting furniture is a separate action and never produces a duplicate key.

Trial implementation: original small sprites/glints, furniture-specific surface anchors, and at most one copper/silver coin on an eligible surface in each non-arrival room (60% chance; 75/25 copper/silver). Coins are extra to existing container rolls; Balance charts explicitly exclude them. These rates remain trial source data rather than new editor controls. Key placement prefers a usable surface outside the treasure room, with reachable approach. No new static props, footprints, collision or save schema. Workshop offers Try visible key & coins (Manor seed 1, beside key, guards removed) plus coins in all six existing room fixtures.

## Dining and storage room layouts — 21 October 2026

Agreed next slice: make dining halls and storage rooms recognisable through their arrangement, testing the existing doors, sight, hiding and visible loot together before extending the other four room types.

Implementation for review: dining rooms favour a central two/three-tile table with aligned benches separated by a one-tile aisle; storage rooms favour north/south two-tile shelf rows with end circulation and separated columns. The shared placement system retains protected doorway/corridor/centre cells, legal interaction approaches and connected floor. The whole room falls back to its compact arrangement when its existing number of searchable objects cannot fit. Original search counts and loot rules remain; changed walking distances can change depth-based individual rolls. No new furniture sight-blocking or hiding mechanic. Existing door-panel sight is retained. Default guard patrol stops shift to the nearest legal floor cell if interior furniture occupies their original stop. No extra stock, player actions or save migration.

Still experimenting: exact footprints, placement preferences, original placeholder art and how often compact rooms fall back. The other four room types retain their earlier arrangements; dedicated furniture artwork/import templates remain a later pass after layout review.

## Remaining room layouts and furniture authoring — 21 October 2026

Agreed: complete the prayer room, bedroom, kitchen and armoury arrangements, then provide furniture drawing templates and imports using stable actual footprints.

First implementation: prayer altar against the back wall with pews flanking the central aisle; bedroom bed along a side wall, wardrobe/dresser along the back and an existing hiding barrel in a corner; kitchen stove/pantry at the back with an interior work counter; armoury racks on opposite walls with an equipment chest. Preferred whole-grid placements use the existing protected lanes, approaches and connected-floor validation, retaining the compact room fallback and original searchable count. Bedrooms may receive a corner hiding barrel even when outside the usual hiding interval. Exact arrangements and original placeholder art remain trial choices.

Furniture authoring: 25 exact-size PNG slots cover the existing kinds and compact/multi-tile variants, at 32 source pixels per floor tile. Each has transparent blank, current-art example and guide PNGs. Guides identify the solid footprint, floor grid, depth edge and any loose-coin/key anchor. Workshop imports use the exact matching footprint across all map cultures; searched art fades automatically. New artwork is isolated in workshop drafts/playtests until explicitly integrated elsewhere. The optional furniture field extends version 2 projects; earlier version 1/2 exports migrate with an empty field and preserve settings/assets. PNGs are size checked, included in exports, and decoded before a test starts. Collision, anchors, loot rules and player action rules are unaffected by art imports.

## Workshop cleanup — 21 October 2026

User preferred a cleanup over adding more workshop systems. Kept existing asset/balance/game behavior and reorganised the editor: project actions and draft status in the header; single-row scrollable navigation; map/difficulty context only for map tiles, balance and playtest; art tools in consistent cards; guides, diagnostic sheets and detailed costs behind expandable sections. Playtest separates dungeon/lair exploration from room selection, with specialised checks in a collapsed group. Stop is disabled while no test is running. No autosave or new game features in this pass.

## GitHub Pages solo release — 21 October 2026

Agreed: polish and package the game with workshops secondary, ready for the user to create a GitHub Pages site; multiplayer is understood to be unavailable on static hosting. No repository/account or automatic publication was requested.

Created a public title page with direct solo entry, first-raid instructions and a restrained footer link to Creator tools. Creator page links the existing combined workshop, drawing templates and disposable trials. Main game retains normal starting resources, progression and browser save keys; no workshop XP/stock or storage-disabling adapter is used. Release-only renderer uses the approved classic terrain across the lair and all three maps. In-game menu returns to the title; trial menus return to Creator tools. Workshop art/balance drafts remain separate from normal saves. Server/admin pages are absent from active static navigation; source/server code is preserved as a download for future development.

Publishing format: ready-made root-level index/game/creator HTML, relative asset/navigation paths, workshop and trial subdirectories, drawing-template/source downloads and a publishing README. Deploy from main/root without a Node build step. Creator tools are secondary public pages, not an authenticated private area. Build/repackage command is npm run build:pages; actual publication remains with the user.

## Base container artwork slots — 23 October 2026

**Agreed behaviour:** user asked for the plain Chest, Cupboard and Crate to join the workshop Furniture section, following the room-furniture pattern. These are the searchables in rooms without a purpose (the entrance room). New slots baseChest_1x1, baseCupboard_1x1 and baseCrate_1x1 sit alongside the 25 room-furniture slots, with blank, example and guide PNGs. Chest and crate are 32 × 32. The cupboard is 32 × 64: the bottom tile is its solid footprint and the top tile rises up the back wall, matching the original cupboard's height. Searched art fades like other furniture. The storage room's Supply crate keeps its own separate slot.

**Still experimenting:** the cupboard's one-tile wall height is an AI choice made to fit the existing art; hiding barrels, torches, cages and guard doors still have no art slots.

## Campfire ability icons in the workshop — 23 October 2026

**Agreed behaviour:** user asked to edit menu items in the workshop, choosing menu words, ability icons, menu look and new items, and agreed to start with campfire ability icons. Items & audio now has an Ability icons picker for all six abilities, with blank, example and guide PNGs. An uploaded icon replaces the drawing in the campfire grid and detail panel, and Quick fingers at the workbench. Icons are keyed by ability, so Quiet hands and Lucky goblin no longer have to share the Vanish potion and coin item art. Effects, costs and slots are unchanged. Icons are included in project export/import; older exports load with no ability icons.

**Still experimenting:** icon size is 32 × 40 px to match the existing menu icon canvas (an AI choice; item art stays 32 × 32). Next agreed steps, one at a time: menu words, menu look, then new items reusing existing behaviours.

## Menu words in the workshop — 23 October 2026

**Agreed behaviour:** user approved the second menu slice: rename gear, potions and campfire abilities and reword their text, with new names applied everywhere, words only, and "the numbers pull from the effect". A new Words tab edits name, short line, effect and limits for gear (plus effect and limits for abilities). Numbers are written as {placeholders} filled from the live effect values; unknown placeholders are refused. The game's own wording now lives in src/menu-words.js using the same placeholders, so default text is unchanged word for word. Lucky Goblin's 5-point gold bonus moved into config (LUCKY.passiveGoldChanceBonus) so its text can read it; the value is unchanged. Words are saved in project exports; older exports load with none.

**Still experimenting:** a few fixed tips and prompts written into the game (for example the smoke bomb hint and the PACKED LUNCH revive label) still use the original names. Recipe ingredient amounts written inside some limits text are plain words, not placeholders. Next steps: menu look, then new items.
