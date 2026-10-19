import { CONFIG, HEAT } from './config.js';

export function drawReinforcementDoors(ctx, pressure, ox, oy) {
  if (!pressure) return;
  for (const door of pressure.doors) {
    const x = Math.round(door.x * CONFIG.tile + ox), y = Math.round(door.y * CONFIG.tile + oy);
    const incoming = pressure.pending.some(p => p.doorId === door.id);
    const rect = (dx, dy, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
    rect(-14, -23, 28, 26, incoming ? '#d09b63' : '#77817b'); rect(-11, -21, 22, 23, '#192323');
    rect(-9, -19, 18, 20, incoming ? '#8b5539' : '#534e3c');
    rect(-1, -18, 2, 19, '#252d28'); rect(-9, -13, 18, 3, '#8c8d72'); rect(-9, -4, 18, 3, '#8c8d72');
    rect(5, -8, 2, 3, '#dac484');
    ctx.fillStyle = incoming ? '#ffd39a' : '#a2aaa0'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(incoming ? 'GUARD INCOMING' : 'GUARD DOOR', x, y - 26);
  }
}
export function pressureLabel(pressure) {
  const progress = pressure.alerts % (pressure.alertsPerGuard ?? HEAT.alertsPerGuard);
  const warning = pressure.pending.length ? ` · GUARD INCOMING ${Math.ceil(Math.min(...pressure.pending.map(p => p.left)))}s` : '';
  return `Heat ${Math.round(pressure.heat * 100)}% · Alerts ${pressure.alerts} (${progress}/${pressure.alertsPerGuard ?? HEAT.alertsPerGuard}) · Extra guards ${pressure.reinforcements}${warning}`;
}
