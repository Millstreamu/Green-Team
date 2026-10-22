# UI action review · first pass after V92

User direction: apply the campfire review method across actions, research other games, remove excess information and make each action understandable. Preserve accepted mechanics. Start with a concrete preview before committing a new screen layout; no new release is implied by this review.

## Principles already accepted

- Icons and sprites select things; one selected name/effect explains them.
- One primary control changes with current state, rather than competing Unlock/Create/Activate controls.
- Use keycaps plus a short verb. Keep the action available to touch users too.
- Hold to confirm an unlock that spends XP; releasing or changing selection cancels. The release must not perform the next action.
- Keep XP prominent; show resource/count information where it affects the decision.
- Feedback belongs on the affected item, not a whole-window flash.
- Dungeon interactions should keep the world visible. Shared cart deposits are irreversible during the run and bank only on escape.
- Do not hide why an action is blocked. A missing ingredient needs an icon/count and a short reason, not colour alone.

## Action-by-action review

These are proposed follow-up passes, not changes to game rules. Costs, durations, personal ownership, shared-stock spending and multiplayer authority remain the existing domain's responsibility.

| Action | Current friction or check | Proposed pass |
| --- | --- | --- |
| Choose a craft/brew recipe | Repeated recipe names and XP/check text in left list, selected title/effect, ingredient Have text, action note and footer tools | Icon-only selection; name and one effect on right; ingredient sprite plus available/required; one contextual keycap/action; long use instructions behind item details |
| Learn a recipe | Instant recipe purchase differs from approved campfire hold | Hold E on selected recipe action to spend XP; then same action becomes Craft/Brew; release never crafts |
| Craft/brew | Unconditional Shared ingredients note repeats ownership, while output destination is less obvious | Show only missing materials or item-specific success/stock count; preserve shared-material atomic validation |
| Build potion station | Building competes with recipe browsing in one detail panel | Show build state once, with shared-gold cost; after confirmation transition to recipe grid. Preview separately before applying |
| Activate abilities | V90 already approved | Keep icon grid, clear active count, hold unlock/tap toggle, single selected description |
| Select stash item | Selection/name can repeat across grids and context bar | One item name/tooltip; selected-item details. Preserve distinct shared stash and own sack identity |
| Pack/return at lair | Pack/Return already share one action; move is a distinct mode | Keep direction/context visible, hide unrelated actions; make moving unmistakable and cancellable |
| Sell valuables / recover materials | Results explain conversion in prose | Show gold/XP and recovered item sprites first; conversion/left-behind explanation only in details, with outcome-critical loss always visible |
| Choose destination | Resource names, route description, current route and selected status can repeat | Route art/title, difficulty, common-resource sprites and one Set route state; optional detailed risk description |
| Board at departure | Lair modal differs from new dungeon cart hold | Review separately: compact roster/readiness, same Hop in/Hop out vocabulary. Do not silently change team countdown or readiness |
| Open/deposit dungeon cart | V92 already implemented | Keep anchored bubble + sack, clear shared/deposit-only identity, capacity and full/blocked reason; confirm tap/hold distinction in playtesting |
| Pick up floor loot | Mouse lift, E pack and mobile drag have distinct meanings | Audit each input: selected item and destination preview should explain action. Avoid a second persistent instruction paragraph |
| Rearrange sack / rotate | Potential overlap between held, selected, dragging and equipped states | Keep visible selection and valid-placement preview; show Rotate only when meaningful. Do not collapse move and irreversible deposit |
| Equip dart/bell/berries/potion/orb | Long equipped HUD sentences differ by item | Item sprite/count + current phase verb. Preserve equip → move → aim/use; show only current action and cancel when applicable |
| Aim / fire / throw / drink / ping | Some things aim and others act immediately | Do not make all gear pretend to aim. Use item-specific short phase prompts, target/range feedback and confirmation on actual consumption |
| Place trap | Placement combines aim, held confirmation and cancellation | Preview validity in the world, one fill for actual placement, concise blocked reason and cancel. Keep authoritative collision checks |
| Search / hide / revive / rescue | Similar holds but different costs, risk and completion rules | Reuse a consistent keycap/fill presentation near target; retain Packed Lunch requirement and teammate/searcher ownership when relevant |
| Escape / wipe / left behind | Detail totals repeat reward summary, but outcomes differ materially | Keep outcome, gold/XP, item sprites and one Continue action; put item accounting in details; never obscure lost cargo or left-behind status |
| Home / lair management / help | Some prose is reference rather than an action | Separate play essentials from optional help/admin content; do not invent more navigation to hide simple actions |

## Research and interpretation

- No Man's Sky Waypoint: official notes combine technology/cargo access in one view, use the same button for crafting/installing, and provide context-specific repair instructions. Supports one primary stateful action and fewer repeated surfaces; not evidence to copy its larger inventory or mechanics. https://www.nomanssky.com/waypoint-update/
- Minecraft official crafting guide: selecting a recipe displays needed supplies and marks missing supplies. Supports ingredient icons/counts and an obvious blocked state; does not require our game to adopt Minecraft's crafting arrangement. https://www.minecraft.net/en-us/article/how-craft
- God of War Ragnarök official accessibility description: menu holds confirm crafting/spending XP and can have shorter hold settings. Supports deliberate confirmation, not holding every harmless navigation action. https://www.playstation.com/en-my/games/god-of-war-ragnarok/accessibility/
- Grounded official release notes: storage hot deposit and remembered inventory positions reduce repeated inventory work. Preserve predictable placement and direct actions; do not introduce bulk deposit into our one-way cart without a separate decision. https://grounded.obsidian.net/news/grounded/grounded-1-0-release and https://www.obsidian.net/news/grounded/the-time-has-come-to-go-into-the-wood

Specific controls and screen designs for later rows still need their own focused comparison and preview. This table is an audit queue, not a claim that every UI has already been redesigned or externally verified.

## First concrete preview: workbench

An isolated interactive preview shows the six actual workbench recipes, current recipe costs/ingredients and existing game sprites. Sample state:175XP,6scrap,3cloth,1meat,0berries; Snare, Bell and Lunch known, other recipes locked. Select sprite on left; selected name/effect, ingredient availability and one action on right. Hold1s to learn; a separate tap crafts. The item briefly grows/flashes on successful craft. Missing ingredients are count-labelled, not colour-only. No persistent footer instructions, recipe names repeated in slots, recipe cost on every tile, or unconditional Shared ingredients paragraph.

Preview selection is local and does not touch saves. Intended next step is user feedback on this screen before applying the layout and shared hold presentation to crafting and brewing. V92 remains the playable build.


V93: first workbench/brewing pass approved and applied, including user-requested smaller slots, lock overlays and future placeholders. Other action rows remain review proposals.
