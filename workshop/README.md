# Classic wall Game Workshop

The workshop now uses the approved continuous-outline wall style in map previews, the actual lair and all three dungeon playtests. Back walls have a tall stone face; sides are narrow; foreground edges are low. All wall art stays in non-walkable wall cells, so one-tile corridors remain visible without raised slabs or dynamic height changes.

## Start here

1. Tilesets → Check joins → Approved room & corridor proof shows the reviewed layout using your current sheet.
2. Download Working example and Drawing guide. Draw at native size using a32pxgrid.
3. Drop your PNG into the selected map, or choose Lair → Floor & walls to replace lair terrain separately.
4. Playtest → Test dungeon, or Lair → Walk around lair. Restart after changing a draft.
5. Export project before closing. Import restores artwork, costs and loot settings together.

## Nine-piece drawing sheet

One transparent128×96PNG. Four columns × three rows of32×32cells, no spacing or padding.

| Index | Piece | What to draw |
|---|---|---|
|00|Floor|Opaque repeating tile|
|01|Back wall|Full cell: stone cap at top, tall face below|
|02|Left side|6pxstrip at the RIGHT edge; room floor lies to its right|
|03|Right side|6pxstrip at the LEFT edge; room floor lies to its left|
|04|Front rim|6pxstrip at TOP; rest transparent|
|05|Outer NW|Right-edge vertical corner; copy example alignment|
|06|Outer NE|Left-edge vertical corner; copy example alignment|
|07|Outer SW|Top-right6×6corner|
|08|Outer SE|Top-left6×6corner|
|09–11|Spare|Leave empty|

The corner names describe their position around the room. The renderer combines these pieces for inside joins, ends, pillars and thin partitions. Draw complete fixed silhouettes, not separate floating caps. Use the example as a guide layer; hide labels/guides before exporting. The drawing-guide checkerboard represents transparency and is not artwork to paint.

Blank/example/diagnostic PNGs and slot metadata are in templates/classic-walls. The diagnostic sheet preserves silhouette/alpha and colours the pieces to check placement. Existing item sprites and station PNGs retain their established sizes and anchors.

## Existing projects

Both original128×64five-piece sheets and earlier128×128layered sheets remain accepted and retain their respective rendering. New128×96classic sheets use the approved wall rules. No PNGs are silently converted or overwritten. Empty terrain slots use the new classic sample. Project JSON remains version2; version1migration is retained. Lair and each dungeon's terrain remain independent.

This is the isolated solo workshop; ordinary saves and multiplayer files remain unchanged. Draft saving still requires Export project.

## Lair artwork

Open **Lair** for the actual 18 × 14 room layout. The lair owns its terrain sheet and station images separately from all three dungeon maps. Select Floor & walls or a station, download its blank PNG and drawing guide, paint at the stated dimensions and upload it. The layout preview highlights the selected image bounds and interaction anchor.

| Artwork | PNG size | Anchor inside PNG (x, y) |
|---|---|---|
| Floor & walls | 128 × 96 | Same classic sheet as dungeon terrain; earlier sheets still accepted |
| Lair stash | 64 × 64 | 32, 48 |
| Workbench | 64 × 64 | 32, 48 |
| Campfire | 64 × 64 | 32, 48 |
| Map table | 64 × 64 | 32, 48 |
| Departure minecart | 64 × 64 | 32, 48 |
| Potion station, built | 32 × 32 | 16, 16 |
| Potion station, unbuilt | 32 × 32 | 16, 16 |

The blue cross in a guide marks the fixed station interaction point; it is not part of the PNG to paint. Larger art canvases extend 1.5 source tiles above and half a tile below that anchor. The potion art occupies the existing single solid tile. Artwork bounds do not create new collision footprints or relocate stations. Keep unused space transparent. Static PNG replacement is supported here; these slots are not animation sheets. Rail tracks, rug and bedding keep their existing drawing.

Try test lair art loads diagnostic terrain plus numbered station placeholders for checking alignment. The built checkbox changes the preview and next disposable lair test only. Selecting a potion image also shows its matching built/unbuilt state. Walk around lair opens the actual solo loop with current lair art; replacement station bodies join the renderer's existing grounded depth ordering and keep the existing interaction highlights/labels. No multiplayer save or normal solo save is edited.

