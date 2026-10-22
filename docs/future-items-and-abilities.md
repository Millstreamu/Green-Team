# Future items and abilities — idea record

Recorded from the user,18October2026. Update: sleep dart is now implemented in V69; the other future ideas remain pending except the already-existing Packed Lunch. These are future design ideas, not an implementation request, final balance values, a complete skill tree or a change to the early-progression proposal. Preserve the specified effects and numbers; entries marked undecided must not be silently filled in during implementation. Names below are working labels unless already established.

## Items

| Item | User's intended effect | Specified values / open details |
| --- | --- | --- |
| Sleep darts | Put a guard to sleep for a set number of seconds. | Duration undecided. Delivery/aiming, range, ammunition, wake-on-hit/noise, alerted guards and repeated sleep are undecided. |
| Guard-disguise potion | Drink it to turn into a guard for a set number of seconds. | Duration undecided. Appearance versus actual recognition rules, what breaks the disguise and behaviour during an existing chase are undecided. |
| Invisibility-on-hit potion | Drink it; become invisible on the next hit. | Retain the phrase “next hit”: whether this means receiving damage or landing a hit is undecided. Trigger window, invisibility duration and break conditions undecided. |
| Gold-finding potion | Drink it to become5%more likely to find gold coins. |5%is the user's value; percentage points versus relative increase, duration, rolls affected and interaction with predetermined container contents are undecided. This affects finding gold coins, not all loot sale prices. |
| Scrying orb | Ping the3closest guards and mark them on the map for everyone. |3guards; shared team map information. Mark duration, range, refresh/static-versus-tracking positions, uses and fewer-than3guards handling undecided. |
| Clang bell | Throw it; nearby guards go to investigate. | Noise investigation is the intended effect. Throw range, attraction radius, whether it distracts guards already chasing, retrieval/consumption and duration undecided. |
| Pottery shards | Place them on the ground; a guard walking over them alerts you. | This is a warning to the player. User did not specify damaging/stunning the guard or adding to reinforcements. Placement area, lifetime, reuse/consumption, warning presentation and team visibility undecided. |
| Packed Lunch | Revive a teammate. | Already implemented for ground revival. Preserve current completed-hold consumption, interruption rules and separate item-free cage rescue. Craft cost/unlock still undecided; existing test supplies are not a final economy. |

## Abilities and upgrades

Only shadow invisibility was explicitly called highest-level. The user introduced berry blinding and the following examples as lower-level possibilities; individual unlock levels, prerequisites and active/passive classifications are not final. Do not infer a fixed tier for every entry from this list.

