# Multiplayer rules review

Status: discussion draft, 17 October 2026. V21 remains the current playable prototype.

The user requested a pass over multiplayer questions that should accompany feature planning. This reviews the systems already in the game. Recommendations below are proposals, not accepted requirements. Discuss a small batch at a time; record answers here and in decisions.md. Server setup and multiplayer playtesting are still deferred.

## Already agreed

- One player controls one goblin; everyone plays through a browser.
- The team lair has shared gold, materials, crafted stock and recipe unlocks. Personal carried sacks hold separate item copies.
- Successful return sells valuables and deposits materials/unused gear. Taking supplies uses lair stock. Debug items do not create real stock.
- Goblins can trigger/waste armed snares without being harmed. A newly placed snare waits for its setter to step clear.
- Team extraction requires all standing participating goblins together; downed goblins are excluded from the leave counter. A teammate can revive a downed goblin to one health using a Packed Lunch. Downing spills sack contents as recoverable floor items; the revived goblin can pick them up again. Exact handling of an unrecovered goblin remains open.
- Guards capture downed goblins into the nearest preplaced cage, prioritising standing goblins in sight. Allies can rescue captives; cage sites have a largely stationary jail guard. Capture interruption and cage-release details remain open.
- Keep the game lightweight for inexpensive hosting. No working multiplayer or shared online save exists yet.

## Batch 1 — choosing and starting a job

Accepted by the user, 17 October 2026:

| ID | Decision | Agreed rule |
|---|---|---|
| A1 | Who chooses job and difficulty? | Anyone can interact with a map-planning station in the lair. The latest confirmed selection stays selected until someone changes it. This replaces team voting. |
| A2 | Readiness / departure | Everyone readies at a separate minecart departure point. Ready means ready to go, not approval of a destination. Map/difficulty edits do not clear readiness; departure uses the latest selection. |
| A3 | New arrivals during a run | Wait until the next run. Reconnecting an existing goblin is a separate question. |

The lair has distinct functions: stash, workbench, map-planning station and departure minecart. The cart sits on tracks leading into darkness as the travel theme. Keep the selected destination/difficulty visible so teammates know what they are preparing for. Do not implement a vote or host-only selection gate. Tie-breaking is no longer relevant.

Confirmed clarification: even if someone readies on Normal and another changes it to Hard, readiness remains and the party departs on Hard if that is the selection when the cart leaves. Do not add a reset, destination approval or confirmation gate. Freeze the live run profile at actual departure.

Confirmed cart interaction: E boards/marks ready; E again hops out/unreadies. When all participating goblins are aboard, start a three-second countdown. A goblin hopping out cancels it. Destination changes still do not clear readiness.

Remaining preparation follow-up:

- Implemented locally in V30: stash/workbench packing first, separate map confirmation, then board the cart. Planning never starts the dungeon or spends gear; the final departure moves the prepared bag once. Online coordination remains future work.

One job profile/seed must be frozen for the departed run and shared by everyone. Subsequent edits at the planning station cannot alter a live dungeon. New arrivals still wait for the next run. Server implementation remains deferred.

“Host” means the person organising the session. It does not mean their browser must simulate the game or their computer must host the server. An inexpensive shared server remains the intended hosting direction; technology/setup choices are not made by this review.

## Batch 2 — escape, downing and recovery

Accepted user answers, 17 October 2026:

| ID | Decision | Agreed rule |
|---|---|---|
| B1 | Leaving | All standing participating goblins must be together to leave. Downed goblins do not count toward the leave check, so survivors can leave without them. No individual extraction/banking while another standing teammate continues. |
| B3 | Ground revival | A teammate can revive a downed goblin to one health using a Packed Lunch before capture. Player-carrying a downed goblin out is not allowed. Restoring a goblin to standing adds it back to the extraction count. |
| B5 | Capture / jail rescue | A guard picks up a downed goblin and carries it to the closest preplaced cage. Cage locations are fixed for that generated map and have a largely stationary jail guard. Allies can rescue from cages, restoring one health without a Packed Lunch, at greater risk than a coordinated ground revival. A carrying guard that sees a standing goblin drops its captive and chases the standing goblin. |
| B6 | No rescuers left | When no standing, free goblins remain, end the failed run and return everyone to the lair. Loot left behind is lost. |
| B7 | Rescue interaction | Hold E on the teammate or cage. Moving or taking damage cancels. Packed Lunch is consumed only when a ground revival completes; interrupted attempts keep it. |
| B4 | Sack on downing | Sack items spill onto the floor immediately. They can be picked up again, including by the goblin after recovery. Do not delete them at downing or automatically restore a packed sack on revival. |

