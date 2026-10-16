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

## First playable milestone — agreed 16 October 2026

- Local browser play with one goblin; no rented server or multiplayer testing yet.
- Top-down view showing the dungeon floor and walls.
- Procedurally generated connected rooms, with a control to generate a new dungeon.
- WASD movement, with a small visual hop while travelling. The hop does not change floor position or allow jumping over walls.
- Walls block movement.
- Keep input, game rules and drawing separate to make later multiplayer integration easier; this is preparation, not proof that multiplayer works.
- Postpone guards, loot, crafting, lair features and the builder interface until after this exploration milestone.
- Use meaningful playable chunks rather than requiring a planning discussion for every small implementation detail.

Check the milestone by loading it locally, exploring all connected rooms, moving in different directions, checking wall collision, and generating another layout. Evaluate the movement feel with the user.

The recommended next multiplayer checkpoint is after exploration feels right and before adding many interacting gameplay systems. Begin with multiple local browser windows; hosting can follow later. No multiplayer implementation or testing is included in this milestone.

Handmade room templates arranged procedurally are a proposed approach, not a required generation algorithm. Temporary art is acceptable until actual Proplet exports are supplied.

## Still experimenting

- Final multiplayer player count and run length.
- Engine, networking approach, hosting provider and budget.
- Movement speed and animation feel; combat, detection, carrying loot, capture and escape rules.
- Lair ownership, saving, progression and builder capabilities.
- GitHub repository established at https://github.com/Millstreamu/Green-Team; technical stack selection remains the next preparation step.

Earlier scrapbot and goblin-management ideas are context only, not requirements for this game unless explicitly adopted.

## Exploration feedback — 16 October 2026

- User confirmed the prototype works, then approved their supplied goblin art and the higher movement hop in the V2 download.
- Future dungeon generation should offer rooms with multiple entrances and looped routes for evading guards or hiding. This is a future design direction, not a requested change to the current prototype.
- Guard navigation and patrols on generated maps remain unimplemented and unverified. When the guard stage begins, validate reachable patrol points, pursuit and recovery from blocked or failed routes together with dungeon layout. Patrols are feasible in principle; the current game has not demonstrated them.

## Sack and loot — agreed 16 October 2026

- Always-visible 3×3 sack at the bottom right; 1-, 2- and 3-square footprints, including straight and L-shaped three-square loot.
- R rotates an item being held. Click a sack item to lift/rearrange it; click an empty position to place it if it fits. Drag-and-drop is also supported.
- A highlight reticle identifies the E pickup target. Prefer loot near the cursor within goblin reach; otherwise highlight the closest reachable loot. Walls block pickup.
- E with empty hands tries to pack the highlighted item automatically, trying rotations without moving packed items.
- If no placement fits, leave loot on the floor and explain that the sack needs rearranging. No invisible extra storage or automatic repacking.
- Clicking nearby floor loot lifts it onto the cursor for manual placement. While holding, E or clicking the dungeon drops it near the goblin. Dropped loot remains available.
- Invalid sack placements keep the item held and show red feedback. Never silently replace an item or delete loot.
- A sack on the goblin's body has not been agreed; the current request is the inventory panel. Item art is temporary and shared between floor, bag and held previews.
- This chunk is pickup and packing only; extraction, persistence, guards, hosting and multiplayer remain outside it.

## Secret tunnel and run completion — agreed 16 October 2026

- User approved the V3 sack and requested the next chunk.
- Return to the entrance to leave; it represents a secret tunnel, rather than a separate exit to find.
- Press E at the marked tunnel to end the run and show the loot brought back, with a Start next run button.
- Implementation details for this test: only packed items count; a cursor item must first be packed or dropped. While holding, E retains its drop behaviour. With empty hands inside the small tunnel interaction area, E takes priority as leave; the on-screen prompt and reticle reflect this. Outside that area, E continues to pack highlighted loot.
- Results freeze gameplay. Start next run creates a fresh dungeon and empty sack. The result is a single-run haul display, not permanent storage; lair/stash and saving remain future work.
- Empty-handed returns are allowed. The header action abandons an unfinished run after confirmation; it does not count as a successful return.

## Future map note — 16 October 2026

- User wants a map that can be opened to view the dungeon layout, with no indicator for player position or the secret tunnel.
- Deferred for later; no implementation requested now. The current always-visible diagnostic minimap and its markers are temporary prototype aids, not the intended final map behaviour.
- Opening control and whether the full layout is known from the start or revealed by exploration remain undecided.

## Guard pressure and downed players — 16 October 2026

- Guards chase and attack; catching up is not automatic run failure. Their purpose is to pressure goblins into leaving through the entrance tunnel.
- At zero health the goblin goes down. If not recovered, their stuff is lost and they return once the run is over.
- Teammate recovery is a possible future mechanic, not implemented or fully specified. Recovery method, timing, cost and treatment of loot remain open.
- Solo implementation: no active teammate remains when the only goblin goes down, so the run ends, carried bag/cursor loot is lost, and a fresh run restores the goblin. This is the solo fallback, not a rule that one teammate going down will end an entire multiplayer run.
- First guard implementation patrols generated room routes, notices visible goblins, chases, searches the last visible location after losing sight, then resumes patrol. Walls block sight and strikes.
- Initial balance choices are provisional: three health, a visible attack wind-up, a gap between damaging hits, and a chase speed slightly below the goblin's movement speed. Tune these after playtesting.
- The faint sight cone, notice indicator, attack circle and guard-status text are prototype feedback. No global alarm, player combat, guard body blocking, traps, revival or multiplayer networking are added in V5.

## Looping routes — agreed 16 October 2026

- User reported V5 works pretty well and approved improving dungeon routes next.
- Add extra connections and room entrances so players can loop around guards; keep some dead-end rooms.
- V6 extends the existing generator rather than replacing it. The configured budget is three extra connections; only accept routes that reduce a meaningful existing detour and increase room entrances. Preserve two existing single-entrance rooms where available.
- The route budget, minimum detour saving, connection length limit and dead-end preservation count are editable configuration values, not a builder interface yet. Particular layouts may use fewer shortcuts if no eligible route exists.
- Guard navigation, movement, inventory and combat rules are reused. No new guard behaviour or deferred map feature is introduced by this step.

## Search before looting — agreed 16 October 2026

- User approved V6 and deferred the suggested builder/balance panel until more core gameplay is present.
- Rooms contain searchable furniture such as chests, cupboards and crates. Valuables should fall out after searching, then use the existing floor pickup and sack controls. This adds time/risk instead of running through rooms grabbing visible items.
- Hold E while staying beside the highlighted object, with progress feedback. Releasing E or moving away cancels the search. Guards continue acting while searching.
- V7 implementation details: taking a hit, lifting an item, losing reach/sight, going down or losing focus also interrupts. Cancelled searches reset progress; the object can be attempted again. Completed objects are marked searched and cannot duplicate their contents.
- Completion spills loot to accessible nearby floor with a brief animation. It does not auto-pack or collect multiple items from the held search key. Release and press E again to pack, or click spilled loot for manual placement.
- The same reach/cursor preference and highlight style select either floor loot or an unsearched object. E still drops a held item first and exits at the tunnel when hands are empty; outside the tunnel it performs the highlighted action.
- Initial search times and contents are provisional test data. Furniture art is temporary and does not add collision yet. No builder panel, permanent stash, map redesign, new alarm system or multiplayer added in this chunk.
