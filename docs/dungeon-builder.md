# Dungeon builder and tile placement — V42

## Accepted scope

User accepted a generator editor with a small map preview, saved architecture presets for human/dwarf/elf maps and independent difficulty. The same layout number is kept while adjusting settings; Generate another samples a different layout. Furniture, hiding spots and future decor share the floor tile grid, with wall/corner placement and room routes kept clear. Preview includes furniture/hiding and other fixed dungeon features. This extends the approved V41 builder.

## Experience

Private local server admin → select lair → Dungeon generator → architecture. Fourteen numeric fields cover width/height, requested rooms, min/max width/height, corridor width, extra bends, direct connection length limit, attempted loops, protected existing dead ends, furniture per room and hiding interval. Dimensions/counts are bounded whole numbers. Invalid ranges show an explanation and clear the stale preview. Editing updates the preview after a short debounce; Update preview is immediate. The example number and difficulty are separate from saved settings. Grid toggle changes only display. Save stores the selected architecture for future departures; reset saves that architecture's defaults immediately. Existing numeric control generation is extracted and reused by both builder forms. Polling preserves drafts; switching lair/type loads its saved fields.

The in-game map table offers Human Manor, Dwarf Hold and Elf Sanctuary, each with Normal/Hard. Architecture settings are per lair and per type; gameplay tuning remains per lair. Human starts with varied room sizes/branching halls, Dwarf with larger rectangular rooms/three-tile passages, Elf with smaller rooms/extra corridor turns/more attempted loops. These are experimental starting presets, not a finished cultural art direction or a new difficulty progression. Preview chooses fresh example numbers; saving never forces that exact map into the next run. Actual runs choose random numbers normally.

## Shared generation

src/generator-settings.js defines bounds/default presets/validation and converts them into existing generator configuration. src/world.js extends its connected-room generator with configurable sizes, passage width/bends and room-connection limit. addRoomLoops checks the whole widened shortcut footprint against protected dead ends. All floor stays connected and outer tiles stay closed. Max connection measures room-centre Manhattan distance, not just exposed hallway floor. Generation remains bounded at600 candidate rooms; crowded layouts/short connection limits may produce fewer rooms than requested. Loop/protected-dead-end settings are attempts: there may be insufficient valid candidates. Counts in preview show actual/requested rooms and loops. Extremely constrained settings can produce a single quiet room rather than an invalid/disconnected map.

The server copies complete layout config at departure; snapshot includes it alongside seed. Browser regenerates the same floor. Changing presets during play leaves the active world untouched; the next matching departure uses the saved values. Solo uses the same architecture defaults, without server editor persistence.

src/dungeon-preview.js composes actual generator/search/hiding/guard/cage/door functions. Server and preview use the same obstacle order for cages, including guard-door spawn tiles. Normal/Hard modifies guard coverage, not floor geometry. Private preview includes original guard posts; normal player map rules are unchanged.

## Tile objects

src/prop-placement.js is shared placement policy for search furniture, hiding barrels and cages and a base for future decor. PROP_RULES defines width/height in whole floor tiles plus wall, corner-preferred or free placement. A tile anchor and footprint convert to world coordinates; current one-tile props centre at half-tile coordinates. Candidate footprints must fit floor, avoid occupied cells, spawn area and doorway-to-centre reserved lanes, and have a walkable room-side approach. Current wall-facing metadata supports future directional art. Current sprites keep their existing appearance. Crates prefer corners and can use another valid wall position when corners are unavailable. Props are skipped when no appropriate space remains. The entrance retains the existing minimum of three introductory searchables; its count becomes four when the density is four. The editor label makes that minimum explicit.

Cages use the same grid placement and room-side rescue/jailer point, outside entrance room, away from props/guard homes/guard doors. Jailers face into the room based on wall orientation. Guard-door art remains anchored to its wall edge. Moving actors, traps/loose loot and the stored outside position for leaving hiding continue using continuous coordinates. This slice reorganises fixed generated props; it does not add furniture collision, decoration assets or manual painting. Existing movement/line-of-sight rules remain floor based. Larger footprints are supported and checked with a two-tile fixture, but no large production prop is added yet.

