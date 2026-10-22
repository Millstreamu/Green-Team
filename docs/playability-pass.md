# V65 playability pass

## Scope and evidence

User agreed to checking the complete playable loop on phone and PC before adding systems. This pass reviews existing event wiring/layout rules and runs real shared domain, solo-client and online-client integration checks. Browser/physical-device rendering and finger feel are not verified here: Chromium is unavailable in this environment. Automated fixtures are not screenshots or human playtesting. Production saves were not opened or changed.

## Corrected issues

- Fast touch sack drags could finish without any pointermove event and were treated as taps. Release displacement now determines a drag too, preserving the existing eight-pixel threshold, grab offset and atomic validation. Small taps still select. Invalid destinations and cancelled gestures leave the item unchanged.
- Landscape sack sizing was declared before later coarse-pointer/short-screen rules and shrank on phones. The final landscape override gives a 188px panel with a 168px grid, independent scrolling on short windows and space beside action buttons. Real visual fit remains to check.
- Held Tab repeat could reopen solo/online lair stock or close an open stash. Repeated shortcut events are now ignored; fresh presses retain the existing toggle.
- Rotation/resizing could leave a held action or movement origin based on the previous viewport. Both now send the existing controls-reset event, releasing touch buttons, clearing movement and cancelling pending touch-sack gestures. A fresh contact is required to resume.

## Automated coverage

Solo client: station transfers/crafting, route draft/confirmation/cancel, board/unboard/depart, search/pack, equipment, escape and banking, failed runs, result dismissal and return. Online client: home entry, shared stock, server-authoritative transfers/equipment, shared loot, team extraction/XP, upgrades, hiding/rescue, downed results and identity switching. Separate tests cover home panels, result detail navigation, touch selection/move/rotation, cancellation and server rejection. Regression additions cover fast release-only drag, reset-cancelled drag, viewport resets with two held thumbs and Tab repeat in both clients.

## Remaining device check

Use the server ZIP for the home screen and multiplayer. Preserve the old data folder with the server stopped, then npm ci and npm run start:lan. Use a phone and desktop on the same Wi-Fi.

1. Enter your lair; open each station, switch tabs/pages and close. Check headings and main actions remain reachable, including with the phone keyboard open on home forms.
2. Pack gear through touch selection/buttons. At the map table change destination, cancel once, then confirm. Board, hop out, then board again and depart.
3. Move with the left thumb while holding E with the right. Release/cancel E and turn the phone; movement/search must stop until a fresh contact.
4. Search, collect and open Sack. Try a fast drag, multi-square drag, blocked drop, tap-select/Rotate, and explicit Move then E to drop. Check usable square sizes and no overlap with the right buttons.
5. Escape with loot, open haul details and return. Repeat with a failed/left-behind result. Check rewards and the next lair preparation.
6. On desktop repeat the loop using mouse/keyboard; hold Tab to confirm there is no flicker/reopening. Try a short window and fullscreen exit.

Record device/browser, orientation, the exact action and a screenshot if a layout issue remains. Next priorities follow these observations; sounds, balance and new systems are still outside this pass.