Unresolved before implementation:

- Packed Lunch crafting/unlock cost and cage opening duration are still unset. Ground revival uses the previously proposed three-second hold; interruption cancels progress. Consumption on completed ground revival and preserving the lunch on interruption are now agreed.
- Repeated revival limits, pickup delay/interruptions, how many goblins fit in a cage, jail-guard pursuit limits and whether a delivered guard returns to its original routine. No bleed-out timer or self-escape rule has been chosen.
- Group exit interaction/countdown/required proximity; do not automatically copy the departure-cart countdown onto extraction.

Implementation proposal: choose the nearest reachable preplaced cage by walking-route distance, reusing navigation. Guards transporting a captive move that goblin’s body; previously spilled floor loot remains where it fell. Dropping a captive returns that goblin to the downed state at the carrier’s current location; do not create another body or move/respill the loot originally dropped. This state handling follows the agreed drop-and-chase behavior. Pickup and cage opening timing still need tuning.

Implementation notes: transfer bag contents to ground exactly once per down event, preserve item IDs/metadata/debug tags and clear the bag. The quick-use equipment display is a reference to a carried copy, not another item to duplicate. Recollection uses normal floor pickup and sack fitting. Proposed held-cursor behavior: drop that carried item too. Future loss settlement should concern items actually left behind, not also delete a copy already recovered by a teammate. Successful survivor-group extraction banks/sells only the escaping goblins' actual carried contents once. Downed goblins remain left behind; floor items teammates recovered belong to those actual carried copies and must not also be lost/deleted by prior ownership.

## Batch 3 — joining, leaving and connection loss

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| C1 | How many friends is the first supported party? | Four, with counts/difficulty tuned for that target. | Another explicit limit; do not assume unlimited. |
| C2 | What if someone's connection drops? | **Agreed:** grey/translucent goblin for 60 seconds; guards ignore it and players cannot interact. Reconnect restores the same goblin immediately. Timeout spills its sack and removes it from this run. | Supersedes the vulnerable-disconnected-goblin proposal. |
| C3 | What if the session host leaves? | Transfer organiser controls to another player; do not erase the lair or restart the world. | Pause launch/await a designated owner. |
| C4 | Can a player deliberately leave or abandon? | Leaving affects their goblin/gear; one player's button cannot silently abandon the whole team's run. | Team-abandon action with an explicit group rule. |

C2 agreed details: when the game detects disconnection, start a 60-second grace timer and show that goblin grey and see-through. Guards cannot see/target/hit the disconnected goblin, and teammates cannot interact with it. Reconnection before timeout restores control and ordinary visibility immediately, with no extra protection from nearby guards. Preserve its sack and goblin identity rather than granting a new loadout. At timeout, spill its remaining sack contents once and remove that goblin from the current run, as accepted from the preceding proposal. A later arrival follows the existing wait-for-next-run rule. Repeated reconnects must never duplicate gear, floor loot or rewards.

Agreed: disconnected goblins are excluded from the group departure counter throughout the 60-second grace period, so they cannot block connected survivors leaving. Reconnection during an ongoing run restores the normal standing-player departure requirement. Agreed: if connected survivors leave before a ghost reconnects, that disconnected player returns to the lair without its dungeon sack; it receives no sale/banking reward for items left behind. A later reconnect joins the lair rather than resuming the finished dungeon. Items already recovered and carried out by a teammate are settled normally and never deleted by former ownership. Agreed exception to no-free-standing-player failure: if the only remaining standing goblin is disconnected, keep the run open for its remaining 60-second grace, not a fresh timer. Reconnecting allows play to continue; expiry with no standing rescuer ends the run as a loss. With several standing ghosts, use their existing individual timers and fail only when none remain eligible to return. Downed/carried/caged ghosts do not gain standing status from disconnection. Still pending: disconnect while downed/carried/caged/hidden; interrupted interaction/reservation cleanup; repeat-disconnect grace policy. Reconnect should preserve prior health/recovery state, not silently revive a goblin, but exact special-state rules require review. Connection loss must not reset dungeon heat/alerts/reinforcements or pause the shared world. This is future multiplayer behavior, not implemented in V24.