All lair images are included in Export project. New exports use version 2; exact version 1 workshop projects import with an empty lair section while retaining their assets, tuning and costs. Wrong-size or invalid-image imports leave the current project intact. Files for lair terrain and all seven station states are in templates/lair, with slot metadata in templates/lair-manifest.json. The live overview uses actual station positions from createLairWorld rather than a separately invented room plan.

## Items and sound

Choose an item to see its required PNG dimensions. Most are 32 × 32. A 1 × 2 item uses 32 × 64, a 2 × 1 item 64 × 32, the sword 32 × 96, and the L-shaped horn 64 × 64 with an unused transparent corner. Matching blank files and footprint guides are in templates/items. Sprite uploads are used by floor/sack/station item drawing and retain the original footprint, rotation and stack behavior. Campfire ability icons have their own picker under Items & audio: a 32 × 40 PNG per ability, shown in the campfire grid and detail panel (and at the workbench for Quick fingers). Only the picture changes. Goblin/guard animations remain outside this import pass. Lair stations have their own section above, and dungeon furniture its own Furniture section, including the plain chest, cupboard and crate. The cupboard PNG is 32 × 64: its bottom tile is solid and its top tile rises up the back wall.

Choose a sound cue, upload WAV/MP3/OGG/WebM and Listen. Clip playback uses the game's existing 18% volume. Keep clips short; maximum input file size is 5 MB. Audio still requires a user gesture in browsers. Original synthesized effects remain available by removing a replacement.

## Words

Open **Words** to rename workbench gear, potions and campfire abilities, and to reword their short line, effect and limits. Numbers in {braces}, such as {holdTime}, are filled from the game's real effect values, so the text stays true when balance changes; the buttons list each item's numbers with today's value. Typing a plain number changes only the words, not how the item works. A new name is used everywhere the game reads its item and ability lists: menus, sack, stash, Gear guide and the recipe unlock name. A few fixed tips and prompts written into the game, such as the smoke bomb hint, keep their original wording. Empty boxes or Restore original words return to the game's text. Words are saved in Export project.

## Balance and charts

Loot percentages and material weights belong to the selected map. Unlock XP and recipe ingredient costs apply across all maps. Run settings apply across all maps; generator parameters belong to the selected map. Only editable fields in the UI are supported: this does not yet edit sale prices, item effects, passive strengths or progression formulas.

The three charts compare expected item counts **per 100 ordinary searches**, at the same container type, relative path depth and difficulty. Values include empty searches and one/two-item rolls. Hovering a bar also gives the probability of at least one of that item. Expected counts and chances differ when a search can return two items. Empty/one/two percentages sum to 100. Hard adds the actual 15 percentage point rare-pool bonus; sale multipliers do not change drop counts.

The calculations use the shared search depth function and live container pools. Each item draw first selects material vs valuable, then rare vs common valuable; weights are conditional on selecting materials. Total average count equals (1 − empty chance) × (1 + two-item chance). These are exact marginal averages, not a simulation, a guarantee, or an estimate of a whole dungeon's haul. The game distributes different container types and depths over actual layouts. Treasure-room replacements, keys and personal Lucky bonuses are excluded and stated beside the charts.

## Test and keep a draft

Playtest starts the actual solo loop at the chosen map/difficulty/unsigned seed, or starts at the lair for costs and crafting. The test has 500 XP, 20 of each material and 100 gold. It never reads or writes normal solo saves and has no multiplayer connection. Restart the test to apply edits. The same seed holds layout generation constant; changing dimensions or topology parameters can still change it. Another seed samples a different layout. Leaving Playtest stops the game and clears held controls.

Export project downloads one versioned JSON containing tuning, all three map settings, costs and imported PNG/audio data. Import project restores it. Invalid imports leave the current draft intact. Export before closing: drafts are held only in this open workshop. Attach an export in conversation to promote selected settings/assets into a later game release. It does not automatically change the multiplayer server or an existing save.

## Development and verification

Build from the project root: `node scripts/build-classic-templates.mjs`, `node scripts/build-workshop.mjs`, `npm test`, then `python3 scripts/package-workshop.py`.

The shared terrain renderer supports classic fixed shapes alongside the two earlier formats. The ordinary game keeps its existing asset selection; the workshop adapter selects the new sheets and isolated supplies. The generated workshop contains a playable solo game, with no normal-save or multiplayer access.

Focused verification includes all 256 neighbour patterns, full 32px face geometry, directional joins, foreground fade rules, malformed-size rejection, deep/legacy PNG round trips, actual solo startup and movement equivalence. `node scripts/check-classic-walls.mjs` renders all join scenes plus lair/all-map sandbox frames with native Canvas. This is not browser/physical-phone verification; those remain untested here. Existing legacy and lair checks remain available.


