# Early progression proposal — review after V66

Status: accepted18October2026 and implemented for playtesting in V67. The figures and three-run example below record the original V66 review. V67 changes the three proposed loot endpoints; existing saved lairs retain their chosen odds until explicitly updated. Starter gear, crafting/upgrade prices and other gameplay rules remain unchanged. See README for adoption steps and docs/v67-balance-audit.json for the production comparison including Hard.

## Recommendation

Improve early reward reliability before reducing upgrade prices or adding starter gear. Test near-empty chance70%→45%, far-empty chance50%→35% and near-material chance75%→55%. Keep the far-material endpoint20%, depth-based rare odds10%→80%, two-item chance15%, sale values, XP rate, gear costs and guard rules unchanged. These are interpolation endpoints, not blanket probabilities for every container. The first staged implementation should keep solo defaults and fresh-server defaults consistent; existing saved lairs have their own tuning and need an explicit update choice rather than silent replacement.

Fewer empty searches alone barely fixes early money: the Manor six-container sample rises from5.14 to6.62gold. Changing the early material/valuable mix too raises it to12.38 while retaining about one scrap and one cloth. No guaranteed ruby/chest grant is proposed; avoiding a new entrance-only farming reward keeps this pass small.

## Current rules from source

| Rule | Current value | Recommendation for first test |
| --- | --- | --- |
| Fresh shared lair stock | 1 snare, 2 scrap, 1 cloth; no gold | Keep; enough for a trial snare and one replacement |
| Initial goblin | 0XP, snare recipe known | Keep |
| Sack | 3×3; one snare uses one square | Pack one snare, leave eight squares |
| Snare | 2 scrap + 1 cloth | Keep |
| Smoke | 1 scrap + 2 cloth after personal recipe unlock | Keep |
| Quick fingers | 30 personal XP, +10% search rate | Keep price/effect for now; judge usefulness after loot pace |
| Smoke recipe | 50 personal XP | Keep |
| XP | 1 per gold of recovered valuables | Keep |
| Level display | Every100 lifetime earned XP; spending does not reduce it | Keep |
| Gold | Shared bank; no implemented facility/shop spending | Keep future facilities separate from this slice |

A +10% search rate divides search duration by1.1, about9.1% less time. Materials/gear/debug supplies give no XP. Failed solo runs pay no XP and lose carried goods. Unused real gear returns on escape. Lunch remains test-only/without a chosen crafting recipe; do not count unlimited test supplies as progression.

Sources: src/config.js, lair.js, profile.js, loot.js, search.js, jobs.js, tuning.js and generator-settings.js; server/dungeon-session.js for team settlement.

## Generated-content audit

Reproduced production generation order for furniture/hiding/treasure; default architecture presets and Normal difficulty. Seven scenarios×100 seeds=700 generated maps, using the same100 deterministic seeds across scenarios. The six/twelve closest non-treasure-room containers are sorted by their generated approach-path distance. Their contents are valued using real sale rules. Treasure keys add no sale value; the locked-room prize is excluded from early subsets. Raw complete-map summaries include locked treasure.

This measures available contents, not a player route, carrying/packing, travel, guard encounters, survival, search completion time or extracted loot. Some paths may pass through other rooms; opening the nearest six is a content sample, not a simulated safe run. Counts assume all sampled contents could be recovered. Existing saved custom tuning is not sampled. Small differences in observed empty counts between candidates arise because content choices consume the deterministic random stream differently.

| Scenario | Gold in six nearest | Six have no valuables | Scrap / cloth in six | Gold in twelve nearest |
| --- | ---: | ---: | ---: | ---: |
| current-manor | 5.14 | 43% | 0.82 / 0.74 | 12.15 |
| current-hold | 5.35 | 39% | 0.80 / 0.77 | 26.79 |
| current-sanctuary | 6.08 | 40% | 0.79 / 0.80 | 16.92 |
| candidate-manor-empties-only | 6.62 | 28% | 1.41 / 1.43 | 18.25 |
| candidate-manor-empties-and-mix | 12.38 | 9% | 0.99 / 0.99 | 26.36 |
| candidate-hold-empties-and-mix | 12.31 | 10% | 1.00 / 1.02 | 39.37 |
| candidate-sanctuary-empties-and-mix | 13.99 | 13% | 1.06 / 1.02 | 33.98 |

