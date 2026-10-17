import { isFloor } from './world.js';

export const HUMAN_TERRAIN_SOURCE = Object.freeze({
  manifest: 'assets/human/GreenTeam-tileset.json', image: 'assets/human/GreenTeam-tileset.png'
});
const terrainTileNames = ['floor', 'wall_top_horz', 'wall_vert', 'wall_corner_top_left', 'wall_bottom_horz'];

export function terrainFrames(metadata, imageWidth, imageHeight) {
  const integer = n => Number.isSafeInteger(n) && n > 0;
  const spacing = metadata?.spacing ?? 0, padding = metadata?.padding ?? 0;
  if (!metadata || !integer(metadata.tileWidth) || !integer(metadata.tileHeight) || !integer(metadata.columns) || !integer(metadata.count)
    || !Number.isSafeInteger(spacing) || spacing < 0 || !Number.isSafeInteger(padding) || padding < 0 || !metadata.tiles
    || !integer(imageWidth) || !integer(imageHeight)) throw Error('Invalid tile-sheet dimensions.');
  const { tileWidth: width, tileHeight: height, columns, count } = metadata;
  if (padding * 2 + columns * width + (columns - 1) * spacing > imageWidth) throw Error('Tile-sheet columns exceed the image.');
  if (padding + Math.floor((count - 1) / columns) * (height + spacing) + height > imageHeight - padding) throw Error('Tile-sheet count exceeds the image.');
  const frames = {};
  for (const name of terrainTileNames) {
    const tile = metadata.tiles[name], index = tile?.index;
    if (!Number.isInteger(index) || index < 0 || index >= count || tile.kind !== (name === 'floor' ? 'ground' : 'collision') || !tile.tags?.includes('human')) throw Error(`Missing or invalid Human tile: ${name}`);
    const x = padding + index % columns * (width + spacing), y = padding + Math.floor(index / columns) * (height + spacing);
    if (x + width > imageWidth - padding || y + height > imageHeight - padding) throw Error(`Tile exceeds the image: ${name}`);
    frames[name] = { x, y, width, height };
  }
  return frames;
}

export async function loadHumanTerrain(fetchData = fetch, makeImage = () => new Image()) {
  const response = await fetchData(HUMAN_TERRAIN_SOURCE.manifest);
  if (!response.ok) throw Error('Could not load the Human tile-sheet JSON.');
  const metadata = await response.json();
  if (metadata.image !== 'GreenTeam-tileset.png') throw Error('Human tile-sheet JSON names an unexpected image.');
  const image = makeImage(); image.src = HUMAN_TERRAIN_SOURCE.image;
  await image.decode();
  return { image, frames: terrainFrames(metadata, image.naturalWidth ?? image.width, image.naturalHeight ?? image.height) };
}

// Wall art follows the walkable floor. These choices never modify collision tiles.
export function terrainTile(world, x, y) {
  if (isFloor(world, x, y)) return { name: 'floor', flipX: false };
  const north = isFloor(world, x, y - 1), south = isFloor(world, x, y + 1);
  const east = isFloor(world, x + 1, y), west = isFloor(world, x - 1, y);
  if (south) {
    if (east !== west && !north) return { name: 'wall_corner_top_left', flipX: west };
    return { name: 'wall_top_horz', flipX: false };
  }
  if (north) return { name: 'wall_bottom_horz', flipX: false };
  if (east || west) return { name: 'wall_vert', flipX: west };
  const belowRight = isFloor(world, x + 1, y + 1), belowLeft = isFloor(world, x - 1, y + 1);
  if (belowRight || belowLeft) return { name: 'wall_corner_top_left', flipX: !belowRight };
  if (isFloor(world, x + 1, y - 1) || isFloor(world, x - 1, y - 1)) return { name: 'wall_bottom_horz', flipX: false };
  return null;
}

export function drawTerrainTile(ctx, art, world, x, y, px, py, size) {
  const tile = terrainTile(world, x, y);
  if (!tile) return false;
  const frame = art.frames[tile.name];
  if (tile.flipX) {
    ctx.save(); ctx.translate(px + size, py); ctx.scale(-1, 1);
    ctx.drawImage(art.image, frame.x, frame.y, frame.width, frame.height, 0, 0, size, size); ctx.restore();
  } else ctx.drawImage(art.image, frame.x, frame.y, frame.width, frame.height, px, py, size, size);
  return true;
}
