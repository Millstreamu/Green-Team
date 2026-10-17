import { createLightingRenderer, drawTorches } from './lighting.js';
import { loadHumanTerrain, drawTerrainTile } from './terrain-art.js';
import { drawCages, drawRescues } from './rescue-view.js';
import { drawReinforcementDoors } from './pressure-view.js';
import { drawHidingSpots } from './hiding-view.js';
import { drawSmoke } from './smoke-view.js';
import { drawLair } from './lair-drawing.js';
import { lairTarget } from './lair.js';
import { drawTraps } from './trap-view.js';
import { CONFIG, GOBLIN_ART, SEARCH } from './config.js';
import { isFloor } from './world.js';
import { itemCells } from './loot.js';
import { drawItem } from './item-view.js';
import { drawGuardVision, drawGuard } from './guard-view.js';
import { drawSearchables } from './search-view.js';

export function screenToWorld(canvas, player, pointer) {
  const bounds = canvas.getBoundingClientRect();
  const ox = Math.round(canvas.width / 2 - player.x * CONFIG.tile), oy = Math.round(canvas.height / 2 - player.y * CONFIG.tile);
  return { x: ((pointer.x - bounds.left) / bounds.width * canvas.width - ox) / CONFIG.tile, y: ((pointer.y - bounds.top) / bounds.height * canvas.height - oy) / CONFIG.tile };
}

