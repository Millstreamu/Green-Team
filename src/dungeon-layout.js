// Post-process the existing connected layout. Keep generation independent of UI.
function floorAt(world, x, y, added = null) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && (world.tiles[y * world.width + x] === 1 || added?.has(y * world.width + x));
}

export function roomEntrances(world, room, added = null) {
  const sides = [
    { name: 'north', start: room.x, end: room.x + room.w, point: n => [n, room.y - 1] },
    { name: 'south', start: room.x, end: room.x + room.w, point: n => [n, room.y + room.h] },
    { name: 'west', start: room.y, end: room.y + room.h, point: n => [room.x - 1, n] },
    { name: 'east', start: room.y, end: room.y + room.h, point: n => [room.x + room.w, n] }
  ];
  const entrances = [];
  for (const side of sides) {
    let opening = null;
    for (let n = side.start; n < side.end; n++) {
      const [x, y] = side.point(n);
      if (floorAt(world, x, y, added)) {
        if (!opening) { opening = { side: side.name, cells: [] }; entrances.push(opening); }
        opening.cells.push({ x, y });
      } else opening = null;
    }
  }
  return entrances;
}

function distancesFrom(world, room) {
  const distances = new Int32Array(world.tiles.length).fill(-1);
  const start = room.cy * world.width + room.cx, queue = [start]; distances[start] = 0;
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * world.width + nx;
      if (floorAt(world, nx, ny) && distances[next] === -1) { distances[next] = distances[key] + 1; queue.push(next); }
    }
  }
  return distances;
}

function corridorRoute(a, b, horizontalFirst) {
  let x = a.cx, y = a.cy;
  const path = [{ x, y }];
  const horizontal = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); path.push({ x, y }); } };
  const vertical = () => { while (y !== b.cy) { y += Math.sign(b.cy - y); path.push({ x, y }); } };
  if (horizontalFirst) { horizontal(); vertical(); } else { vertical(); horizontal(); }
  return path;
}

export function addRoomLoops(world, config, random) {
  const { rooms, tiles, width } = world;
  // Protect existing leaf rooms, including their perimeter, so added shortcuts
  // cannot quietly turn every room into another thoroughfare.
  const leafRooms = rooms.map((room, i) => roomEntrances(world, room).length === 1 ? i : -1).filter(i => i >= 0);
  const preservedDeadEnds = leafRooms.slice(0, config.preserveDeadEnds ?? 2);
  const protectedSet = new Set(preservedDeadEnds), shortcuts = [];
  for (let loop = 0; loop < (config.extraConnections ?? 3); loop++) {
    let best = null;
    for (let i = 0; i < rooms.length; i++) {
      if (protectedSet.has(i)) continue;
      const distances = distancesFrom(world, rooms[i]);
      for (let j = i + 1; j < rooms.length; j++) {
        if (protectedSet.has(j)) continue;
        const a = rooms[i], b = rooms[j];
        const direct = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy), oldDistance = distances[b.cy * width + b.cx];
        if (direct > Math.min(config.maxLoopLength ?? 40, config.maxCorridorLength ?? 1000) || oldDistance - direct < (config.minLoopDetour ?? 8)) continue;
        for (const horizontalFirst of [true, false]) {
          const path = corridorRoute(a, b, horizontalFirst), wide = new Map();
          const size = config.corridorWidth ?? 1, offset = Math.floor(size / 2);
          for (const p of path) for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
            const x = p.x + dx - offset, y = p.y + dy - offset;
            if (x > 0 && y > 0 && x < width - 1 && y < world.height - 1) wide.set(y * width + x, { x, y });
          }
          const newCells = [...wide.values()].filter(p => !floorAt(world, p.x, p.y));
          if (newCells.length < 3) continue;
          if (newCells.some(p => preservedDeadEnds.some(index => {
            const r = rooms[index]; return p.x >= r.x - 1 && p.x <= r.x + r.w && p.y >= r.y - 1 && p.y <= r.y + r.h;
          }))) continue;
          const added = new Set([...wide.keys()]);
          const entryGain = roomEntrances(world, a, added).length + roomEntrances(world, b, added).length - roomEntrances(world, a).length - roomEntrances(world, b).length;
          if (entryGain < 1) continue;
          const score = (oldDistance - direct) / newCells.length + entryGain * 0.1 + random() * 0.01;
          if (!best || score > best.score) best = { from: i, to: j, path, wide, newCells, oldDistance, score };
        }
      }
    }
    if (!best) break;
    if (world.corridorTiles) for (const key of best.wide.keys()) world.corridorTiles[key] = 1;
    best.newCells.forEach(p => { tiles[p.y * width + p.x] = 1; });
    const newDistance = distancesFrom(world, rooms[best.from])[rooms[best.to].cy * width + rooms[best.to].cx];
    shortcuts.push({ from: best.from, to: best.to, oldDistance: best.oldDistance, newDistance, carved: best.newCells });
  }
  rooms.forEach(room => { room.entrances = roomEntrances(world, room); });
  return { ...world, shortcuts, preservedDeadEnds };
}
