# Stash design review · packing first

User confirmed: preparing the sack is the stash's main purpose; organising team supplies is secondary. Review loop: identify essential information → research comparable interactions → test relevance → keep/discard → preview. Do not implement a new stash layout before reviewing the concrete proposal.

Critical: available sprites/quantities and selected name, short item effect, shared-versus-personal ownership, exact transfer direction/amount, actual sack occupancy/fit, clear completion/failure and accessible exit. Existing Pack takes1; Return returns the chosen entire stack. Supplemental: detailed instructions, rearrangement mode, small relevant capacity count; filters/sorting only when content warrants them. XP/recipes do not belong in the main packing task.

Comparisons:
- Minecraft official education controls: pick up then place between container and inventory. Clear source/destination, but adds placement steps to quick restocking. https://education.minecraft.net/lessonsupportfiles/5649416576470887-Element%20Quest%20Lesson%20Plan.pdf
- No Man's Sky Synthesis: drag/drop swaps and transfer quantity controls. Good fit for deliberate rearrangement, less compelling as the primary phone packing action. https://www.nomanssky.com/synthesis-update/
- Grounded official interface notes: Deposit/Retrieve in item context menus. Supports explicit transfer verbs tied to the selected item, without requiring us to copy another game's menus or amounts. https://grounded.obsidian.net/news/get-ready-as-the-bugs-strike-back

Recommendation for review: tap/click selects, then E or the single contextual action transfers. This is our design inference, not a claim of universal usability superiority. Direct tap transfer could be faster but competes with selecting an unfamiliar sprite for its name/effect. Drag is useful for arranging, but need not be mandatory for packing. Keep arrangement secondary. Avoid holds for reversible pack/return actions; retain the existing holds for purchases elsewhere.

Isolated packing preview: shared stock left, own3x3 sack right, one selected-item strip and changing Pack1/Return×N prompt. Dashed destination square previews first free bag square for these single-cell sample items. Small item animation confirms packing. Stock uses36real storage positions, with3x3phone pages; empty storage cells are not decorative future placeholders. No bulk transfer/filter/recipe/XP controls added. Sample state and quantities are local, not live saves; no multiplayer transport is simulated. Later implementation must use actual item shapes, stacking/auto-fit rules, stash arrangement and authoritative shared-stock feedback rather than treating all items as single-cell.

Preview behaviour checked: correct stock decrement/increment, pack/return direction,36/9grid cells and full sack refusal without losing stock. Syntax checked. No browser/physical phone claim; game remains V94.


User refinements accepted for next implementation: WASD crosses between grids at their facing edges (D from stash into sack, A back), rather than requiring Q. Center the sack vertically against the stash grid. Remove visible Shared stash heading; retain ownership via screen context/accessibility labels. Future real lair stash menu should be an inset panel with the lair visible around it, not fullscreen. Preserve legible touch sizes and internal paging/scrolling on small landscape phones. Preview updated for cross-grid navigation and centering; menu/background treatment is explicitly for implementation, not a fake screenshot of the lair.


V95: user approved implementation. Packing-first layout and requested edge-crossing/centering/inset lair treatment applied. Domain-backed destination preview handles real shapes/stack merging. Organisation remains secondary, shared stock authority/economy unchanged.
