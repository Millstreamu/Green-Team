# Visual torch lighting — V47

User approved a first visual lighting pass after accepting V46 joins and deferring dedicated inner-corner art. Scope: warm wall torches, gentle flicker, darker corners/corridors; guard visibility/gameplay stays as before. No stealth-in-darkness rule was chosen.

## Placement and drawing

src/lighting.js generates one decorative torch per room where a valid wall spot exists. PROP_RULES.torch reuses placeProp, so anchors sit on the grid, walls/doorway lanes are respected and no generation RNG is changed. Prefer a free wall; if crowded, a low chest/crate may sit beneath a torch. Cupboards, barrels, cages and guard doors remain excluded. Flame/bracket art is temporary code-drawn pixel art in the existing style. Mount lies just outside the floor anchor on the adjoining wall. Torches have no collision, interaction, inventory item or economy effect. They are render-only decorations.

Renderer caches a torch list and96-ray static occlusion polygons per world with WeakMap. Rays march at.12tiles, stop at the first solid cell and illuminate up to.5tile into its face while remaining inside that blocking cell, so light cannot cross a thin wall into the next room. The light radius is5.5tiles. A reusable viewport mask applies38%cool ambient shade, removes shade with radial gradients around visible torches, then screens a subtle warm tint over lit areas. Flicker is a bounded±4.5%mixture of slow sine waves seeded per torch, independent of simulation state. It changes brightness gently rather than flashing. Only viewport-near lights draw gradients; static placement/rays are computed once, and one offscreen canvas is reused/resized.

Torches are drawn behind room furniture. Shade/tint applies to the world/actors; rescue bars draw afterward. DOM HUD, menus and minimap remain unchanged and the lair skips lighting entirely. Existing in-world labels receive the moderate shading but remain legible in the inspected scenes. All cultures receive this lighting; Human retains supplied floor/wall art and Dwarf/Elf retain temporary terrain. Smoke/props/actors do not cast extra shadows in this first pass. There is no player flashlight or sight-restricting fog.

## Multiplayer and settings

This code is client rendering only. No server, AI, movement, room layout, collision, loot, heat, search/recovery or save schema changed. The same static layout and furniture positions produce the same torch locations in different clients, including late views after searches/occupancy changes. Animation phase follows each browser's local clock; it has no shared gameplay effect. Torches are derived rather than transmitted in snapshots. Lighting constants live together in LIGHTING in src/lighting.js. They are not exposed in builder/export yet; adding lighting controls is a separate possible follow-up. Existing Moss tuning/presets and saved economy are preserved. Standalone builder embeds the module, with no new runtime package/art files.

## Checks

Placement/immutability tests cover45layouts across all architectures, including tile/wall anchors, reserved lanes, tall-prop/door clearance, deterministic results, unchanged guard sight and lair skip. Ray test contrasts a solid partition with an open doorway; flicker test bounds brightness and frame-to-frame change. Renderer tests check scene/mask reuse, composite restoration and gradient drawing. Existing rendering tests/entry DOM fixtures support gradients. Native Canvas renders of actual Human and Dwarf game scenes were visually inspected; this does not claim browser automation. Full results in work-status.md. User playtest: judge warmth/darkness/flicker and navigation readability before adding gameplay lighting rules.
