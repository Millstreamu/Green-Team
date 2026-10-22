# Feedback and future asset editor

## V66 behaviour

- Loot lifted from the floor or packed into the sack: short gold sack pulse and ascending temporary chime.
- Blocked sack placement, packed rotation/move or outside touch drag: red pulse and low temporary sound. Cancellation/reset, a tap selecting an item and successful packed rearrangement/rotation stay quiet.
- Successful lair transfers, shared stack moves, free test supplies, crafting and personal purchases: green station-shell pulse and short ascending confirmation. Failed attempted lair actions use the red/low cue. Existing disabled-button validation remains.
- Menu Sound on/off is session-local. Muting does not suppress visual confirmation. AudioContext is unlocked only through pointer/keyboard interaction; audio failure is swallowed and cannot undo/interrupt gameplay. Visuals use a shorter fade with reduced-motion preference, with no shaking or spatial animation.

src/feedback.js owns presentation and audio. It does not modify inventory, profiles, world or saves. All three sounds are placeholders: pickup, blocked, lair. FEEDBACK_SOUNDS supplies their temporary synthesized notes. A supplied sounds option can map the same named src slots to final media later. Actual uploads, storage, audio decoding/conversion, preview/trim/volume UI and serving custom files are future editor work. Existing static server restrictions stay intact; setting an arbitrary src does not make it an upload feature.

## Multiplayer confirmation

Only feedback-producing commands receive a short feedbackId from the client. After session.action and its required save return, server/index.js sends action-feedback to that socket with action, feedbackId and ok. It retains existing rejected and state messages. Save exceptions follow the existing pause/error path and never acknowledge success. Other goblins' actions cannot trigger this player's cue. Unknown/mismatched/duplicate receipts are ignored; pending entries expire after ten seconds, are capped at96 and are cleared on reconnect. No request IDs or receipts are persisted. The optional receipt field preserves old-client behaviour.

An outside touch drop is locally rejected without sending a command or changing items. Its failure cue can play immediately. Server-rejected moves/rotations and contested pickups wait for their private response.

## Future editor direction

The user intends to create the final audio and upload it, together with sprites, into a game editor. Preserve stable sound slot names so replacing recordings does not require changes throughout gameplay code. Keep source recordings and sprite originals intact. The user may provide MP4 or another format; exact import formats and any extraction/conversion workflow must be agreed when the import feature is built. Do not assume all MP4 encodings can be used directly as browser sound.

Editor scope, persistent asset registry, licensing/source metadata, frame slicing, preview/assignment and export packaging remain to specify. This release changes no editor or builder controls and replaces no supplied artwork.

## Verification limits

Automated tests check audio unlock/mute/unavailable handling, reduced-motion fade selection, request/receipt routing/deduplication/reset, local station success callbacks, outside-drag rejection, real socket contested-stock outcomes and save-failure silence. Existing complete-loop tests remain. Actual browser animation appearance, device audio volume/latency and a physical phone playtest remain unverified here because Chromium/hardware audio are unavailable. User should try a pickup, invalid rotate/drop, lair craft/purchase and Menu mute on phone and PC.


V71 adds replaceable `bellThrow` and `bellRing` sound slots. The throw cue follows successful local/authoritative spending; the shared landing transition rings once per observed bell. Both use temporary synthesized tones, obey Sound off, and add no screen flash or central narration.


V72 adds `potionDrink`, a temporary synth cue after successful local drinking or its confirmed private server receipt. It follows Sound off and produces no full-screen flash. Disguise expiry/recognition uses existing visual/status/guard feedback.


V73 adds `orbPing`, a replaceable temporary synth after successful solo activation or confirmed private server receipt. It obeys Sound off and adds no full-screen flash/central narration. Purple diamonds are drawn from shared fixed-position pings; expired groups disappear.


V78 adds replaceable `berryThrow`/`berryHit` synth slots. Throw follows successful local launch/private server receipt; hit uses confirmed local impact or owner's shared blind transition. No success screen flash/central narration. Muting follows existing page sound toggle.
