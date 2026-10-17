# Server admin — V39

V39 adds a **Selected lair** dropdown with its join code. Shared stock/reset-lair and End run affect that lair. Personal XP is global, Reset goblin clears its sacks in every lair, and Reset all affects every group. Backups/restore cover the entire server. All runs must end before editing/restoring; End run only ends the selected lair's run. Migrated saves appear as Original Lair, with their code here. See [lair-entry.md](lair-entry.md) for current scopes and migration.


## Open it

Start the game with `npm start` as usual. Terminal now prints **Private server admin:** followed by a link. Open that whole link in your browser on the server computer. It opens a separate admin page; the game screen has no admin controls. The link changes each restart, so use the current Terminal link.

For a first test, make a backup, set one goblin to80XP, buy a recipe/passive in the game, then restore the backup. The saved home and connected game screens update together.

## Available actions

| Action | Effect |
| --- | --- |
| Make backup now | Saves the shared home and all personal saves on the server. Available during runs too, but does not save the live dungeon. |
| Save quantity | Sets shared gold, a material or crafted gear to a whole nonnegative quantity. Does not award XP. |
| Save XP | Sets only the selected goblin's available XP. Keeps owned upgrades and lifetime XP at least as high as the new balance. |
| Reset lair | Restores the selected lair’s starter stock, zero gold, default map and stash layout. Keeps all personal bags and progression. |
| Reset this goblin | Clears that goblin's sacks in every lair, global XP and purchases. Keeps its identity and everyone else's progress/stock. |
| Reset all progress | Restores starter shared stock in ALL lairs and clears every personal bag, XP and purchase. Keeps identities and backups. |
| Restore selected backup | Restores the saved home, bags and profiles from that point. Goblins created later keep their identities but reset bags/progression. |
| End run | Forces the current run to end, loses its carried loot/supplies and awards no gold/XP. Everyone returns home; waiting goblins keep their home sacks. |

Every edit, reset, restore and forced run ending backs up all lairs and global profiles first. If backup fails, nothing changes. Resets, restores and forced run ending ask for confirmation in the browser. Normal gameplay keeps running while the admin page is open. Editing/resetting/restoring is blocked while any dungeon is active; end that run first. Making a backup during a run captures the durable home projection, with participating bags already spent; it cannot restore cages, floor loot or live runs.

Resetting doesn't create new goblin identities, so existing tabs can reconnect normally. Restore updates the same live actor objects, including offline goblins, without duplicating stock or disconnecting everyone. Item numbering never rewinds into existing IDs. When no run is active, an edit also cancels boarding and returns goblins to their normal home spawn. Values save before success is reported; a failed commit pauses the game and blocks further admin changes until disk access is fixed and the server restarted.

## Where backups live

Backups are private JSON files inside **data/backups**, beside **data/home.sqlite**. The page lists their creation time and action. After each change the selected backup is its before-change snapshot, making undo straightforward. Restore itself makes another before-change backup, so that restoration can be undone too. No automatic deletion/retention policy is added.

For game updates or an external copy, stop the server and keep/copy the entire data folder, including backups. A custom GREEN_TEAM_SAVE_FILE path stores backups in a backups directory beside that save. Neither the save nor backup contents are available through the game HTTP routes or included in Git/downloads. The files contain local identity keys; keep copies private.

If startup cannot read a damaged save: stop the server, retain a copy of the damaged database/journal, move the damaged home.sqlite and its matching journal aside, and keep data/backups in place. Start a fresh home, open its new private admin link and restore a known valid backup **before refreshing game tabs**. This avoids replacing remembered browser identities with new ones before the old identities are restored. Unsupported newer saves should be opened with the correct newer game version instead. Fix disk space/permissions first if writing is failing.

## Scope and access

The admin endpoint requires a random per-start capability from Terminal, loopback connection and a local host name. Browser commands also require the same origin and a custom private header; ordinary game WebSocket commands have no admin access. The secret stays in the private link/header, never game state or normal page links. API responses list names/IDs/balances, not other players' reconnect keys or full backup contents. Bad inputs/paths, unsupported backups, cross-origin requests and missing/wrong keys cannot mutate state.

This is local operator tooling for the named-lair server, not a hosted administrator account/role system. Backups are home/profile snapshots rather than resumable dungeon saves or downloadable public exports. A later public server needs its own authenticated admin deployment design.

Save edits/restores apply coherent new home snapshots: connected goblins stay in their selected group, return to its home spawn and cancel boarding. Stock/progression outside the requested reset scope stay unchanged. End run uses the selected engine directly and leaves other groups’ ongoing runs intact.