## Batch 4 — searching and carrying loot

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| D1 | Can two goblins search the same container? | **Agreed:** one active searching goblin per object; contents spill once. | Cooperative speedup not selected. |
| D2 | Can goblins exchange equipment and valuables? | **Agreed:** drop on the floor; teammate picks up using existing controls. | No direct trading screen needed. |
| D3 | Should goblins collide with each other? | **Agreed:** goblins pass through each other to prevent doorway blocking. | Solid teammate collision not selected. |

Engineering default to verify rather than ask as a game preference: two simultaneous pickup attempts cannot both receive the same item. A full sack never consumes someone else's pickup or loses floor loot. Another player's cursor/reticle is local UI, not a claim on an item.

## Batch 5 — shared gold, stash and preparing gear

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| E1 | Can everyone spend shared gold on future lair improvements? | Everyone can; show the team what was purchased. Personal recipes now derive from each goblin’s XP, not shared gold. | Host-only group purchases or approval above a threshold. |
| E2 | When are prepared supplies taken out of shared stock? | **Agreed:** transfer immediately from stash into personal sack; putting back restores stock. First successful transfer gets the last copy. | Launch-time reservation model superseded. |
| E3 | What if two people rearrange the same stash stack? | Briefly reserve that stack for the mover; others can use the rest of the stash. | Allow moves to fail cleanly when another change wins. |

Crafting, purchases and withdrawals must validate against the same shared quantities in one operation. Agree whether a moving stack also blocks crafting with its materials. Whole-stack movement cannot hide available stock forever if its player closes the panel or disconnects. One gold stack and its displayed balance remain the same quantity.

Agreed preparation flow: each goblin packs its own sack at the shared stash before boarding the departure minecart. Taking an item transfers that actual copy immediately out of shared stock into the goblin's sack; putting it back reverses the transfer. If two players try to take the last copy, only the first successful transfer gets it. A full sack rejects the transfer without spending stock. Departure must not deduct packed supplies again. This replaces reservation-only preparation as the chosen flow; V27 implements the local direct-packing flow and removes the quantity picker; online team coordination is still future work.

Crafting output correction, agreed: crafted items go into the crafter's personal sack first if they fit. Shared-stash overflow was subsequently explicitly approved and implemented in V27. Use existing sack footprint/fit rules; never consume materials unless the output has a valid destination. This supersedes the proposed always-to-shared-stash output. Where a recipe/progression belongs is now actively under reconsideration; do not mark the previous shared-recipe recommendation newly accepted.

## Batch 6 — guards, traps and team information

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| F1 | Does one spotted goblin alert every guard? | Guards react locally; they can change targets to a goblin they actually notice. | Room alarms or dungeon-wide alert, with explicit propagation. |
| F2 | How do guards choose between goblins? | Prefer their current visible target; switch when it escapes sight or another target is clearly nearer. | Always nearest visible player. |
| F3 | Do quick items/attacks affect teammates? | Smoke hides all goblins; snares waste harmlessly under any goblin as agreed. Decide damage items separately when added. | Other explicit friendly-effect rules. |

Per-player damage immunity, knockback and attack direction must remain separate. A guard's invisible trail belongs to its pursued target, not whichever browser updates last. Smoke must obstruct the same sight checks for everyone. Placement safety follows the actual setter's identity. No secret map/guard information should leak through another player's local UI unless the team intentionally shares it.

## Heat and reinforcements — V24 local implementation

Agreed: shared dungeon heat rises during sustained pursuit, including fresh trail-following, holds through brief sight breaks, and slowly cools after a grace period without pursuit. Higher heat gradually increases alerted guards' chase speed, capped just above goblin running speed at maximum heat. Keep routine routes and attack timing predictable; heat never reveals hidden goblins. Show readable heat feedback. Exact rates, delay and speed cap remain tuning parameters.

User additionally requested one extra guard entering the dungeon for every three chases/alerts. Reinforcements remain for the rest of that run: cooling heat does not remove them. The accumulating guards create increasing run pressure, eventually making continued looting/escape overwhelmingly difficult. Do not silently cap the guard count to negate that intended pressure. No automatic elapsed-time reinforcements were requested.

Agreed counting: each individual guard becoming alerted adds one to the shared run counter. Two guards catching the team together add two counts; three add three and bring one reinforcement. This intentionally makes being spotted by multiple guards substantially more dangerous. The previous recommendation to combine simultaneous guard alerts into one team incident is rejected. Every third guard alert adds one guard; carry any remainder forward, and retain the counter through heat cooling.

Count when each guard becomes fully alerted, not when the chase ends or each frame. A guard rearms only once it has finished searching and returned to its routine; brief sight breaks/reacquisition stay in the same alert cycle. Witnessing a completed hiding entry also fully alerts that guard and counts once. This follows the accepted proposal; no counting per player/browser.

