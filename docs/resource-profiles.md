# Map resource profiles · V79

The map table shows Common finds from the same profile used by the shared solo/server loot generator. These are relative biases, not guaranteed drops or exclusive resources. Manor favours meat/cloth; Hold favours scrap/meat; Sanctuary favours berries and mushrooms.

Only the selection inside an already-successful material roll changes. Search empty rate, item count, resource-versus-valuables chance, rarity, value, furniture placement, recipes and saved tuning stay intact. Existing active dungeon contents are already rolled; a new run uses the new weights.

## Initial weights

Numbers are relative weights within each container's material pool. These are playtest choices, not percentages of all searches or guaranteed loot.

| Map | Container | Scrap | Cloth | Meat | Berries | Mushrooms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Human Manor | Chest | 1 | 3 | — | — | — |
| Human Manor | Cupboard / crate | 1 | 3 | 4 | 1 | 1 |
| Dwarf Hold | Chest | 3 | 1 | — | — | — |
| Dwarf Hold | Cupboard / crate | 3 | 1 | 4 | 1 | 1 |
| Elf Sanctuary | Chest | 1 | 1 | — | — | — |
| Elf Sanctuary | Cupboard / crate | 1 | 1 | 1 | 4 | 4 |

Every map keeps positive weights for all five basics in cupboards/crates. Chests retain the V76 restriction to scrap/cloth. Resource mix varies with container mix and depth as well as these weights; layout sizes/furniture counts differ, so compare resource share alongside total yield rather than promising equal per-run quantities.

## Extending content

- Define a new resource once in `src/loot.js`, with a stable ID, display name, footprint and `material: true`. Integrate its stock migration/default and any recipe using existing save/crafting patterns.
- Add its positive integer weight to desired containers in `src/resource-profiles.js`. The profile helper accepts arbitrary container IDs and resource keys, validates material IDs/weights and freezes the data. There is no four-resource switch in selection code.
- Add its ID to a profile's `common` list if it should appear under Common finds. Names come from the item registry; the UI needs no separate label table.
- A new container's existing material pool is the fallback when that map has no override. A new map without a resource profile also keeps that fallback. Unknown IDs cannot accidentally read inherited object properties.
- New map types still follow the existing route/layout registration and saved-layout compatibility process; this change does not build a custom map/content editor.
- Keep all current basics available on every map unless the user explicitly changes that design. Add generated-content, save-compatibility and actual-use checks when adding an ingredient, rather than declaring an unused placeholder resource.

Each pool consumes the same single existing random selection as before. The shared generator copies selected contents into searchable objects; neither clients nor this module reroll an active dungeon. User-selected tuning remains separate from resource identity weights. The current admin does not edit these profiles; they are isolated content data for a future editor.

## Verification

Thirty paired seeds per map per Normal/Hard difficulty (180 profiled runs plus180 fallback comparisons) retain identical empty counts, item counts and valuables while changing material identities. Aggregate output retains every basic resource and shows the intended biases. Authoritative dungeons match solo generation before shared treasure/key replacements; map table labels update with route changes. These are content checks, not human survival, extraction or acquisition-time measurements.
