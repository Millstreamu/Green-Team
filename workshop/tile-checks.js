// Deliberately small floor fixtures. They use the production terrain renderer;
// no separate tile-selection or collision policy lives in the workshop.
export const WORKSHOP_JOIN_SCENES = Object.freeze({
  room: 'Room & outside corners',
  halls: 'Hallways, turns & junctions',
  thin: 'Thin walls & inside joins'
});
export function workshopJoinWorld(id = 'room') {
  if (!Object.hasOwn(WORKSHOP_JOIN_SCENES, id)) throw Error('Unknown join preview.');
  const width = 15, height = 11, tiles = new Uint8Array(width * height);
  const rect = (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy * width + xx] = 1;
  };
  if (id === 'room') { rect(2, 2, 11, 7); rect(6, 8, 2, 2); }
  if (id === 'halls') {
    rect(1, 1, 4, 3); rect(10, 1, 4, 3); rect(1, 7, 4, 3); rect(10, 7, 4, 3);
    rect(3, 3, 1, 5); rect(11, 3, 1, 5); rect(3, 5, 9, 1); rect(7, 2, 1, 7);
  }
  if (id === 'thin') {
    rect(1, 1, 5, 4); rect(7, 1, 7, 4); rect(1, 6, 5, 4); rect(7, 6, 7, 4);
    rect(3, 4, 1, 3); rect(10, 4, 1, 3); rect(5, 2, 3, 1); rect(5, 8, 3, 1);
  }
  return { width, height, tiles };
}
