import { CONFIG } from './config.js';
import { isFloor } from './world.js';
import { placeProp } from './prop-placement.js';

// Visual balance only. These values never enter guard sight or server rules.
export const LIGHTING = Object.freeze({ ambientDarkness: .38, radius: 5.5, warmth: .14, flicker: .045, rays: 96, step: .12 });

export function createTorches(world, obstacles = []) {
  if (world.lair) return [];
  const torches = [];
  const fixed = obstacles.filter(o => !['chest', 'crate'].includes(o.type));
  world.rooms.forEach((room, index) => {
    // Prefer a clear wall; a short chest/crate may sit below a wall-mounted torch.
    const point = placeProp(world, room, 'torch', [...obstacles, ...torches])
      ?? placeProp(world, room, 'torch', [...fixed, ...torches]);
    if (!point) return;
    const outward = { south: [0, -1], north: [0, 1], east: [-1, 0], west: [1, 0] }[point.facing];
    torches.push({ ...point, id: `${world.seed}-torch-${index}`, roomIndex: index,
      mountX: point.x + outward[0] * .72, mountY: point.y + outward[1] * .72,
      phase: (((world.seed >>> 0) ^ Math.imul(index + 1, 2654435761)) >>> 0) / 4294967296 * Math.PI * 2 });
  });
  return torches;
}

// Cache static wall occlusion. Rays stop at the first solid cell, lighting its
// near surface without travelling into rooms beyond it.
export function lightPolygon(world, light, radius = LIGHTING.radius) {
  const points = [];
  for (let i = 0; i < LIGHTING.rays; i++) {
    const angle = i / LIGHTING.rays * Math.PI * 2, dx = Math.cos(angle), dy = Math.sin(angle);
    let distance = LIGHTING.step;
    for (; distance < radius; distance += LIGHTING.step) {
      const cellX = Math.floor(light.x + dx * distance), cellY = Math.floor(light.y + dy * distance);
      if (!isFloor(world, cellX, cellY)) {
        const exitX = dx ? ((dx > 0 ? cellX + 1 : cellX) - light.x) / dx : Infinity;
        const exitY = dy ? ((dy > 0 ? cellY + 1 : cellY) - light.y) / dy : Infinity;
        distance = Math.min(radius, distance + .5, Math.min(exitX, exitY) - .001); break;
      }
    }
    points.push({ x: light.x + dx * Math.min(distance, radius), y: light.y + dy * Math.min(distance, radius) });
  }
  return points;
}
export function torchStrength(torch, seconds) {
  return 1 + LIGHTING.flicker * (.65 * Math.sin(seconds * 3.2 + torch.phase) + .35 * Math.sin(seconds * 5.1 + torch.phase * 1.7));
}
function lightClip(ctx, torch, ox, oy, tile) {
  ctx.beginPath();
  torch.polygon.forEach((p, i) => { if (i) ctx.lineTo(p.x * tile + ox, p.y * tile + oy); else ctx.moveTo(p.x * tile + ox, p.y * tile + oy); });
  ctx.closePath(); ctx.clip();
}
export function drawTorches(ctx, torches, ox, oy, seconds) {
  for (const torch of torches) {
    const x = Math.round(torch.mountX * CONFIG.tile + ox), y = Math.round(torch.mountY * CONFIG.tile + oy);
    const tip = Math.sin(seconds * 3.2 + torch.phase) > .3 ? 1 : 0;
    ctx.fillStyle = '#111616'; ctx.fillRect(x - 4, y - 3, 8, 8);
    ctx.fillStyle = '#65513c'; ctx.fillRect(x - 1, y - 3, 3, 9);
    ctx.fillStyle = '#92806a'; ctx.fillRect(x - 4, y, 8, 2);
    ctx.fillStyle = '#b74e22'; ctx.fillRect(x - 3, y - 9, 7, 7);
    ctx.fillStyle = '#ef982e'; ctx.fillRect(x - 2 + tip, y - 12, 4, 9);
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, y - 9 - tip, 2, 6);
  }
}

export function createLightingRenderer(makeCanvas = () => document.createElement('canvas')) {
  const scenes = new WeakMap(); let mask = null;
  return {
    scene(world, obstacles) {
      if (world.lair) return null;
      if (!scenes.has(world)) scenes.set(world, createTorches(world, obstacles).map(torch => ({ ...torch, polygon: lightPolygon(world, torch) })));
      return scenes.get(world);
    },
    draw(ctx, width, height, torches, ox, oy, seconds) {
      if (!torches) return;
      mask ??= makeCanvas();
      if (mask.width !== width || mask.height !== height) { mask.width = width; mask.height = height; }
      const shade = mask.getContext('2d'), tile = CONFIG.tile, radius = LIGHTING.radius * tile;
      shade.clearRect(0, 0, width, height); shade.globalCompositeOperation = 'source-over';
      shade.fillStyle = `rgba(3,7,14,${LIGHTING.ambientDarkness})`; shade.fillRect(0, 0, width, height);
      const visible = torches.filter(t => t.x * tile + ox + radius >= 0 && t.y * tile + oy + radius >= 0 && t.x * tile + ox - radius < width && t.y * tile + oy - radius < height);
      for (const torch of visible) {
        const x = torch.x * tile + ox, y = torch.y * tile + oy, strength = torchStrength(torch, seconds);
        shade.save(); lightClip(shade, torch, ox, oy, tile); shade.globalCompositeOperation = 'destination-out';
        const glow = shade.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(0,0,0,${Math.min(1, .96 * strength)})`); glow.addColorStop(.35, `rgba(0,0,0,${.65 * strength})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
        shade.fillStyle = glow; shade.fillRect(x - radius, y - radius, radius * 2, radius * 2); shade.restore();
      }
      ctx.save(); ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'screen';
      for (const torch of visible) {
        const x = torch.x * tile + ox, y = torch.y * tile + oy;
        ctx.save(); lightClip(ctx, torch, ox, oy, tile);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(244,161,64,${LIGHTING.warmth * torchStrength(torch, seconds)})`); glow.addColorStop(.45, `rgba(209,110,38,${LIGHTING.warmth * .35})`); glow.addColorStop(1, 'rgba(180,86,30,0)');
        ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
      }
      ctx.restore();
    }
  };
}
