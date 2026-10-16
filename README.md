# Goblin Game

A lightweight 2D browser multiplayer game for friends: goblins steal dungeon loot, evade guards, escape together, and improve a shared lair.

Planning stage. No engine, hosting provider, player limit, or technical stack has been selected.

Start with [our working process](docs/working-process.md). Both Claude and Codex follow it through their repository instructions.

## Current direction

- Entirely playable in a web browser; aim for inexpensive server hosting.
- Import Proplet sprites, animations, tiles and accompanying JSON data.
- Grow a game-specific builder alongside the game to edit content and parameters.
- Reuse interface components and interaction patterns across inventory, crafting and upgrades.
- Plan the whole game lightly; specify and test one small playable version before expanding.

## Next step

The first playable milestone is agreed: one goblin exploring a generated top-down dungeon locally in a browser, using WASD and a hopping movement animation, with wall collision and dungeon regeneration. See [project decisions](docs/decisions.md) for scope and checks.

Next: choose a small browser-friendly technical foundation and implement this milestone. Server setup and multiplayer testing are deferred; keep controls, game rules and drawing separate in preparation.
