import { roomDoorSightFraction } from './door-geometry.js';
import { smokeBlocksSight } from './smoke.js';
import { CONFIG, COMBAT, DART } from './config.js';
import { isSightOpen } from './world.js';

export function drawGuardVision(ctx, world, guard, ox, oy, clouds = []) {
  if (guard.sleepLeft > 0 || guard.blindLeft > 0) return;
  if (!guard.captiveId && !['patrol', 'suspicious', 'return', 'carry'].includes(guard.state)) return;
  const combat = world.tuning?.combat ?? COMBAT;
  const t = CONFIG.tile;
  ctx.beginPath(); ctx.moveTo(guard.x * t + ox, guard.y * t + oy);
  for (let ray = 0; ray <= 24; ray++) {
    const angle = guard.angle - combat.halfCone + ray / 24 * combat.halfCone * 2;
    const doorDistance=roomDoorSightFraction(world,guard,{x:guard.x+Math.cos(angle)*combat.sight,y:guard.y+Math.sin(angle)*combat.sight})*combat.sight;
    let x = guard.x, y = guard.y;
    for (let step = 0.15; step <= combat.sight; step += 0.15) {
      const nx = guard.x + Math.cos(angle) * step, ny = guard.y + Math.sin(angle) * step;
      if (!isSightOpen(world, Math.floor(nx), Math.floor(ny)) || step>=doorDistance || smokeBlocksSight(guard, { x: nx, y: ny }, clouds)) break;
      x = nx; y = ny;
    }
    ctx.lineTo(x * t + ox, y * t + oy);
  }
  ctx.closePath(); ctx.fillStyle = guard.state === 'suspicious' ? '#ef596640' : '#ed707b24'; ctx.fill();
}

export function drawGuard(ctx, guard, ox, oy, pass = 'all') {
  const t = CONFIG.tile, x = Math.round(guard.x * t + ox), y = Math.round(guard.y * t + oy);
  const alert = guard.state === 'chase' || guard.state === 'search';
  const rect = (dx, dy, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
  if (pass !== 'ui') {
    if (guard.windup > 0 || guard.swing > 0) {
      const attackAngle = guard.attackAngle ?? guard.angle;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, COMBAT.attackReach * t, attackAngle - COMBAT.attackHalfArc, attackAngle + COMBAT.attackHalfArc); ctx.closePath();
      ctx.fillStyle = guard.swing > 0 ? '#ef727b50' : '#ef727b18'; ctx.fill();
      ctx.strokeStyle = '#f08b87'; ctx.lineWidth = 1; ctx.stroke();
      if (guard.swing > 0) {
        const sweep = attackAngle - COMBAT.attackHalfArc + (1 - guard.swing / COMBAT.swingTime) * COMBAT.attackHalfArc * 2;
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + Math.cos(sweep) * COMBAT.attackReach * t, y - 8 + Math.sin(sweep) * COMBAT.attackReach * t);
        ctx.strokeStyle = '#ffe4ba'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    rect(-7, -1, 14, 4, '#152022'); rect(-5, -5, 4, 5, '#303c43'); rect(2, -5, 4, 5, '#303c43');
    rect(-7, -17, 14, 13, guard.behaviour === 'lookout' ? '#557d89' : (guard.behaviour === 'roamer' || guard.reinforcement) ? '#81729b' : '#a65f49'); rect(-5, -15, 10, 3, guard.behaviour === 'lookout' ? '#80a8b1' : (guard.behaviour === 'roamer' || guard.reinforcement) ? '#b2a0ca' : '#c9805e'); rect(-7, -7, 14, 2, '#d1b976');
    rect(-5, -24, 11, 10, '#a9b2b2'); rect(-6, -23, 13, 3, '#d2d5c6'); rect(-4, -19, 9, 3, '#283b3e');
    rect(-9, -14, 3, 7, '#aab8b6'); rect(7, -19, 2, 14, '#d6cc9d');
    ctx.strokeStyle = alert ? '#eea494' : '#c9cfb0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + Math.cos(guard.angle) * 12, y - 12 + Math.sin(guard.angle) * 12); ctx.stroke();
  }
  if (pass === 'body') return;
  if (guard.blindLeft > 0) {
    ctx.fillStyle = '#e0a3ca'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('BLIND', x, y - 29);
  } else if (guard.sleepLeft > 0) {
    ctx.fillStyle = '#b5dbdf'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('Zzz', x, y - 29);
    ctx.fillStyle = '#18282a'; ctx.fillRect(x - 10, y - 28, 20, 3); ctx.fillStyle = '#b5dbdf'; ctx.fillRect(x - 10, y - 28, 20 * Math.min(1, guard.sleepLeft / DART.sleepSeconds), 3);
  } else if (guard.snareLeft > 0) {
    ctx.fillStyle = '#d7eeb2'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('SNARED', x, y - 29);
  } else if (guard.state !== 'patrol') {
    ctx.fillStyle = alert ? '#f19a91' : '#efd18a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(guard.windup > 0 ? '!' : guard.state === 'investigate' ? '♫ ?' : guard.state === 'suspicious' ? '?' : guard.state === 'carry' ? 'CARRYING' : guard.state === 'capture' ? 'CAPTURE' : guard.state === 'search' ? '…' : guard.state === 'return' ? '↩' : '!', x, y - 29);
  }
  if (guard.state === 'suspicious') {
    rect(-9, -29, 18, 2, '#242e29'); rect(-9, -29, Math.round(18 * guard.suspicion), 2, '#efd18a');
  }
  if (guard.state === 'patrol') {
    ctx.fillStyle = guard.behaviour === 'lookout' ? '#a3c5cd' : (guard.behaviour === 'roamer' || guard.reinforcement) ? '#c4b5dc' : '#d9b297'; ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(guard.jailer ? 'JAIL GUARD' : guard.behaviour === 'lookout' ? 'LOOKOUT' : (guard.behaviour === 'roamer' || guard.reinforcement) ? guard.reinforcement ? guard.pauseLeft > 0 ? 'SWEEP / SEARCHING' : 'SWEEP' : guard.pauseLeft > 0 ? 'ROAMER / PAUSED' : 'ROAMER' : guard.pauseLeft > 0 ? 'PAUSED' : 'PATROL', x, y + 6);
  }
}