## Saving and verification

Optional lair.generator metadata holds all three validated field sets in existing payload2; no SQL table/dependency change. Old saves/backups with no generator use defaults; malformed present settings reject. Private set-generator/reset-generator uses existing before-change backups and hub atomic checkpoint. Failed backup prevents mutation; failed checkpoint pauses the hub. Progress resets keep architecture settings; full restore includes them (old backups use defaults). No new player-side admin commands.

Tests include90 seeded architecture layouts with connectivity/bounds/grid/wall/doorway checks, constrained/extreme configurations, preview/run equality on all three types and both difficulties (including props/cages/doors), multi-tile footprint reservation, validation, two-lair isolation, map-table selection and active/next-run/restart/backup lifecycle. Existing search/hide/rescue/UI fixtures now approach the generated wall-facing access points instead of assuming furniture immediately beside spawn. The long solo event test walks to the new wall chest and still searches/loots/banks/loses/crafts/hides through actual controls. Full results are recorded in work-status.md. Rendered browser QA was attempted but no Chromium executable is installed; DOM/network/drawing tests are not presented as rendered QA.


V48: searchables are solid movement obstacles. Hallway footprints (including wider corridors and added loops) stay clear even when crossing a room. Doorway-to-centre lanes stay clear too. Placement never splits walkable floor into disconnected pockets. Cupboards require a top/back wall; no valid slot means fewer objects. Chest/crate art fits one32px source ground tile, scaled with the floor. Preview counts/layout use exactly these same rules.


V49: hiding barrels also register solid footprints, fit one source tile and use the same corridor/connectivity checks. All future static dungeon scenery must use shared whole-tile footprints/grid placement; use multiple tiles for larger props. Wall-mounted/flat art may explicitly remain non-solid.


## Route checks — V52

Every private generator preview now includes read-only checks via dungeon-checks.js. It floods actual walkable tile centres from the entrance, checks map boundary/room door access and static prop grid/overlap/reserved corridors/solid masks/back-wall cupboards. It verifies interaction approaches, guard patrol legs and roaming circuit legs, cage routes and jail/rescue points. It builds actual reinforcements for each door and tests their patrol legs. Paths run through existing findPath/followPath with the shared collider radius. Mutated data tests prove the checker detects deliberately blocked targets/routes and placement violations.

Red outlines mark located errors; orange marks located warnings. Unlocated warnings (e.g. no cage could fit) appear in the list. Lists cap at50rows; all located issues remain marked. Check30 layouts checks consecutive unsigned seed numbers from the current example using the current architecture/difficulty/form draft. It yields between seeds, shows progress and lists affected seeds as buttons. Viewing a batch result keeps the list; editing settings/seed/architecture/lair cancels stale batches and clears old results. Switching grid visibility only redraws. Checking does not write settings, saves, stock or active runs. Requested counts being lower than requested is not automatically an error.

Run `npm run check:dungeons -- 100` for all three current code presets on Normal/Hard using100 dispersed deterministic seeds per combination. It prints issue records with architecture/difficulty/seed and exits unsuccessfully if any layout has errors. Warnings remain visible without failing the command. Range1–1000 seeds per combination. This command and browser share the same checker. No extra dependencies. Walking/corner checks do not replace movement-feel/chase playtesting or art inspection.


## Optional treasure room — V55

Actual preview/server/solo creation selects the treasure room after searchables/hides and before guards/cages/doors. Gold gate markers show locked inside thresholds; all entries to the chosen room open together. Key source is not marked for players. Diagnostic general connectivity/approaches use the opened-door view; additional closed-door flood verifies key access, no key inside its own room, no bypass and all outside routes connected. Preview reachable count explicitly says after unlocking. Constrained layouts without a safe optional room receive a warning rather than a progression-blocking lock.
