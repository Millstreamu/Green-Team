# Sleep darts and Clang bell — recorded first-slice design

V71 status: Clang bell now implemented using the recorded values below and corrected equip→walk→Space/Use aim→Space/Use throw controls. Fixed jailer posts, known-hiding pursuit and body pickup retain priority. V70 dart controls remain. The original proposal below is historical where superseded.

V70 control correction: E equips the selected dart without entering aim; walk normally, press Space/Use to aim, then press again to fire. Esc/Cancel returns to walking with that dart equipped. This supersedes immediate aim on equip in the original control proposal below.

Status: sleep dart first slice accepted and implemented in V69 after the user approved building it. The design below records its proposed foundation; the Clang bell remains a future proposal. Dart controls,8seconds, one-shot/one-square,6tile range,12tile/second projectile and75XP/1scrap+2cloth test costs are used in V69. No bell is implemented.

## What each item is for

The user's established intent: sleep darts put guards to sleep for a set time; a thrown Clang bell brings nearby guards to investigate. The recommendations below define a small, testable version. All additional durations, ranges, costs, controls and team rules are proposals.

A dart buys a reliable opening against one guard. A bell redirects several guards before they have a clear target. Neither is a new damaging weapon, permanent guard removal or substitute for the future invisibility/berry abilities.

| Proposed first-playtest value | Sleep dart | Clang bell |
| --- | --- | --- |
| Sack footprint | One square per dart; no stacking | One square per bell; no stacking |
| One item provides | One shot | One throw and one ring |
| Maximum aim range | 6 tiles | 5 tiles |
| Effect | One guard sleeps for8seconds | Eligible guards within8tiles of walkable path distance investigate the landing point |
| After arrival | Not applicable | Look around for2seconds |
| Investigation time limit | Not applicable |8seconds from the ring, including travel; no indefinite lure |
| Workbench craft cost |1scrap +2cloth →1dart |1scrap +1cloth →1bell |
| Personal recipe unlock |75XP |25XP |

Keep the existing starter snare, smoke/Quick fingers prices and lair stock. Do not grant these items to old saves or require a new displayed-level threshold. Debug test copies can use existing free-supply tagging, with no resale, XP or conversion into real stock. Proposed costs are for a later dedicated gear test, not a claim that V67's first-three-run progression already includes these purchases.

## One aiming pattern on phone and PC

Select the packed item and press E to equip, as with current gear. Equipping closes the sack and leaves movement available; press Space/Use to enter aiming mode; the item remains in its square until actually fired/thrown. Aiming temporarily stops walking, like existing snare aiming.

| Action | Phone | PC |
| --- | --- | --- |
| Aim | Left floating stick moves the reticle | Mouse points, or WASD/arrows move the reticle |
| Commit once | Tap Use | Press Space |
| Cancel | Cancel button | Escape |

Show a small aiming line/reticle, item icon and available-copy count near the existing controls. No extra page panel or central narration. Require release of a previously held Use/Space before accepting a fresh press; key repeats cannot fire copies. Cancel, item switching, sack opening, menu opening, focus loss or going down exits aim without consuming the reserved item. New modes must not alter smoke's existing quick-use behaviour or snare's hold-E placement.

A legal launch spends exactly the selected item, exits aiming and requires equipping another copy for another use. Pressing Use without a valid aim/state does not spend anything. Once launched, a dart miss or a bell that no eligible guard hears still spends the item. The reticle preview assists aiming but does not guarantee a hit on a moving guard. An already launched effect continues if its thrower is subsequently downed or disconnects.

## Sleep dart behaviour

Recommend a straight, non-homing projectile, up to6tiles at12tiles/second. It stops at the first guard or blocking wall/solid scenery; no shooting through walls or piercing several guards. Floor/aim preview uses the existing canvas/world coordinate conversion. Goblins neither take damage nor block teammates' darts in this first slice.

On impact with an awake guard, cancel its attack/movement and apply8seconds of sleep. A dart arriving before a committed swing resolves can prevent that swing; it cannot undo damage already resolved. Use the same deterministic impact-before-guard-update order in solo and server. A hit on an already sleeping guard consumes the launched dart but does not extend or stack sleep. Simultaneous hits therefore cannot multiply the duration.

A sleeper cannot notice, chase, attack, pull goblins from hiding, pick up bodies or carry them. If hit while carrying a captive, use a single existing-style drop transition: the goblin remains downed at a legal nearby position, original spilled loot remains where it was, and rescue is still required. Do not duplicate bodies/items or automatically revive the captive. Preserve snare timers independently; sleep and snare are different effects.

For the first test, walking past, bell noise and ordinary guard alerts do not wake a sleeper early. The guard wakes after its timer, checks for a currently visible standing goblin, and otherwise uses its last legitimately known position/search behaviour before returning to its existing route/post. It must not track unseen movement while asleep. There is no new guard-damage system in this slice; future wake-on-damage rules remain separate work.