Original raw results: docs/early-balance-audit.json. Reproduce and extend with `node scripts/audit-early-balance.mjs 100`: the script now labels historical cases V66, implemented defaults V67, and adds Hard comparisons; output for V67 is docs/v67-balance-audit.json. No production save or server is opened. Candidate settings exist only on each temporary generated world.

Architecture differences matter: Manor has about53 searchable objects/map versus14 in Hold and20 in Sanctuary in this sample. Twelve searches therefore cover much more of Hold. Do not equalise total-map gold or treat twelve searches as equal effort. Hard difficulty and team size should be measured in the next implemented playtest, not assumed balanced by this Normal-only audit.

## First three successful runs — concrete target

This is an illustrative single-goblin learning path, not scripted rewards or a guaranteed outcome. No upgrade is forced.

| Successful run | Intended experience | Example haul value / earned XP | Purchase after return | Available XP after purchase |
| --- | --- | ---: | --- | ---: |
| 1 | Try one snare, search nearby rooms, bring materials home | 20 (scroll8 + candlestick12) | Save up | 20 |
| 2 | Choose a longer route and replace the used snare | 30 (sword20 + horn10) | Quick fingers30 | 20 |
| 3 | Bring back a stronger haul, perhaps try the optional room | 35 (ruby25 + horn10) | Smoke recipe50 | 5 |

Total85earnedXP buys both current upgrades for80. A player can save the first50 for smoke instead; a lucky25gold ruby may speed the schedule. A poor run should still give progress rather than guarantee this purchase timeline. The sample supports a more promising reward supply, not a claim that every short run yields20gold.

Each example can carry one scrap and one cloth alongside the valuables in a nine-square sack. Assuming one snare is used each run and those materials are recovered: starting2scrap/1cloth plus the starter snare leads to shared3/2 after run1,2/2 after crafting/using a replacement in run2, then1/2 after the same in run3. That leaves exactly the material cost of the first smoke bomb after unlocking it. Footprints fit; actual searching, survival and resource collection still need playtesting. Gear is optional; no automatic refills or loss compensation are proposed.

## Team and save constraints

Existing multiplayer rewards give each departed goblin the same personal XP from the entire team's recovered valuables, including eligible downed/offline participants. Shared gold banks once. This is intentionally faster per-person progression when a larger team returns more loot; the three-run example is solo and must not be advertised as a party-wide timetable. Do not divide team XP, scale prices by player count, change waiting-player eligibility or grant supplies on reconnect in this pass.

Do not change old stock, XP or purchases. Saved lair tuning persists independently of new defaults; document how to opt an existing test lair into the new loot endpoints. V67 adds the near-material endpoint to the tuning editor and strict validation. Legacy loading alone fills the previously implicit75%; editor submissions must include the complete current field set.

## Checks for an implemented playtest

- Re-run seeded audits with identical seeds; no-valuable early Manor sample should fall substantially while retaining crafting materials. This statistical goal is not a per-run guarantee.
- Play three genuine successful Normal solo runs and record searches, returned gold/materials, gear used/lost, and upgrade choices. Also record failures so success-only results do not hide frustration.
- Repeat with two goblins sharing stock/loot; verify equal eligible XP and bank-once rules, and assess how quickly the two current unlocks exhaust.
- Verify old saves retain their stock/profiles/tuning unless explicitly updated; fresh solo/server settings agree.
- Check Hard still offers a meaningful risk/reward increase and that Hold/Sanctuary effort differs sensibly. Do not change guards in this slice.
- Only then revisit Quick fingers strength, recipe prices, additional upgrades or spending shared gold.
