# Server saving — V38

Run `npm ci`, then `npm start` as before. Node 22.13+ includes the SQLite database used here; no database download is needed. Existing Node24 works.

## What survives

- Shared gold, materials, crafted stock, stash positions and chosen map/difficulty.
- Each goblin’s identity, prepared home sack, existing XP, recipes and passive purchases.
- Offline goblins’ home sacks, even when other players keep playing.

Everyone returns to the lair with full health after a server restart, with no boarding countdown. Dungeon layouts, floor loot, carried loot/supplies, cages and live timers are not resumed. A launched run durably removes its sacks from the saved home immediately; restarting cannot restore used supplies. Interrupted participants receive a notice. Waiting arrivals keep their home sacks. Successful extraction commits banked gold/materials/unused real gear and cleared participant sacks in the same save. Repeated restarts cannot repeat the haul.

Debug supplies retain their no-credit tag across restart. Personal XP from the actual banked team valuables is now stored with shared gold and all participant profiles in one commit. Every departure participant earns equally, including offline/expired and left-behind goblins; waiting arrivals are excluded. Failed/interrupted runs earn none. One existing rule calculates rewards (1XP per valuable gold); materials/equipment/debug items earn none. The client cannot submit its own XP or ownership.

## Find your goblin

The browser remembers local goblins under a separate online identity key. Use the Goblin selector above the game at home; choose an existing goblin or New goblin. Each tab remembers its own selection. A fresh tab first tries the first remembered goblin. If already connected, it gets a separate goblin, preserving two-tab testing. Choosing another identity is disabled while any run is active. This is local identity recovery, not an authenticated account system.

Use the same browser and `http://localhost:8080`. Site storage is specific to the address, browser and port. Clearing it or using another browser/device does not restore the old goblin; account login/recovery and group invitations remain future work. The server exposes only each client’s own identity key/profile/bag, not anyone else’s keys. Solo saves use their existing keys and remain separate.

## Updating and backup

The default save is `data/home.sqlite` inside the game folder. Stop the old server with Control+C before copying. Copy the entire **data** folder into the new version’s folder before running it. To back up, copy data to a safe location with the server stopped. Downloads and Git intentionally exclude all runtime data. V35 was memory-only, so there is no old file to import into V36.

A server operator can set `GREEN_TEAM_SAVE_FILE` to a fixed database path outside version folders, so updates can reuse it automatically. One server process must own each save file; this slice does not coordinate several server instances. The server prints the actual path when starting. Keep backups private: the save contains the local test identity keys.

## Failure handling

One SQLite row contains the versioned home snapshot, committed as one atomic statement with FULL synchronous durability. All players and the shared home are stored together. The application compares durable state to avoid writing movement-only ticks. Acknowledgements and broadcasts happen after commit. Abrupt process death needs no final flush.

Loading checks schema/version, counts, profiles, unique identities/item IDs, item footprints and bags. Unreadable or unsupported saves stop startup rather than silently resetting. Do not delete that file to make an error disappear; retain a copy and restore a known backup while the server is stopped. On write failure the session blocks further changes, the server pauses simulation, and players see a saving error. Fix disk space/access, then restart from the last successful save.

There are no public accounts, named group selection, cross-device identity recovery, scheduled backups, or public hosting yet. This is one durable friend-group home on the existing local server.

## Verification

Automated checks cover SQLite close/reopen, distinct sacks, stock/crafting/stack/destination/purchase persistence, monotonic item IDs, boarding recovery, run-launch consumption, waiting-player preservation, interrupted-run cleanup, bank-once extraction, malformed/unsupported saves, failed commits and live save-error feedback. Real WebSocket tests restart a server and recover the same goblin. A separate child-process test launches the actual server entry point, forcibly kills it without shutdown, confirms a home sack survives, then kills a launched run and confirms its sack cannot return. Browser entry event tests cover selector switching, disabled selection in a run and save feedback; pure identity tests cover closed tabs, simultaneous tab registration and blocked storage. Rendered browser appearance and manual Mac feel remain user playtests.

## V37 reward durability

Settlement uses the immutable departure roster and one live settled flag. It reuses the existing profile award calculator and keeps its temporary receipt cache off network snapshots. The lair checkpoint atomically saves shared bank changes, cleared sacks and every participant’s XP before acknowledging an escape. Live dungeons/results are not reloaded or replayed on restart, so the durable state is either the previous launched-run snapshot (no rewards) or the completed home snapshot (bank and XP together). No client command can replay a run ID or grant XP. Separate durable run history/receipt browsing is not part of this slice; if resumable runs are added later, they must retain this guarantee with a durable settlement ledger.

Personal purchases already use server profile balances/station checks and save immediately. Recipe ownership remains separate per goblin; crafting spends shared materials and puts output into the acting goblin's sack first. Quick Fingers derives search rate from the stored profile when a run begins. Offline reward balances persist even if the temporary result/notice is missed. V36 schema1 saves work unchanged in V37.

## V38 admin backups and recovery

The private browser admin tool adds manual backups plus an automatic before-change backup for each reset, stock/XP edit, restore and forced run ending. These are versioned validated JSON snapshots under data/backups, flushed before changes can commit. Restore uses the same atomic SQLite checkpoint and keeps current goblin identities. Backup failure prevents the action. Database commit failure keeps the backup and pauses the session. The normal game cannot call admin actions. See [server-admin.md](server-admin.md) for reset scopes, private-link access and damaged-save recovery. V36/V37 schema remains compatible; keep the entire data directory during updates. Backups exclude live dungeon state just like the durable home save. They are not a scheduled or off-machine backup service.
