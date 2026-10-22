// Visual bounds for replacements of the existing fixed lair stations.
// These do not place props, change interaction targets or create colliders.
export const LAIR_ART_SLOTS = Object.freeze({
  stash: { name: 'Lair stash', width: 64, height: 64, anchorX: 32, anchorY: 48 },
  craft: { name: 'Workbench', width: 64, height: 64, anchorX: 32, anchorY: 48 },
  campfire: { name: 'Campfire', width: 64, height: 64, anchorX: 32, anchorY: 48 },
  planning: { name: 'Map table', width: 64, height: 64, anchorX: 32, anchorY: 48 },
  tunnel: { name: 'Departure minecart', width: 64, height: 64, anchorX: 32, anchorY: 48 },
  potion: { name: 'Potion station · built', width: 32, height: 32, anchorX: 16, anchorY: 16 },
  potionSite: { name: 'Potion station · unbuilt', width: 32, height: 32, anchorX: 16, anchorY: 16 }
});

export function lairArtBounds(world, id) {
  const slot = LAIR_ART_SLOTS[id];
  if (!slot) throw Error('Unknown lair artwork slot.');
  const station = world.stations.find(s => s.kind === (id === 'potionSite' ? 'potion' : id));
  if (!station) throw Error('Lair station is missing.');
  return { x: station.x - slot.anchorX / 32, y: station.y - slot.anchorY / 32,
    width: slot.width / 32, height: slot.height / 32, anchorX: station.x, anchorY: station.y };
}

export function drawLairArt(ctx, images, world, id, ox = 0, oy = 0, tile = 24) {
  const image = images.get(id);
  if (!image) return false;
  const b = lairArtBounds(world, id);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(b.x * tile + ox), Math.round(b.y * tile + oy), b.width * tile, b.height * tile);
  return true;
}

// Matches the existing rail/cart drawing at its fixed station. Shared by the
// overview only; the sandbox keeps its production rail drawing unchanged.
export function drawLairCartOverview(ctx, world, images, tile = 24) {
  const s = world.stations.find(s => s.kind === 'tunnel'), x = s.x * tile, y = s.y * tile;
  const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  box(x-8,tile,2,Math.max(1,y-tile+12),'#8b8a74');box(x+6,tile,2,Math.max(1,y-tile+12),'#8b8a74');
  for(let yy=tile;yy<y+13;yy+=9)box(x-11,yy,22,2,'#615443');
  if(drawLairArt(ctx,images,world,'tunnel',0,0,tile))return;
  box(x-14,y-16,28,18,'#6e7a74');box(x-11,y-13,22,10,'#26322f');
  box(x-12,y+1,6,5,'#1a2422');box(x+6,y+1,6,5,'#1a2422');
}