## Door and guard test room

Open `door-guard-playtest.html` for a disposable two-room test, or choose Playtest → Door & guard room in the workshop. Turn phones sideways. Hold E to open the door slowly; release before full opening to shut it. The guard sees through the actual widening gap. Once fully open it stays open, allowing pursuit. Search the furniture, try the hiding barrel and return to the exit. Refresh to reset. This test never reads or writes normal saves.


## First room-type pass

Playtest → choose Room to try → Try room type. The disposable test chamber keeps the door, guard and hiding barrel while changing the room's purpose. Regular dungeon tests also assign room purposes deterministically from the seed. The entrance room keeps its original setup.

| Room | Placeholder furniture | Loot emphasis |
|---|---|---|
| Dining hall | Table, bench, sideboard | Food, coins, table valuables |
| Storage room | Shelves, supply crates | Mixed supplies, scrap and cloth |
| Prayer room | Altar, prayer benches | Scrolls, cloth, ceremonial valuables |
| Bedroom | Bed, wardrobe, dresser | Cloth, coins, personal valuables |
| Kitchen | Stove, counter, pantry | Meat, berries and mushrooms |
| Armoury | Weapon racks, equipment chest | Scrap, cloth and weapons |

Balance → Room compares exact item expectations and chances across all three maps. Selecting Base container shows the original container rules. Room-purpose material pools use the selected map's cupboard supply weights, then the room bias; room-specific common/rare pools use existing valuables. Empty-search, one/two-item and depth/rarity rolls retain their current settings. Treasure-room prizes and key placement keep their existing special rules. Room biases are first-pass values in source/src/room-types.js; map supply weights remain editable in the workshop. No room-bias editing UI in this version.

All room furniture currently uses original one-tile placeholder art and existing placements/collision. This is the first identity/loot pass, not final furnished architectural layouts or final art. Counts are unchanged. Normal saves are not touched by workshop playtests. Surface coins and loose keys are still planned separately.

### Visible surface loot

Playtest → **Try visible key & coins** starts a disposable Manor seed 1 beside its key, with initial guards removed. Tap E to pack the visible item without searching. Visit the locked room to use its key. **Try room type** also includes surface coins. Furniture can still be searched separately. Coins occupy ordinary sack space and bank only on escape; a full sack leaves the pickup visible. Container charts exclude these extra surface finds. First-pass placements and rates are in `src/surface-loot.js`, with drawing anchors in `src/room-types.js`.

### Dining and storage layouts

Choose Playtest → Room to try → Dining hall or Storage room → Try room type. Both use the existing two-room trial with a door, guard, hiding barrel, searchable furniture and visible coins. Dining tables and aligned benches are longer; storage shelves form rows with walking space at the ends. Normal dungeon tests use the same arrangements where space permits. Tight rooms keep the compact arrangement. Searchable counts and loot rules stay the same; actual depth can change as routes move. Artwork is placeholder art, and the other four room layouts are unchanged.

### All rooms and furniture artwork

All six room types now have preferred themed layouts. Choose Playtest → Room to try → Try room type. Prayer rooms have an altar and pews flanking a central aisle; bedrooms have a longer bed, wall storage and a corner hiding barrel; kitchens have a stove/pantry and work counter; armouries have wall racks and an equipment chest. Small or congested rooms retain their compact arrangement. Bedroom hiding barrels also use the normal placement and hiding rules.

Open **Furniture** to choose an artwork slot. Each footprint has a separate transparent blank, example and annotated guide PNG. Draw at exactly the listed dimensions (32 pixels per floor tile), keeping the body inside the full canvas and a transparent background. Blue lines show floor tiles; the yellow edge shows the depth-sorting edge; a yellow dot, where present, shows the existing surface-loot anchor. Do not paint guide lines into your blank artwork. Upload the PNG and restart a playtest. **Try in room** selects a representative room; layouts can use a compact variant, which has its own artwork slot. The preview shows the exact selected image even if that variant is absent from the representative room.

Exports include the furniture PNGs. Earlier version 1/2 projects import without needing furniture images; new PNGs apply to workshop solo tests, with the full source included for later integration. Furniture artwork does not change collision or create additional loot. Drawing templates are also in `templates/furniture/`, with a manifest mapping every slot to its exact size and type.
