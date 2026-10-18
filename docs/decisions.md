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