A sleeping guard has a clear head symbol and draining timer indicator visible in the world. Do not add permanent map revelation. A blocked shot has impact feedback; no central message is needed.

## Clang bell behaviour

Recommend a floor-targeted throw: a legal landing is within5tiles, on reachable clear floor with an unobstructed throw line. Clamp aiming range; invalid landing stays red and cannot be committed. The small throw arc is a visual, not permission to pass through walls/locked doors. The landed bell is non-solid, not reusable loot and cannot jam a doorway.

On landing, ring once. Find guards within8tiles by a valid walking path to the bell, so sound can reach around a nearby corner but cannot attract guards through an inaccessible wall or closed locked threshold. A guard must have an actual reachable approach; otherwise it ignores the bell.

Eligible: patrolling/lookout guards, or guards searching after losing sight of their target. A guard currently seeing a standing goblin, resolving an attack, sleeping, snared or carrying a captive ignores the ring. A visible goblin always overrides investigation. This makes the bell a planning/distraction tool rather than a guaranteed escape button mid-chase.

An affected guard investigates the landing point at its existing search speed, looks around for2seconds, then returns using its existing route/post rules. Stop this special investigation after8seconds even if it cannot arrive. Ringing does not reveal the thrower, refresh every tick, or force a guard to forget a subsequently visible goblin. A later eligible bell can replace an earlier destination, rather than queueing endless investigations. If a route becomes blocked, the guard resumes normal behaviour instead of walking through the obstruction or being stuck indefinitely.

Use a brief landing ripple and a small bell/question indicator over affected guards. Teammates can see the shared bell/effects in-world; this does not give them guard positions on the map. The bell disappears visually after its investigation window and is not bankable/recoverable after a throw.

## Alerts and multiplayer rules

Recommendation: sleeping a guard and hearing a bell do not by themselves increment the reinforcement counter. Real guard sightings/alerts still use existing rules; a dart does not refund an alert already caused. This is separate from the future crate trap, whose reinforcement-counter cost was explicitly requested by the user. Do not silently give the bell the crate trap's alarm rule.

Each player's aim/selected item is personal; projectiles, impacts, sleep timers, rings and guard responses are shared authoritative world state. Server checks ownership, active/standing actor, item presence, no held cursor item, no hiding, finite/clamped aim and a fresh valid use. It spends one item and creates one effect atomically. Do not trust client-provided target IDs, sleep durations or affected guard lists. Validate projectile hits and bell hearing on the server.

Two shots/throws by different goblins both cost their own copies. Same-item repeated requests must not create another effect: validate the reserved item ID is still present, with no automatic substitution of another copy. All peers receive the same resulting guard state. Rejoining reads the current effect timer rather than restarting it. An expired/disconnected actor cannot issue a new action. Departures/extraction/server restart clear transient projectiles and effects using existing run lifetime rules. Packed, unused real copies follow current return/loss rules; debug copies retain their tags.

## Concrete examples

**Dart:** a goblin takes one dart, aims at a corridor guard and fires. The dart lands; the guard sleeps8seconds. Both players can cross. Another dart hitting the sleeper does not extend the opening. After waking, the guard can notice either goblin normally.

**Bell:** a goblin targets an empty corner5tiles away and throws. Two reachable patrolling guards hear it and investigate; a third guard still seeing a teammate keeps chasing. The team slips through the vacated route. A guard seeing a goblin en route abandons the distraction and pursues normally.

## Checks before calling an implementation playable

- Mouse, keyboard-only and two-thumb aiming/confirm/cancel all work; holding E to equip or held Space/Use cannot spend several copies.
- Cancelled/invalid use keeps the item. Valid launch consumes once, including a miss/no listeners. Repeated same-item requests cannot consume a different copy or duplicate an effect.
- Dart obeys range and collision, stops at first guard, sleeps for the server timer, never stacks duration and does not pause unrelated guards.
- Wake/reacquisition works for lookout, room patrol and roamer; carrier sleep drops once without revival or duplicate loot.
- Bell routes nearby eligible guards around corners, respects blocked paths, prioritises visible goblins and terminates/returns cleanly.
- Sleep/snare/smoke/search/rescue/guard swing and ordinary alert counters keep their separate meanings.
- Two clients agree on durations, outcomes and item conservation under simultaneous use and reconnection. Save/commit failure never plays successful use feedback.
- World art stays in the shared grounded draw order. Effects stay within the scene. Audio uses replaceable named slots (dart-fire, dart-hit, guard-sleep, bell-ring), ready for the user's future recordings; no upload editor is built here.

Suggested implementation order after reviewing the design: shared aimed-use controls and dart lifecycle first, then sleep/capture interactions, then bell investigation, and finally costs/unlocks plus solo/two-client playtests. This is one focused gear slice; the remaining potions/abilities stay deferred.
