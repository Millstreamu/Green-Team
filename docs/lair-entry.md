# Home screen and named lairs — V40

Start the server as usual and open http://localhost:8080. You now begin on a home screen with your existing goblin, displayed level and XP. There are no recipe/passive controls there. Use **Create lair** with a name, or **Join lair** with a name and six-character code from a friend. Newly created lairs start with the normal starter stock. The server generates the code; it appears beside the lair name above the game after joining. Everyone in that lair can share it.

Names are unique on this server,1–32 characters, trimmed and matched without case sensitivity. Codes are matched without case sensitivity. Friends supply them when joining; creators can use Your lairs to enter without a code. Five wrong-code attempts temporarily pause that goblin's attempts for10seconds. Previously visited friends’ lairs show names only and prefill the join name; they do not reveal or bypass codes. There is no public directory of other groups' lairs.

## Your lairs

The server records the creating goblin's ID. That goblin sees the lair in **Your lairs** and can enter with a dedicated button, without supplying the code. The friend join form stays separate. Knowing a lair ID or having visited before does not make another goblin the creator. Normal name-based join also recognises the owner. Ownership survives restart, personal/all-progress reset and backup/restore, and gives no server-admin powers.

V39 did not store a separate creator field, but normally saved the creator as its first lair member. V40 backs up and uses that first saved member for old groups; older empty groups remain unowned and still require their code. Existing explicit unowned records never become owned merely because someone visits. Restoring an old backup without ownership metadata preserves a known current owner where possible. Keep using the same goblin identity to see its lairs.

## What travels with the goblin

| Personal across this server | Kept separately in each lair |
| --- | --- |
| Goblin identity and name | Shared gold and stash quantities/layout |
| Available and lifetime XP | Prepared sacks, including paid/debug item tags |
| Owned recipes and passives | Selected map/difficulty, boarding and dungeon/run state |
| Displayed level | Each team's alerts, guards, searches, loot and results |

Click **Home screen** above the game to leave a lair, then join/create another. Packed sacks remain saved with their lair; changing groups cannot carry another lair's supplies into a new economy. Upgrades are still bought at the workbench/campfire. Their knowledge/effects follow the goblin between lairs. You cannot leave an active run through this button, even downed/caged: finish that run or use the operator's existing End run tool. Waiting arrivals may return to the home screen.

The displayed level currently starts at1 and rises every100 lifetime XP. Spending XP never reduces it. This is a provisional display rule, not token awards, unlock gates, perks or a final progression curve. Tune levelXp in PROGRESSION later. No separate level field can drift out of sync with XP.

## Connections and simultaneous groups

Different lairs may explore different dungeons simultaneously on the same lightweight server. Joining one with an active run puts you at its lair waiting for the next run, as before. Its participants alone decide departure and receive its rewards. The browser cannot route movement, purchases or loot commands into another lair by sending a lair ID.

One goblin identity can be connected in only one tab at a time. The existing two-tab testing behavior remains: an already-connected goblin causes the new tab to create another goblin, who also starts on the home screen. Ordinary reload/reconnect at home returns to the home screen with sacks safely stored. A detected in-run disconnect still resumes the same actor/health/bag within the existing60second grace, without re-entering a code. After expiry or a server restart you return to the home screen. An expired participant can join a different lair while its old teammates continue; a later successful old-team reward credits its same global profile without overwriting purchases made in the new lair.

## Existing saves

Stop the previous server and copy its entire **data** folder into V39 before starting. V36–V38 saves migrate automatically: the old home becomes **Original Lair**, with stock, prepared sacks, personal identities/XP/purchases preserved. A before-migration backup is made first; failure to back up stops migration. Find Original Lair's generated join code by opening the private admin link printed in Terminal and selecting Original Lair. Previous lair names appear for the goblins who belonged to it.

Saving now uses payload version2 in the same SQLite database file. Personal profiles are canonical across all lairs. The server commits global profiles and every lair's durable home together before acknowledgement, preserving reward/stock conservation. Old V38 versions cannot load the new payload; do not downgrade the working save. Old single-lair JSON backups can still be restored through the new admin tool into Original Lair.

## Admin with several lairs

The admin page now has a **Selected lair** dropdown showing its join code. Stock/reset-lair/End run target that lair. Personal XP is global; Reset goblin clears that goblin's sacks in every lair and its global progression. Reset all clears all lairs' stock and all personal progression while retaining identities, lair names/codes and backups. Editing/restore requires no active run anywhere, because profiles span groups; End run only ends the selected group's run. Backups/restore cover the entire server, not just the dropdown's selected lair. Lairs created after a restored backup keep their names/codes but reset to starter stock; newer goblin identities remain with reset progress. Backups are still private server files under data/backups.

This adds name/code entry on the existing local server, not public hosting, cross-device account login, member roles, kicking or code rotation. Browser identity storage remains tied to the current address/browser. The standalone solo play.html remains its separate game without these online group menus.
