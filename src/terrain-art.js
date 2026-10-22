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
  if (south) return { name: 'wall_top_horz', flipX: false };
  if (north) return { name: 'wall_bottom_horz', flipX: false };
  if (east || west) return { name: 'wall_vert', flipX: west };
  const belowRight = isFloor(world, x + 1, y + 1), belowLeft = isFloor(world, x - 1, y + 1);
  if (belowRight || belowLeft) return { name: 'wall_corner_top_left', flipX: !belowRight };
  if (isFloor(world, x + 1, y - 1) || isFloor(world, x - 1, y - 1)) return { name: 'wall_bottom_horz', flipX: false };
  return null;
}

// A corridor mouth can expose more than one face of the same wall square.
// Thin bottom caps are transparent below their rim, so they need a side behind
// them at inside joins. Diagonal art belongs only to outside corners.
export function terrainLayers(world, x, y) {
  const tile = terrainTile(world, x, y);
  if (!tile) return [];
  if (tile.name === 'floor') return [tile];
  const north = isFloor(world, x, y - 1), south = isFloor(world, x, y + 1);
  const east = isFloor(world, x + 1, y), west = isFloor(world, x - 1, y);
  const side = flipX => ({ name: 'wall_vert', flipX });
  if (north && !south && (east || west)) {
    const layers = [side(!east)];
    if (east && west) layers.push({ ...side(true), crop: { x: .5, y: 0, width: .5, height: 1 } });
    return [...layers, tile];
  }
  if (south && (east || west)) {
    const layers = [tile];
    // Retain the horizontal wall face and add only the vertical edge trim.
    for (const flipX of [false, true]) if (flipX ? west : east) layers.push({ ...side(flipX), crop: { x: .75, y: 0, width: .25, height: 1 } });
    if (north) layers.push({ name: 'wall_bottom_horz', flipX: false });
    return layers;
  }
  if (!north && !south && east && west) return [side(false), { ...side(true), crop: { x: .5, y: 0, width: .5, height: 1 } }];
  return [tile];
}

export function drawTerrainTile(ctx, art, world, x, y, px, py, size) {
  if(art.classic){for(const name of classicTerrainLayers(world,x,y)){const f=art.frames[name];ctx.drawImage(art.image,f.x,f.y,32,32,px,py,size,size);}return true;}
  if (art.deep) {
    if (isFloor(world,x,y)) drawDeepFrame(ctx,art,'floor',px,py,size);
    else drawDeepWall(ctx,art,world,x,y,px,py,size);
    return true;
  }
  const layers = terrainLayers(world, x, y);
  for (const tile of layers) {
    const frame = art.frames[tile.name], crop = tile.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    const sx = frame.x + crop.x * frame.width, sy = frame.y + crop.y * frame.height;
    const sw = crop.width * frame.width, sh = crop.height * frame.height;
    const dx = crop.x * size, dy = crop.y * size, dw = crop.width * size, dh = crop.height * size;
    if (tile.flipX) {
      ctx.save(); ctx.translate(px + size, py); ctx.scale(-1, 1);
      ctx.drawImage(art.image, sx, sy, sw, sh, dx, dy, dw, dh); ctx.restore();
    } else ctx.drawImage(art.image, sx, sy, sw, sh, px + dx, py + dy, dw, dh);
  }
  return layers.length > 0;
}

