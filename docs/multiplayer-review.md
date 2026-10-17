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

- Where the current gear-packing screen fits between stash preparation and cart readiness. The map station should not silently spend supplies or start the dungeon.

One job profile/seed must be frozen for the departed run and shared by everyone. Subsequent edits at the planning station cannot alter a live dungeon. New arrivals still wait for the next run. Server implementation remains deferred.

“Host” means the person organising the session. It does not mean their browser must simulate the game or their computer must host the server. An inexpensive shared server remains the intended hosting direction; technology/setup choices are not made by this review.

## Batch 2 — escape, downing and recovery

Accepted user answers, 17 October 2026:

| ID | Decision | Agreed rule |
|---|---|---|
| B1 | Leaving | All standing participating goblins must be together to leave. Downed goblins do not count toward the leave check, so survivors can leave without them. No individual extraction/banking while another standing teammate continues. |
| B3 | Ground revival | A teammate can revive a downed goblin to one health using a Packed Lunch before capture. Player-carrying a downed goblin out is not allowed. Restoring a goblin to standing adds it back to the extraction count. |
| B5 | Capture / jail rescue | A guard picks up a downed goblin and carries it to the closest preplaced cage. Cage locations are fixed for that generated map and have a largely stationary jail guard. Allies can rescue from cages, restoring one health without a Packed Lunch, at greater risk than a coordinated ground revival. A carrying guard that sees a standing goblin drops its captive and chases the standing goblin. |
| B4 | Sack on downing | Sack items spill onto the floor immediately. They can be picked up again, including by the goblin after recovery. Do not delete them at downing or automatically restore a packed sack on revival. |

Unresolved before implementation:

- Rescue interaction proposal: use the same hold-E rescue interaction for cages and ground revival, cancelled by movement/damage. Ground revival needs Packed Lunch; cage release does not. Cage opening method/duration is not yet accepted.
- Failure when no standing/free rescuers remain (all downed, carried or caged): previous immediate-all-down proposal was not accepted and must be reviewed against this capture loop. A zero-standing-player count must never trigger successful extraction. Leaving/disconnect handling remains a later batch.
- Packed Lunch crafting/unlock cost and consumption: proposed one lunch per completed three-second rescue, with interruptions resetting progress and preserving the lunch. Costs not yet set.
- Repeated revival limits, pickup delay/interruptions, how many goblins fit in a cage, jail-guard pursuit limits and whether a delivered guard returns to its original routine. No bleed-out timer or self-escape rule has been chosen.
- Group exit interaction/countdown/required proximity; do not automatically copy the departure-cart countdown onto extraction.

Implementation proposal: choose the nearest reachable preplaced cage by walking-route distance, reusing navigation. Guards transporting a captive move that goblin’s body; previously spilled floor loot remains where it fell. Dropping a captive returns that goblin to the downed state at the carrier’s current location; do not create another body or move/respill the loot originally dropped. This state handling follows the agreed drop-and-chase behavior. Pickup and cage opening timing still need tuning.

Implementation notes: transfer bag contents to ground exactly once per down event, preserve item IDs/metadata/debug tags and clear the bag. The quick-use equipment display is a reference to a carried copy, not another item to duplicate. Recollection uses normal floor pickup and sack fitting. Proposed held-cursor behavior: drop that carried item too. Future loss settlement should concern items actually left behind, not also delete a copy already recovered by a teammate. Successful survivor-group extraction banks/sells only the escaping goblins' actual carried contents once. Downed goblins remain left behind; floor items teammates recovered belong to those actual carried copies and must not also be lost/deleted by prior ownership.

## Batch 3 — joining, leaving and connection loss

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| C1 | How many friends is the first supported party? | Four, with counts/difficulty tuned for that target. | Another explicit limit; do not assume unlimited. |
| C2 | What if someone's connection drops? | Keep their goblin briefly in the world, vulnerable; allow reconnection to that same goblin. | Remove them immediately and define where their stuff goes. |
| C3 | What if the session host leaves? | Transfer organiser controls to another player; do not erase the lair or restart the world. | Pause launch/await a designated owner. |
| C4 | Can a player deliberately leave or abandon? | Leaving affects their goblin/gear; one player's button cannot silently abandon the whole team's run. | Team-abandon action with an explicit group rule. |

After choosing C2, specify timeout, retained sack identity and whether teammates can rescue/move the disconnected goblin. Repeated reconnects must not duplicate starting gear or escape rewards.

## Batch 4 — searching and carrying loot

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| D1 | Can two goblins search the same container? | One active search per object, visible to others; it spills its contents once. | Shared searching speeds it up, with a specified limit. |
| D2 | Can goblins exchange equipment and valuables? | Drop on the floor; another goblin picks it up using existing controls. | Direct handoff/trading screen. |
| D3 | Should goblins collide with each other? | Let teammates pass through each other to avoid doorway blocking in this first version. | Solid collision or pushing. |

Engineering default to verify rather than ask as a game preference: two simultaneous pickup attempts cannot both receive the same item. A full sack never consumes someone else's pickup or loses floor loot. Another player's cursor/reticle is local UI, not a claim on an item.

## Batch 5 — shared gold, stash and preparing gear

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| E1 | Can everyone spend shared gold/unlock recipes? | Everyone can; show the team what was purchased. | Host-only purchases or approval above a threshold. |
| E2 | When are prepared supplies taken out of shared stock? | Reserve copies while preparing; commit at launch, release on cancel/unready/timeout. | Spend immediately while packing and explicitly refund on cancellation. |
| E3 | What if two people rearrange the same stash stack? | Briefly reserve that stack for the mover; others can use the rest of the stash. | Allow moves to fail cleanly when another change wins. |

Crafting, purchases and withdrawals must validate against the same shared quantities in one operation. Agree whether a moving stack also blocks crafting with its materials. Whole-stack movement cannot hide available stock forever if its player closes the panel or disconnects. One gold stack and its displayed balance remain the same quantity.

## Batch 6 — guards, traps and team information

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| F1 | Does one spotted goblin alert every guard? | Guards react locally; they can change targets to a goblin they actually notice. | Room alarms or dungeon-wide alert, with explicit propagation. |
| F2 | How do guards choose between goblins? | Prefer their current visible target; switch when it escapes sight or another target is clearly nearer. | Always nearest visible player. |
| F3 | Do quick items/attacks affect teammates? | Smoke hides all goblins; snares waste harmlessly under any goblin as agreed. Decide damage items separately when added. | Other explicit friendly-effect rules. |

Per-player damage immunity, knockback and attack direction must remain separate. A guard's invisible trail belongs to its pursued target, not whichever browser updates last. Smoke must obstruct the same sight checks for everyone. Placement safety follows the actual setter's identity. No secret map/guard information should leak through another player's local UI unless the team intentionally shares it.

## Batch 7 — progress, difficulty and running the session

| ID | Question | Recommended starting rule | Alternative |
|---|---|---|---|
| G1 | Whose lair/save is this? | One persistent lair per friend group/server session, independent of who is organising today. | Separate player-owned lairs selected on joining. |
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
