import { CONFIG } from './config.js';
import { isFloor } from './world.js';

export function drawSmoke(ctx, world, clouds, ox, oy) {
  const tile = CONFIG.tile;
  ctx.save();
  for (const cloud of clouds) {
    ctx.globalAlpha = .32 * Math.min(1, cloud.left);
    for (let y = Math.floor(cloud.y - cloud.radius); y <= cloud.y + cloud.radius; y++) for (let x = Math.floor(cloud.x - cloud.radius); x <= cloud.x + cloud.radius; x++) {
      if (!isFloor(world, x, y) || Math.hypot(x + .5 - cloud.x, y + .5 - cloud.y) > cloud.radius + .3) continue;
      ctx.fillStyle = (x + y) % 2 ? '#a3b4b5' : '#d1dbcb';
      ctx.fillRect(Math.round(x * tile + ox) + 1, Math.round(y * tile + oy) + 1, tile - 2, tile - 2);
    }
  }
  ctx.restore();
}