| Working name | User's intended effect | Specified values / open details |
| --- | --- | --- |
| Shadow stillness | Highest-level ability: standing still in shadows makes you invisible unless a guard is really close. | Shadow qualification, stationary activation delay, close-detection distance, reveal conditions and how this relates to ordinary invisibility are undecided. Shadows need an actual gameplay definition; visual darkness alone is not a settled rule. |
| Sack sacrifice | Spend one item from the sack to open all nearby chests. | One sack item is the cost. Eligible items, player choice versus automatic choice, stack/unit interpretation, radius, locked chests and whether opening also searches/spills contents are undecided. Do not silently expand this to cupboards/crates or auto-collect loot. |
| Hiding-spot anchor | While inside a hiding spot, set it as an “insert term”; from another hiding spot, teleport back to the set spot. | Term intentionally open. **“Anchor” is an assistant naming suggestion only.** Destination is the previously marked spot, not arbitrary travel between any two spots. Cost, cooldown, anchor limit/persistence, occupied destinations, detection, carried items and group ownership undecided. |
| Berry blind | Throw berries at a chasing guard; blind it for1second and make it lose chase. |1second of blindness and chase loss specified. Aim/range, charges/cooldown, whether berries are a sack item or ability resource, existing trail memory and re-detection after the blind are undecided. Do not assume permanent de-aggro. |
| Treasure-room bearing | Every20seconds, get an arrow toward the locked stash room if the map has one. |20-second interval. Arrow duration/location, wall/path-aware bearing and behaviour once the room is unlocked are undecided. User did not ask for an arrow to the key. |
| Crate trap | Turn an open, searched crate into a simple trap. A guard walking close gets stunned for1second; it counts toward the guard increase counter. |1second stun. Trigger distance, conversion cost/time, charges, reset/destruction and whether the counter increments on setting or triggering are undecided. The reinforcement-counter consequence is explicit and must be preserved; it is not a free silent stun. |
| More health | Simple health increase upgrade. | Amount, tiers, max-health/current-health behaviour and cost undecided. |
| Better sale prices | Get more gold from selling recovered loot. | Increase undecided. This is distinct from finding more gold coins. Ownership and shared-gold/personal-XP interactions need a team rule before implementation. |
| Alert speed boost | Get a speed boost when a guard is alerted. | Boost size/duration/cooldown, who must cause or witness the alert, whether it applies to all players and retrigger/stacking undecided. |
| Hiding lookout | While in a hiding spot, see the nearest guard on the map. | One nearest guard. Personal versus shared visibility, tracking frequency, range and whether the mark disappears immediately on exit are undecided. Unlike the orb, team sharing was not specified. |
| Search concealment | After searching a searchable, become “hard to see” for3seconds. |3seconds. **Hard to see means guards take longer to notice/see/become alerted to the goblin.** This is not invisibility or automatic chase cancellation. Modifier strength, successful/empty/cancelled-search trigger and refresh/stacking undecided. |

## Distinctions to preserve

- Sleep, stun, blind, hard-to-see, disguise and invisibility are separate ideas. Do not implement them as one interchangeable crowd-control status.
- The orb explicitly shares three guard markers with everyone; the hiding lookout's sharing rule is open. Pottery shards warn their user; they do not explicitly raise the guard alarm.
- The crate trap explicitly contributes to the reinforcement counter. Other tools' alert consequences have not been specified.
- Finding more gold coins and increasing sale proceeds are separate effects. Personal XP currently follows team recovered value; how a sale bonus changes XP is still open.
- Only recorded percentages/timings/counts are5%gold-finding,3orb targets,1second berry blind,20second bearing interval,1second crate stun,3seconds hard-to-see and one sacrificed item. No other numbers are approved here.
- These ideas can populate a broader progression tree later; their presence does not approve changing the30/50XP early upgrades or current balance defaults.

## Before selecting an implementation slice

Choose a small connected set, then define controls on phone/PC, inventory footprint/equip/use, durations/ranges/costs/cooldowns, unlock ownership, cancellation and guard re-acquisition. For multiplayer define whose action/effect it is, what everyone sees, concurrent uses, destination reservations for teleportation, downed/offline behaviour and server validation. Reuse existing items, shared stock, search, guard, hiding, map and status-feedback systems. Avoid deciding all of these now merely to record the ideas.

Related records: decisions.md, multiplayer-review.md, early-balance-proposal.md and feedback-assets.md. Existing sleep-dart mentions remain deferred; this list adds the user's new details. The future sprite/audio upload editor remains a separate recorded feature.

## V80 playable potion update

The user accepted the subsequent Vanish proposal: drink for immediate invisibility until hit, with a short duration. Vanish now lasts at most8seconds and also ends on searching or successful gear use; trial recipe75personal XP and brew2mushrooms+1cloth at the built potion station. This is the current playable slice. The original “invisibility on next hit” trigger in the idea table above is historical and has not been implemented as a separate effect. Gold-finding potion remains deferred. Guard disguise is already playable (10seconds, close recognition within1tile; 50XP, mushroom1+berries1).

## V81 Lucky playable update

User accepted +5percentage points gold-finding for the current run, per searching goblin, no stacking. Lucky is now implemented at the potion station:50XP recipe,1berries+1scrap trial brew. The older undecided gold-potion table entry is historical; see decisions/work-status for exact chance calculation, ordinary shared pickup/sale and run reset.