Agreed reinforcement entrances: doors in some rooms' upper walls, not interactable by goblins. New guards are roaming patrol/searchers. V24 chooses solid north-wall sections, excluding the starting room, with a brief two-second warning at the selected door and in the HUD. Doors cycle in fixed order. Each guard caches a broad room sweep, pauses to look around and uses existing sight/chase/trail/attack/snare/smoke/hiding rules; no unseen-player location knowledge. Extra guards last for the run without a population cap.

Provisional HEAT values: full buildup in 30 seconds of pursuit, four-second quiet grace, full cooling over 20 seconds, maximum chase speed 1.08× goblin speed; routine/search speeds and attack timing unchanged. HUD shows heat, total alerts/remainder, extra guard count and pending arrival. State resets on a new run; lair/finished runs do not tick it.

Before networking, the server must count each guard's alert cycle once, tick one shared heat state and spawn queue once for the whole team, and send stable guard/door IDs and warning times to all browsers. One goblin hiding cannot cool heat while another is pursued. Joining/reconnecting must receive current state without replaying alerts/spawns. Difficulty/party scaling and jail-guard interaction remain open. Detection stays local even though pressure is shared. V24 is local runtime, not multiplayer implementation.

## Hiding — playable local slice, team details pending

Agreed: hold E for 0.5 seconds to enter, tap E to exit; one goblin per spot with a visible occupied indicator; no walking, searching or item use inside; guards that see entry approach and pull that goblin out; unseen entry is safe during nearby searches. V22 implements this locally with separate barrels and existing targeting/navigation/sight. V24 now adds local heat/reinforcements.

Prototype stores stable spot IDs, occupant ID and per-guard witness knowledge tied to a goblin ID. One occupant per barrel is now explicitly agreed. V23 also checks occupancy again at entry completion, so concurrent local attempts cannot both succeed. Before shared play, make reservation/release atomic on the server; decide disconnect/downing cleanup and how a witness prioritises a visible teammate. A hidden goblin must not stop guards pursuing others, reveal its location to non-witnesses, or independently cool team heat while others are chased. Current guard update remains single-target; do not call it once for every player as a substitute for target selection.

## Batch 7 — progress, difficulty and running the session

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| G1 | Whose lair/save is this? | **Agreed:** a persistent named home for each friend group, stored on the server independently of the organiser being online. Personal goblin progress travels between groups. | Invitation-host-owned lair not selected. |
| G2 | Does difficulty scale with party size? | Keep job/difficulty fixed for the run; consider scaling only at launch after comparing solo/team balance. | Fixed counts for every party size, or another explicit scaling rule. |
| G3 | Does retrying a job produce a new layout? | Each new run uses a new seed; reconnect uses the same live run. | A retry reuses the previous seed/layout. |
| G4 | Do menus or an unfocused browser pause the game? | Personal menus never pause the shared world; all-ready launch controls preparation. | A separate explicit team-pause rule. |

Define crash/restart recovery and update timing before hosting. Recommended operational starting point: durable lair transactions, no duplicated run settlement, game updates between runs, and a visible save/connection state. Whether to resume an interrupted dungeon or treat it as a lost run is a user decision, not a technical accident.

## Implementation responsibilities after answers

- The shared server is the single place that decides world state and outcomes; browsers send player actions and draw the result. This is a design direction, not server code added now.
- Stable IDs for lair, session, run, player, goblin, container, item and placed effects.
- One run seed/job/difficulty and one set of guard/effect timers for everyone.
- Prevent duplicate pickup, craft, unlock, supply reservation and escape settlement, including repeated/reordered requests.
- Separate party state (selection/readiness) from each goblin's state (alive/down/escaped/disconnected) and each person's local UI.
- Team-ready or extraction requirements must not accidentally include spectators or people waiting for the next run.
- Co-op-specific checks should cover simultaneous use, player departure and reconnection, not only one browser acting successfully.

## Audit evidence

| Current source | Solo assumption to revisit |
|---|---|
| main.js + loadout-view.js | A local job dropdown and Start immediately spend one sack's supplies and create the entire world. |
| run.js | One goblin's extraction/downing finishes the run. |
| lair.js | Browser-local counts/save; no simultaneous reservations or purchase arbitration. |
| loot.js + search.js | One cursor, one bag and one active search session. |
| guard.js | One player argument, one lastSeen/trail target and one damage recipient. |
| traps.js | Multi-goblin trigger list exists, but current main uses one fixed goblin ID. |
| smoke.js + render.js | Shared effect mechanics are reusable; the current cloud list/timers are browser-local. |
| input.js + stash-view.js | Menu focus/readiness/stack movement are local and need clear per-player ownership. |

