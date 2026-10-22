import test from 'node:test';
import assert from 'node:assert/strict';
import { workshopJoinWorld, WORKSHOP_JOIN_SCENES } from '../workshop/tile-checks.js';
import { terrainLayers } from '../src/terrain-art.js';

test('join previews cover mirrored corners, inside overlays, turns and thin walls without modifying floor data', () => {
  const names = new Set(), mirrors = new Set(); let overlays = 0;
  for (const id of Object.keys(WORKSHOP_JOIN_SCENES)) {
    const world = workshopJoinWorld(id), before = [...world.tiles];
    assert.equal(world.width * world.height, world.tiles.length);
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      if (x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1) assert.equal(world.tiles[y * world.width + x], 0);
      const layers = terrainLayers(world, x, y);
      if (layers.length > 1) overlays++;
      for (const layer of layers) { names.add(layer.name); if (layer.flipX) mirrors.add(layer.name); }
    }
    assert.deepEqual([...world.tiles], before);
  }
  assert.equal(names.size, 5); assert.ok(overlays > 0);
  assert.ok(mirrors.has('wall_vert')); assert.ok(mirrors.has('wall_corner_top_left'));
  assert.throws(() => workshopJoinWorld('unknown'));
});

test('all 256 neighboring floor patterns use available frames and bounded crop rectangles', () => {
  const neighbors = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  for (let mask = 0; mask < 256; mask++) {
    const world = { width: 5, height: 5, tiles: new Uint8Array(25) };
    neighbors.forEach(([x,y], i) => { if (mask & 1 << i) world.tiles[(y+2)*5+x+2] = 1; });
    const before = [...world.tiles];
    for (const layer of terrainLayers(world, 2, 2)) {
      assert.ok(['wall_top_horz','wall_vert','wall_corner_top_left','wall_bottom_horz'].includes(layer.name));
      const c = layer.crop ?? {x:0,y:0,width:1,height:1};
      assert.ok(c.x >= 0 && c.y >= 0 && c.width > 0 && c.height > 0 && c.x+c.width <= 1 && c.y+c.height <= 1);
    }
    assert.deepEqual([...world.tiles], before);
  }
});
