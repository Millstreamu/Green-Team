# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

First exploration prototype implemented. Hosting, multiplayer and player limits remain undecided.

## Play

Download `play.html` and open it in a desktop browser. No installation, account or server is needed. Use WASD or arrow keys to move. Click **New dungeon** for a different layout. The small map shows your position.

The goblin uses your supplied 16×16 art; dungeon art is temporary. This version has no guards, loot, crafting or multiplayer.

## Development

The prototype uses JavaScript and the browser's Canvas drawing surface, with no external packages. Edit `src/`, not the generated `play.html`.

- `npm test`: check dungeon connectivity and movement rules (Node.js required).
- `npm run build`: regenerate the standalone `play.html` after source changes.
- `src/config.js`: dungeon dimensions, room count, movement speed and hop values.
- `src/world.js`: generation and collision rules, independent of browser drawing.
- `src/input.js`: keyboard controls; `src/render.js`: temporary visuals; `src/main.js`: connects them.

Proplet imports will be designed after inspecting real export examples. No import format is assumed here.

Start with [our working process](docs/working-process.md). Both Claude and Codex follow it through their repository instructions.

## Current direction

- Entirely playable in a web browser; aim for inexpensive server hosting.
- Import Proplet sprites, animations, tiles and accompanying JSON data.
- Grow a game-specific builder alongside the game to edit content and parameters.
- Reuse interface components and interaction patterns across inventory, crafting and upgrades.
- Plan the whole game lightly; specify and test one small playable version before expanding.

## Next step

The first playable milestone is agreed: one goblin exploring a generated top-down dungeon locally in a browser, using WASD and a hopping movement animation, with wall collision and dungeon regeneration. See [project decisions](docs/decisions.md) for scope and checks.

Next: play the exploration prototype and check the movement feel, room layout and visual interpretation. Automated rules checks pass; visual browser verification is still pending. Server setup and multiplayer testing are deferred.