export async function createRenderer(canvas, mapCanvas) {
  const goblin = new Image();
  goblin.src = GOBLIN_ART.src;
  await goblin.decode();
  const humanTerrain = await loadHumanTerrain().catch(error => { console.warn('Human tiles unavailable; using temporary art.', error.message); return null; });
  const ctx = canvas.getContext('2d');
  const map = mapCanvas.getContext('2d');
  const lighting = createLightingRenderer();
  let width = 0, height = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width / 2)); height = Math.max(1, Math.floor(rect.height / 2));
    canvas.width = width; canvas.height = height; ctx.imageSmoothingEnabled = false;
  };
  new ResizeObserver(resize).observe(canvas); resize();
  return (world, player, loot, target, run, tunnelReady, guards, objects, searchTarget, searchSession, traps = [], placement = null, clouds = [], hidingSpots = [], hideTarget = null, pressure = null, teammates = [], rescueTarget = null) => {
    ctx.fillStyle = '#101517'; ctx.fillRect(0, 0, width, height);
    const t = CONFIG.tile;
    const seconds = performance.now() / 1000;
    const torches = lighting.scene(world, [...objects, ...hidingSpots, ...(run.cages ?? []), ...(pressure?.doors ?? []).map(d => d.spawn)]);
    const terrainArt = !world.lair && world.job?.jobId === 'manor' ? humanTerrain : null;
    const ox = Math.round(width / 2 - player.x * t), oy = Math.round(height / 2 - player.y * t);
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    for (let y = Math.max(0, Math.floor(-oy / t) - 1); y < Math.min(world.height, Math.ceil((height - oy) / t) + 1); y++) {
      for (let x = Math.max(0, Math.floor(-ox / t) - 1); x < Math.min(world.width, Math.ceil((width - ox) / t) + 1); x++) {
        const px = x * t + ox, py = y * t + oy;
        if (terrainArt) {
          drawTerrainTile(ctx, terrainArt, world, x, y, px, py, t);
        } else if (isFloor(world, x, y)) {
          rect(px, py, t, t, (x * 13 + y * 7) % 5 === 0 ? '#333c3a' : '#2d3635');
          rect(px, py, t, 1, '#404743'); rect(px, py, 1, t, '#252f2e');
          if ((x * 7 + y * 19) % 17 === 0) rect(px + 7, py + 15, 3, 1, '#596050');
        } else if ([-1, 0, 1].some(dy => [-1, 0, 1].some(dx => isFloor(world, x + dx, y + dy)))) {
          rect(px, py, t, t, '#465053'); rect(px + 1, py + 1, t - 2, 5, '#657074');
          rect(px + 1, py + 8, t - 2, t - 9, '#3b4548'); rect(px + 11, py + 9, 1, 12, '#303a3d');
          if (isFloor(world, x, y + 1)) rect(px, py + t - 3, t, 3, '#20282b');
        }
      }
    }
    if (torches) drawTorches(ctx, torches, ox, oy, seconds);
    drawCages(ctx, run.cages ?? [], ox, oy);
    drawReinforcementDoors(ctx, pressure, ox, oy);
    for (const guard of guards) drawGuardVision(ctx, world, guard, ox, oy, clouds);
    const highlightTunnel = tunnelReady || world.lair && lairTarget(world, player)?.kind === 'tunnel';
    const tx = Math.round(run.entrance.x * t + ox), ty = Math.round(run.entrance.y * t + oy);
    if (world.lair) {
      rect(tx - 8, oy + CONFIG.tile, 2, Math.max(1, ty - oy - CONFIG.tile + 12), '#8b8a74');
      rect(tx + 6, oy + CONFIG.tile, 2, Math.max(1, ty - oy - CONFIG.tile + 12), '#8b8a74');
      for (let y = oy + CONFIG.tile; y < ty + 13; y += 9) rect(tx - 11, y, 22, 2, '#615443');
      rect(tx - 14, ty - 16, 28, 18, '#6e7a74'); rect(tx - 11, ty - 13, 22, 10, '#26322f');
      rect(tx - 12, ty + 1, 6, 5, '#1a2422'); rect(tx + 6, ty + 1, 6, 5, '#1a2422');
    } else {
      rect(tx - 13, ty - 9, 26, 18, highlightTunnel ? '#d5c483' : '#8c805b');
      rect(tx - 10, ty - 6, 20, 12, '#080f12');
      for (let i = 0; i < 3; i++) rect(tx - 8 + i * 6, ty - 4, 3, 8, '#3a4036');
    }
    ctx.fillStyle = highlightTunnel ? '#f0dda3' : '#c4b98c'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(world.lair ? 'DEPARTURE CART' : 'SECRET TUNNEL', tx, ty - 30);
    if (highlightTunnel) { ctx.strokeStyle = '#e8d790'; ctx.strokeRect(tx - 16.5, ty - 12.5, 33, 25); }
    drawTraps(ctx, world, player, traps, [...objects, ...hidingSpots, ...(run.cages ?? [])], placement, ox, oy);
    drawSearchables(ctx, objects, !loot.held && !tunnelReady ? searchTarget : null, searchSession, ox, oy);
    drawHidingSpots(ctx, hidingSpots, hideTarget, player, ox, oy);
    for (const item of loot.ground) {
      const cells = itemCells(item), size = 7;
      const w = (Math.max(...cells.map(c => c[0])) + 1) * size, h = (Math.max(...cells.map(c => c[1])) + 1) * size;
      const x = Math.round(item.x * t + ox - w / 2), y = Math.round(item.y * t + oy - h / 2);
      const fall = item.spillAge === undefined ? 0 : Math.round(Math.sin(Math.min(1, item.spillAge / SEARCH.spillTime) * Math.PI) * 8);
      drawItem(ctx, item, x, y - fall, size);
      if (target?.id === item.id && !loot.held && !tunnelReady) {
        ctx.strokeStyle = '#d1f69b'; ctx.lineWidth = 1;
        ctx.strokeRect(x - 3.5, y - 3.5, w + 7, h + 7);
        ctx.fillStyle = '#d1f69b'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('E', x + w / 2, y - 6);
      }
    }
    if (world.lair) drawLair(ctx, world, lairTarget(world, player), ox, oy);
    drawSmoke(ctx, world, clouds, ox, oy);
    for (const guard of guards) drawGuard(ctx, guard, ox, oy);
    // Feet and shadow stay on the floor; only the supplied sprite hops.
    for (const actor of [...teammates, player]) {
      if (actor.hiding) continue;
      const player = actor;
      const sx = Math.round(player.x * t + ox), sy = Math.round(player.y * t + oy);
      const hop = player.moving ? Math.round(Math.abs(Math.sin(player.phase)) * CONFIG.hopHeight) : 0;
      rect(sx - 7, sy - 2, 14, 4, '#182222');
      ctx.save(); ctx.translate(sx, sy - hop);
      if (player.ghost) { ctx.globalAlpha = .35; ctx.filter = 'grayscale(1)'; } ctx.scale(player.facing / GOBLIN_ART.faces, 1);
      if (player.state === 'carried') ctx.translate(0, -10);
      if (player.state === 'down' || player.state === 'carried') ctx.rotate(Math.PI / 2);
      else if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.45;
      const sw = GOBLIN_ART.width * GOBLIN_ART.scale, sh = GOBLIN_ART.height * GOBLIN_ART.scale;
      ctx.drawImage(goblin, -sw / 2, -sh, sw, sh);
      ctx.restore();
      if (actor.name) { ctx.fillStyle = '#d1f69b'; ctx.font = '8px monospace'; ctx.fillText(actor.ghost ? `${actor.name} · reconnect ${actor.ghostSeconds}s` : actor.state !== 'active' && actor.state ? `${actor.name} · ${actor.state.toUpperCase()}` : actor.name, sx, sy - sh - 8); }
    }
    drawCages(ctx, run.cages ?? [], ox, oy, true);
    lighting.draw(ctx, width, height, torches, ox, oy, seconds);
    drawRescues(ctx, [...teammates, player], run.cages ?? [], run.rescues ?? [], rescueTarget, ox, oy);
    mapCanvas.width = world.width * 2; mapCanvas.height = world.height * 2;
    map.fillStyle = '#151e20'; map.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    map.fillStyle = '#667670';
    world.tiles.forEach((floor, i) => { if (floor) map.fillRect(i % world.width * 2, Math.floor(i / world.width) * 2, 2, 2); });
    map.fillStyle = '#ead48c'; map.fillRect(Math.floor(run.entrance.x) * 2 - 2, Math.floor(run.entrance.y) * 2 - 2, 6, 6);
    map.fillStyle = '#c7ee7b'; map.fillRect(Math.floor(player.x) * 2, Math.floor(player.y) * 2, 2, 2);
  };
}
