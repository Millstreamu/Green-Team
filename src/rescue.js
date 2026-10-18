import { placeProp } from './prop-placement.js';
import { RESCUE } from './config.js';
import { findPath } from './navigation.js';
import { clearPath } from './loot.js';

export function createCages(world, obstacles = []) {
  const rooms = world.rooms.map((room, index) => ({ ...room, index })).filter(r => r.index !== 0 && r.index !== world.treasure?.roomIndex);
  const selected = Array.from({ length: Math.min(RESCUE.cages, rooms.length) }, (_, i) => rooms[Math.floor((i + .5) * rooms.length / Math.min(RESCUE.cages, rooms.length))]);
  const cages = [];
  for (const room of [...selected, ...rooms.filter(r => !selected.includes(r))]) {
    if (cages.length >= RESCUE.cages) break;
    const point = placeProp(world, room, 'cage', [...obstacles, ...cages, ...cages.map(c => c.post)]);
    if (point && findPath(world, world.spawn, point.approach).length) cages.push({ id: `${world.seed}-cage-${room.index}`, ...point, roomIndex: room.index,
      entry: { ...point.approach }, post: { ...point.approach }, prisoners: [] });
  }
  return cages;
}
export function rescueCandidate(world, actor, target, cages) {
  if (actor.id === target.id || actor.connected === false || actor.ghost || actor.inRun === false || actor.state !== 'active' || actor.hiding || target.ghost || target.connected === false || target.waiting || target.inRun === false) return null;
  let kind, point, cage;
  if (target.state === 'down' && !target.carrierId) { kind = 'revive'; point = target; }
  else if (target.state === 'caged') {
    cage = cages.find(c => c.id === target.cageId && c.prisoners.includes(target.id));
    if (!cage) return null;
    kind = 'rescue'; point = cage.entry;
  } else return null;
  if (Math.hypot(actor.x - point.x, actor.y - point.y) > RESCUE.reach || !clearPath(world, actor, point)) return null;
  return { kind, item: { id: target.id, name: target.name, x: point.x, y: point.y, cageId: cage?.id } };
}
export function selectRescue(world, actor, players, cages, pointer = null) {
  const candidates = players.map(p => rescueCandidate(world, actor, p, cages)).filter(Boolean);
  const distance = (c, p) => Math.hypot(c.item.x - p.x, c.item.y - p.y);
  if (pointer) {
    const hovered = candidates.filter(c => distance(c, pointer) <= .8);
    if (hovered.length) return hovered.sort((a, b) => distance(a, pointer) - distance(b, pointer))[0];
  }
  return candidates.sort((a, b) => distance(a, actor) - distance(b, actor) || a.item.id.localeCompare(b.item.id))[0] ?? null;
}
