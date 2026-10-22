# Terrain drawing kit v2 — proposed format

This is an art specification for review, not an implemented game format.
The existing workshop still accepts only its original 128×64 five-piece sheet.
Do not import this 256×192 sheet into that importer.

## Draw at native size
8 columns × 6 rows. Each tile is 32×32 pixels, no padding or spacing.
Slot 00 is an opaque repeating floor. Slots 01–47 are wall connection shapes.
Use the construction PNG as a temporary reference layer; draw your art on a new
layer and hide the reference before export. The blank PNG is fully transparent.
The labelled guide is a reference, never a runtime atlas.

## What the tiles mean
North is screen up. Neighbour labels describe adjoining WALL, not floor.
Separate north/east/south/west artwork preserves top-left lighting; do not rotate
finished lit wall art to make another direction. Four-direction end caps,
horizontal/vertical thin walls, elbows, T junctions, cross junction variants,
inside corner combinations, isolated pillar and solid fill are all represented.
Diagonals matter only when both adjacent cardinal neighbours are walls. This
reduces 256 neighbourhoods to 47 wall patterns. Every pattern is indexed in JSON.

## Wall height and the old bottom rim
The old eight-pixel strip is a legacy renderer limitation, not the specification
for a proper south boundary wall. V2 uses a continuous wall cap/silhouette and
an eight-pixel visible face on exposed SOUTH-facing edges. The south boundary
still contains a wall body; it is not just a floating top strip. Side boundaries
have explicit left/right forms, plus caps and inside/outside joins.
All art stays within its 32×32 cell in this proposal. The inset silhouette is a
construction example, not a prescribed final stone texture. Collision continues
to use the full wall cell; drawings do not redefine walking or visibility.

## Layer order proposed
Floor underneath, wall cap/face above, props on their existing layer. Doors,
station sprites, torches and decals are separate assets, not connection tiles.
Lair, manor, dwarf and elf themes use the same slot meanings but different art.
Floor texture variants can follow once the structural set works.

## Professional references
Tiled: https://doc.mapeditor.org/en/stable/manual/terrain/
Godot: https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html
These describe matching corners/sides and neighbour metadata. Our 8×6 order,
wall depth and palette are project proposals, not their mandated atlas layout.

## Check before implementation
Review the room's four boundaries, doorway ends, L turns, T joins, one-cell
partitions and pillars. Then upgrade importer and shared renderer together,
retaining legacy projects. V2 game integration has not been done in this kit.