The current prototype remains useful to test feel, but these assumptions must not be treated as the agreed multiplayer rules. Follow the batches above before implementing their related team behavior. Revisit the checklist when adding a new feature; do not turn it into an endless precondition for unrelated small fixes.


## Networking setup — server-based direction agreed

User considered P2P, then accepted the server-based recommendation. The shared dungeon runs independently of player browsers on a rented server, using Node.js, secure WebSockets/HTTPS and SQLite for durable shared-lair storage as the starting stack. No network code or hosting has been implemented. Colyseus remains a framework candidate, not a selected dependency; provider, budget, machine size and party limit remain open. Earlier server-responsibility notes now describe the chosen architectural direction.

Agreed starting dedicated setup: one continuously running Node.js game process using secure WebSockets, HTTPS delivery of browser files, and durable shared-lair storage (SQLite is the agreed starting storage choice, with backups). It owns guards, heat, counts, loot and saves independently of any player's browser. A small virtual server can host these together; actual capacity must be measured with growing guard populations. Colyseus is an existing framework candidate, not an adopted dependency. Static website hosting alone cannot run this continuously active game process.

P2P candidate: browsers exchange gameplay over WebRTC; for this shared-rule game a practical design still chooses one browser as the authority. Provide website hosting, a small signaling service for room/connection introductions, STUN discovery and TURN relay fallback where direct connections fail. Durable shared saves still need an explicit ownership/storage policy. If the authoritative browser leaves, transferring its latest game state and authority requires a separate host-migration design. Relaying traffic also has hosting/bandwidth costs; do not promise server-free or always-cheaper P2P.

References: https://webrtc.org/getting-started/peer-connections ; https://webrtc.org/getting-started/turn-server ; https://docs.colyseus.io/deployment ; https://docs.colyseus.io/server . The server-based direction and starting stack are agreed; no deployment or purchase is authorised. Multiplayer implementation/testing remains deferred until its playable slice is explicitly started. The P2P comparison is retained as background, not the current implementation plan.


## Personal progression and persistent group homes — direction agreed

User selected a persistent home for each friend group and said to run with the preceding split. Each named lair persists on the chosen server across logout, rather than belonging to whoever currently invites/hosts. Players can be members of several distinct lairs and choose which one to join through its invitation/link/code. Personal goblin XP/level, learned recipes and personal improvements/cosmetics travel with the player. Gold, shared materials, crafting stations and decorations belong to that group lair. Logging out does not erase either save.

Progression direction: personal XP unlocks learned recipes; shared gold improves lair facilities. A visiting experienced goblin brings recipe knowledge but still needs the local station/material requirements. This supersedes gold-buying-shared-recipes as the final progression design; V24's existing gold recipe purchase remains a prototype until the new progression slice is defined and implemented. No XP amounts, level thresholds, upgrade effects or station prices accepted yet.

Still open: account/reconnect identity, creator/member permissions and invitation revocation, offline access policy, personal gear/material portability and disconnect-held sack persistence, exact XP earning/distribution, unlock levels and how facilities gate recipes. Distinct group stock must not be duplicated across homes. Agreed personal XP: everyone participating in the run receives the same XP based on the team's recovered loot, regardless of which goblin picked up/carried it. This includes participants downed/captured/left behind; waiting new arrivals are not participants. Do not grant extra XP for personally claiming a teammate's pickup. Exact reward conversion, failure rewards, disconnected participant eligibility, thresholds and unlock schedule remain to define. Settle the team's actual recovered haul once, then credit each eligible personal profile once; reconnect must not replay the reward. Resolve these within a bounded progression slice before implementing accounts/rewards.


## V25 personal XP playable slice

User approved a bounded XP display/results/separate-save test. Provisional rate: one XP per gold of recovered valuables, reusing item sale values/Hard rounding. Materials, equipment/debug gear, empty escapes and solo losses produce no XP in this slice. Personal XP never decreases due to spending shared gold or losing a later run. No new level/unlock thresholds chosen. This is experimental pacing, not a final reward schedule.

