# Server saving — V36

Run `npm ci`, then `npm start` as before. Node 22.13+ includes the SQLite database used here; no database download is needed. Existing Node24 works.

## What survives

- Shared gold, materials, crafted stock, stash positions and chosen map/difficulty.
- Each goblin’s identity, prepared home sack, existing XP, recipes and passive purchases.
- Offline goblins’ home sacks, even when other players keep playing.

Everyone returns to the lair with full health after a server restart, with no boarding countdown. Dungeon layouts, floor loot, carried loot/supplies, cages and live timers are not resumed. A launched run durably removes its sacks from the saved home immediately; restarting cannot restore used supplies. Interrupted participants receive a notice. Waiting arrivals keep their home sacks. Successful extraction commits banked gold/materials/unused real gear and cleared participant sacks in the same save. Repeated restarts cannot repeat the haul.

Debug supplies retain their no-credit tag across restart. Existing personal progression is stored; network XP rewards are still disabled, with no free XP introduced by this change.

## Find your goblin

The browser remembers local goblins under a separate online identity key. Use the Goblin selector above the game at home; choose an existing goblin or New goblin. Each tab remembers its own selection. A fresh tab first tries the first remembered goblin. If already connected, it gets a separate goblin, preserving two-tab testing. Choosing another identity is disabled while any run is active. This is local identity recovery, not an authenticated account system.

Use the same browser and `http://localhost:8080`. Site storage is specific to the address, browser and port. Clearing it or using another browser/device does not restore the old goblin; account login/recovery and group invitations remain future work. The server exposes only each client’s own identity key/profile/bag, not anyone else’s keys. Solo saves use their existing keys and remain separate.

## Updating and backup

The default save is `data/home.sqlite` inside the game folder. Stop the old server with Control+C before copying. Copy the entire **data** folder into the new version’s folder before running it. To back up, copy data to a safe location with the server stopped. Downloads and Git intentionally exclude all runtime data. V35 was memory-only, so there is no old file to import into V36.

A server operator can set `GREEN_TEAM_SAVE_FILE` to a fixed database path outside version folders, so updates can reuse it automatically. One server process must own each save file; this slice does not coordinate several server instances. The server prints the actual path when starting. Keep backups private: the save contains the local test identity keys.

## Failure handling

One SQLite row contains the versioned home snapshot, committed as one atomic statement with FULL synchronous durability. All players and the shared home are stored together. The application compares durable state to avoid writing movement-only ticks. Acknowledgements and broadcasts happen after commit. Abrupt process death needs no final flush.

Loading checks schema/version, counts, profiles, unique identities/item IDs, item footprints and bags. Unreadable or unsupported saves stop startup rather than silently resetting. Do not delete that file to make an error disappear; retain a copy and restore a known backup while the server is stopped. On write failure the session blocks further changes, the server pauses simulation, and players see a saving error. Fix disk space/access, then restart from the last successful save.

There are no public accounts, named group selection, cross-device identity recovery, automatic backups, public hosting or network XP reward transactions yet. This is one durable friend-group home on the existing local server.

## Verification

Automated checks cover SQLite close/reopen, distinct sacks, stock/crafting/stack/destination/purchase persistence, monotonic item IDs, boarding recovery, run-launch consumption, waiting-player preservation, interrupted-run cleanup, bank-once extraction, malformed/unsupported saves, failed commits and live save-error feedback. Real WebSocket tests restart a server and recover the same goblin. A separate child-process test launches the actual server entry point, forcibly kills it without shutdown, confirms a home sack survives, then kills a launched run and confirms its sack cannot return. Browser entry event tests cover selector switching, disabled selection in a run and save feedback; pure identity tests cover closed tabs, simultaneous tab registration and blocked storage. Rendered browser appearance and manual Mac feel remain user playtests.
