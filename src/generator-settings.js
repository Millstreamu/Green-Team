import { CONFIG } from './config.js';

export const GENERATOR_FIELDS = Object.freeze([
  ['width', 'Map width', 40, 120], ['height', 'Map height', 32, 90], ['rooms', 'Requested rooms', 4, 24],
  ['minRoomWidth', 'Smallest room width', 5, 16], ['maxRoomWidth', 'Largest room width', 5, 16],
  ['minRoomHeight', 'Smallest room height', 5, 14], ['maxRoomHeight', 'Largest room height', 5, 14],
  ['corridorWidth', 'Corridor width', 1, 3], ['corridorBends', 'Extra corridor bends', 0, 1],
  ['maxCorridorLength', 'Maximum direct room connection', 8, 100],
  ['extraConnections', 'Extra looping routes to try', 0, 8], ['preserveDeadEnds', 'Dead ends to protect', 0, 4],
  ['searchablesPerRoom', 'Furniture per room (entrance minimum 3)', 1, 4], ['hidingInterval', 'One hiding spot every N rooms', 1, 6]
].map(([id, label, min, max]) => Object.freeze({ id, label, min, max })));
// Approved Moss export, 17 October 2026. Each type owns its full preset.
export const GENERATOR_PRESETS = Object.freeze({
  manor: Object.freeze({"width":50,"height":40,"rooms":15,"minRoomWidth":5,"maxRoomWidth":8,"minRoomHeight":5,"maxRoomHeight":8,"corridorWidth":1,"corridorBends":0,"maxCorridorLength":100,"extraConnections":6,"preserveDeadEnds":2,"searchablesPerRoom":4,"hidingInterval":2}),
  hold: Object.freeze({"width":88,"height":64,"rooms":12,"minRoomWidth":9,"maxRoomWidth":14,"minRoomHeight":7,"maxRoomHeight":10,"corridorWidth":3,"corridorBends":0,"maxCorridorLength":100,"extraConnections":2,"preserveDeadEnds":2,"searchablesPerRoom":1,"hidingInterval":2}),
  sanctuary: Object.freeze({"width":72,"height":64,"rooms":18,"minRoomWidth":5,"maxRoomWidth":8,"minRoomHeight":5,"maxRoomHeight":7,"corridorWidth":1,"corridorBends":1,"maxCorridorLength":100,"extraConnections":5,"preserveDeadEnds":1,"searchablesPerRoom":1,"hidingInterval":2})
});
export function validateGenerator(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== GENERATOR_FIELDS.length
    || GENERATOR_FIELDS.some(f => !Object.hasOwn(value, f.id) || !Number.isInteger(value[f.id]) || value[f.id] < f.min || value[f.id] > f.max)
    || value.minRoomWidth > value.maxRoomWidth || value.minRoomHeight > value.maxRoomHeight || value.preserveDeadEnds >= value.rooms) throw Error('Invalid dungeon settings. Use whole numbers within the limits; smallest rooms cannot exceed largest rooms, and protected dead ends must be fewer than rooms.');
  return { ...value };
}
export function generatorSettings(saved) {
  if (saved === undefined) return structuredClone(GENERATOR_PRESETS);
  if (!saved || Array.isArray(saved) || Object.keys(saved).length !== Object.keys(GENERATOR_PRESETS).length) throw Error('Invalid dungeon presets.');
  return Object.fromEntries(Object.keys(GENERATOR_PRESETS).map(id => [id, validateGenerator(saved[id])]));
}
export function dungeonConfig(values = GENERATOR_PRESETS.manor) {
  return { ...CONFIG, ...validateGenerator(values), cartRoom: true };
}