Implemented local personal profile separate from lair storage. Reward calculation accepts a team haul and can credit multiple distinct profile IDs equally once per live result; tests cover that shared-haul calculation, not online multiplayer. Current UI still plays one goblin. Future server must use durable identities/run IDs and transactional rewards, with disconnected eligibility and failure bonuses decided before team implementation. Named lairs/account login, gear portability, crafted-output transfer and personal recipe unlock conversion remain future slices; do not imply these are implemented by the separate local save.


## V26 personal recipes implemented locally

User approved starting snares, automatic smoke knowledge at 50 total personal XP, no XP spend, unchanged material costs and workbench progress. Replaces the old gold-bought shared smoke recipe. Each craft checks the acting goblin's profile and shared materials; recipe knowledge is not a lair flag and one goblin learning/crafting never unlocks another. Existing shared gear remains usable without recipe knowledge. Thresholds are editable starting balance.

Camp schema3 removes shared unlock flags, preserves stock/layout and refunds the prior schema2 smoke purchase's 20 gold once. No XP granted for migration. Personal knowledge derives from the separate profile's saved XP. Crafted output is still the current solo shared-stash path; agreed sack-first crafting/direct transfer and named-home/server account UI remain planned, not implemented by this recipe slice. Server must eventually validate profile knowledge and spend shared materials/output once as one transaction.


## V27 direct packing and crafting overflow implemented locally

User approved shared-stash fallback when a crafted item cannot fit in the crafter's sack. V27 implements this with immediate stash-to-sack and sack-to-stash transfers, existing footprint/rotation fitting and one carried copy per item. Crafting consumes shared materials once, then prioritises the sack and otherwise stores output centrally. Cancelled departure retains gear, and actual departure never withdraws shared stock again. Quantity selection is removed; job/difficulty remains at the local departure screen for now.

Single-player local save schema4 persists the prepared bag and stock together and clears the saved prepared bag on launch. This is not the final shared storage structure: future server must key prepared bags by lair/player, generate shared unique item IDs, validate each transfer/craft/departure against live ownership, and commit quantities/output/stock once atomically. No client can claim another's packed copies. Group joining, creator/member permissions, disconnect handling for packed home gear, map-planning station and all-board cart readiness still require implementation/remaining review. Current debug supplies cannot generate real shared stock.


## V28 spendable personal XP supersedes automatic knowledge

User explicitly changed XP into a spendable personal resource and approved the first purchases: smoke recipe50 XP and permanent10% faster searching passive30 XP; snare starts known. This supersedes V26 automatic50-total-XP recipe acquisition. Buying deducts available personal XP once and stores explicit ownership; crafting thereafter uses shared materials only. Current workbench reuses recipe-card/button UX for purchases, ownership, crafting and passive display. Shared lair gold is unaffected.

Profile schema2 separates available XP, lifetime earned XP and owned purchases. Old schema1 saved XP becomes available balance and existing automatically learned smoke knowledge is preserved as a migration grant. New profiles must buy it. Current local server-free save is not account identity. Future backend must validate profile identity/balance and atomically debit/record each one-time purchase, never trust a browser's claimed owned list/search rate. Search duration is derived from the acting goblin and the same value drives its progress bar; teammates' profiles cannot be upgraded by another's purchase. Reward replay cannot replenish spent XP. No tiers/respecs/additional passives chosen.


## V29 passive upgrade station

User requested personal passives at a little lair campfire instead of the workbench. Implemented campfire station and a compact mode of the existing lair dialog: personal XP/passives only, same purchase/save rules. Recipe buying/crafting stay at the workbench. Neither station grants knowledge or passives to other goblins. Future server purchase commands must validate station/action and acting personal profile; no new multiplayer behavior or save change introduced.


## V30 map station and cart implemented locally

User approved the next slice using the already-agreed map/boarding rules. Upper-left map table confirms/saves the selected job/difficulty without starting; separate cart E toggles aboard, starts three seconds once all eligible participants are aboard, and E hop-out cancels. Editing selection preserves readiness/timer. The final departure uses the latest confirmed profile and generates one seed; later planning cannot mutate that run. Shared stock is not deducted twice and cancelled planning/boarding leaves prepared gear intact.

The coordinator supports an explicit participant list and excludes unlisted waiting arrivals. Current UI supplies one local goblin; no networking or simulated extra players added. Future server must own participant membership, proximity-valid boarding, clock, selection updates and one atomic launch. Menus in another browser must not pause that server countdown. Persist selected destination, not readiness/timers. The local confirmed destination saves in camp4; legacy saves default to Normal. Existing disconnected/late-arrival policies still require network integration, not new assumptions in this local slice.