// Small layered sheet: one floor, cap, full-height face, four directional
// trims, four inside joins and two face ends. Last three atlas cells are spare.
export function deepTerrainNames() { return ['floor','cap','face','edge_n','edge_e','edge_s','edge_w','inner_nw','inner_ne','inner_se','inner_sw','face_left','face_right']; }
export const DEEP_TERRAIN_NAMES = Object.freeze(deepTerrainNames());
export function workshopTerrainArt(image) {
  const w=image.naturalWidth??image.width,h=image.naturalHeight??image.height;
  if(w===128&&h===96)return {image,classic:true,deep:false,frames:Object.fromEntries(classicTerrainNames().map((name,i)=>[name,{x:i%4*32,y:Math.floor(i/4)*32,width:32,height:32}]))};
  if(w===128&&h===128)return {image,deep:true,frames:Object.fromEntries(deepTerrainNames().map((name,i)=>[name,{x:i%4*32,y:Math.floor(i/4)*32,width:32,height:32}]))};
  if(w===128&&h===64)return {image,deep:false,frames:Object.fromEntries(['floor','wall_top_horz','wall_vert','wall_corner_top_left','wall_bottom_horz'].map((name,i)=>[name,{x:i%4*32,y:Math.floor(i/4)*32,width:32,height:32}]))};
  throw Error('Terrain PNG must be 128 × 96 px (classic), 128 × 128 px (earlier deep walls) or 128 × 64 px (legacy).');
}
export function classicTerrainNames(){return ['floor','back','side_w','side_e','rim','corner_nw','corner_ne','corner_sw','corner_se'];}
export function classicTerrainLayers(world,x,y){
  if(isFloor(world,x,y))return ['floor'];
  const n=isFloor(world,x,y-1),s=isFloor(world,x,y+1),e=isFloor(world,x+1,y),w=isFloor(world,x-1,y),layers=[];
  if(s)layers.push('back');if(e)layers.push('side_w');if(w)layers.push('side_e');if(n)layers.push('rim');
  if(!n&&!s&&!e&&!w){
    if(isFloor(world,x+1,y+1))layers.push('corner_nw');if(isFloor(world,x-1,y+1))layers.push('corner_ne');
    if(isFloor(world,x+1,y-1))layers.push('corner_sw');if(isFloor(world,x-1,y-1))layers.push('corner_se');
  }
  return layers;
}
export function deepWallParts(world,x,y) {
  if(isFloor(world,x,y))return [];
  // Draw the boundary shell, not a raised stone slab across all uncarved space.
  if(![-1,0,1].some(dy=>[-1,0,1].some(dx=>isFloor(world,x+dx,y+dy))))return [];
  const n=isFloor(world,x,y-1),e=isFloor(world,x+1,y),s=isFloor(world,x,y+1),w=isFloor(world,x-1,y);
  // A raised cap projects into the square directly north. If that square is
  // walkable, use a low cutaway lip inside this wall's own footprint instead.
  // This protects short corridors and doorway mouths even with no actor nearby.
  const capPlacement=n?{dy:0,height:.1875}:{dy:-1,height:1};
  const caps=[{name:'cap',...capPlacement}];
  for(const [open,name]of [[n,'edge_n'],[e,'edge_e'],[s,'edge_s'],[w,'edge_w']])if(open)caps.push({name,...capPlacement});
  for(const [a,b,dx,dy,name]of [[n,w,-1,-1,'inner_nw'],[n,e,1,-1,'inner_ne'],[s,e,1,1,'inner_se'],[s,w,-1,1,'inner_sw']])
    if(!a&&!b&&isFloor(world,x+dx,y+dy))caps.push({name,...capPlacement});
  // A full face also finishes foreground walls and exposed wall ends. Later
  // boundary caps naturally cover faces that continue into the next wall row.
  const faces=[{name:'face',dy:0}];if(w)faces.push({name:'face_left',dy:0});if(e)faces.push({name:'face_right',dy:0});
  return n?[...faces,...caps]:[...caps,...faces];
}
export function drawDeepFrame(ctx,art,name,x,y,size,height=1) {
  const f=art.frames[name];ctx.drawImage(art.image,f.x,f.y,f.width,f.height,x,y,size,size*height);
}
export function deepWallOpacity(x,y,actors=[]) {
  // A foreground cap can overlap the row behind it. Reveal goblins locally
  // without cutting collision, hiding an enemy, or changing line of sight.
  return actors.some(a=>!a.hiding&&!a.ghost&&Math.abs(a.x-(x+.5))<1.1&&a.y>=y-1.5&&a.y<y+.2)?.32:1;
}
export function drawDeepWall(ctx,art,world,x,y,px,py,size,actors=[]) {
  if(isFloor(world,x,y))return;
  const parts=deepWallParts(world,x,y);ctx.save();
  ctx.globalAlpha=(Number.isFinite(ctx.globalAlpha)?ctx.globalAlpha:1)*deepWallOpacity(x,y,actors);
  for(const part of parts)drawDeepFrame(ctx,art,part.name,px,py+part.dy*size,size,part.height??1);
  ctx.restore();
}
export function drawTerrainOverview(ctx,art,world,size=32,ox=0,oy=0) {
  // Floors first; raised wall tiles then compose in increasing ground depth.
  if(!art.deep){for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)drawTerrainTile(ctx,art,world,x,y,x*size+ox,y*size+oy,size);return;}
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(isFloor(world,x,y))drawDeepFrame(ctx,art,'floor',x*size+ox,y*size+oy,size);
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(!isFloor(world,x,y))drawDeepWall(ctx,art,world,x,y,x*size+ox,y*size+oy,size);
}
