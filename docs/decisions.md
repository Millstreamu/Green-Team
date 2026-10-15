# Project decisions

## Agreed behaviour

- Players join through a web browser.
- Each player controls a goblin in a lightweight 2D multiplayer game for friends.
- Goblins loot dungeons controlled by humans, dwarves or elves. Guard alert and pursuit create a rush to escape.
- Between runs, players inhabit a shared lair, decorate with loot, build crafting tables and prepare items or upgrades. Craftable escape aids can include mines and traps.
- Aim for inexpensive server hosting.
- A game-specific builder should support changing parameters and assigning imported art to game content.
- Proplet supplies sprite, animation and tile sheets with accompanying JSON. Inspect actual example exports before defining the importer.
- Shared interface elements and controls should be reused across features.
- Claude and Codex follow one documented working process stored with the project in Git.
- Check interpretations with readbacks and concrete examples; keep communication short and accessible.

## Still experimenting

- Exact first playable scope, player count and run length.
- Engine, networking approach, hosting provider and budget.
- Movement, combat, detection, carrying loot, capture and escape rules.
- Lair ownership, saving, progression and builder capabilities.
- Repository hosting location and remote connection.

Earlier scrapbot and goblin-management ideas are context only, not requirements for this game unless explicitly adopted.
