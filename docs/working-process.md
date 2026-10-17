# How we build this game together

Status: agreed working method; multiplayer review added 17 October 2026 at the user’s request.

## 1. Understand the intended experience

The user's words communicate intent; they are not always a literal specification. Use the surrounding context and examples. Never silently replace an explicit requirement with a guess.

For a new feature or a meaningful change:

1. Let the user describe it naturally, including rough wording and how it should feel.
2. Give a short readback: what the player sees, does, and experiences. Identify important assumptions.
3. Make it concrete with a rough screen layout or one worked gameplay example.
4. Check the interpretation with the user before substantial implementation. An existing clear agreement counts; do not repeatedly ask for it.
5. Build a small version, verify it, and record the resulting decision.

Small, obvious corrections can be made immediately. Only ask questions when the answer affects the result. Offer a sensible recommendation where useful.

## 2. Handle corrections by reconsidering intent

When the user says something like “I wanted that over there”:

- Reconsider the goal and surrounding context before patching the visible symptom.
- Briefly state the corrected understanding.
- Ask one focused question only if the meaning is still unclear.
- Change the relevant shared component or behaviour where appropriate.
- Check that the result matches the intended experience and still works in other places using it.

For a reported bug, gather only the missing information: what the user did, what happened, and what they expected. Screenshots or a short recording can help, but are not mandatory. Reproduce when possible. Distinguish a software fault from a misunderstanding of the desired design.

## 3. Reuse before adding

Before creating something, check for an existing component, rule, asset, or pattern that can serve the purpose.

Inventory, crafting, upgrades and similar screens should share item displays, buttons, panels, tooltips and controls wherever suitable. A feature may need different content without needing a new interaction design.

Extend shared pieces when the behaviour is shared. Do not force unrelated features into a complicated universal system. Explain meaningful exceptions briefly.

### Dungeon grid rule

All new static dungeon furniture, hiding spots, decorations and other placed scenery use the shared floor grid and placement rules. Define a whole-tile footprint (one32×32 source tile or a larger whole-tile rectangle), keep carved hallways/doorway lanes clear and preserve reachable approaches. Floor-standing props should default to solid movement obstacles; wall/floor-mounted art may be non-solid explicitly. Use PROP_RULES, placeProp and the shared world solid mask rather than a separate placement/collision system. Body art stays within its declared footprint; intentional vertical wall height and UI labels/indicators may extend upward. Grid placement concerns scenery, not free movement of goblins/guards or loose dropped loot. Keep server, browser and generator preview consistent.

New floor-standing scenery joins the shared renderer's grounded drawing order: sort by footprint front edge, sort actors by feet position, and keep hopping/art offsets out of the sort key. Interaction labels and progress belong above bodies. Avoid adding a separate actor/furniture draw pass that always covers every goblin.

## 4. Keep planning bounded

Describe the overall game briefly, then fully specify only the next playable slice. The agreed first slice is one goblin exploring a generated dungeon locally in a browser. See docs/decisions.md for current scope. Guards, loot, alarms, the lair and multiplayer testing follow later.

Before implementing a slice, establish:

- The player actions and a concrete example of play.
- The screens and feedback required.
- The rules and editable values it needs.
- What the server must coordinate between players.
- For team play: who chooses/owns the action, what others see, what simultaneous use does, and what happens if someone joins/leaves or is downed. Do not silently turn a solo shortcut into a team rule.
- For shared stock/rewards: when items are reserved, spent, returned or lost; who may spend; and how repeated actions avoid duplicate rewards.
- Observable checks that tell us it works.

Use [the multiplayer review](multiplayer-review.md) to track open team rules. Discuss a small batch at a time and distinguish user decisions from recommendations. Multiplayer implementation/testing can remain deferred while its behavior is clarified.

Use temporary art where useful. Test the current slice before expanding. Multiplayer playtesting is deferred until the exploration milestone feels right. The builder grows to support this game; a general-purpose engine is outside the current goal.

## 5. Coordinate Claude and Codex through Git

Git records changes; the repository is the shared source of truth. Chat history alone is not a specification.

At the start of a task, each AI reads the shared instructions, relevant decisions, task status, and existing implementation. It checks for unfinished or overlapping work before editing.

Work on one clear task at a time. If multiple AIs work simultaneously, use separate branches or checkouts and agree who owns each task. Coordinate edits to shared files. Never overwrite another agent's uncommitted work.

Keep changes small and focused. Inspect the changes and run checks relevant to the behaviour before committing. Record what was verified and what remains uncertain. Never claim a check passed unless it ran successfully.

At a handoff, record: task, intended behaviour, files changed, checks and results, unresolved questions, and next step. The receiving AI reads this before continuing. Never store passwords, access keys, or private server credentials in Git.

AI is useful for drafting, exploring and implementing quickly. It can also invent missing details, duplicate systems, or miss surrounding dependencies. Counter this with concrete examples, shared instructions, small changes, reuse, review and playable checks.

## 6. Keep decisions visible

Maintain docs/decisions.md with two clear categories:

- **Agreed behaviour:** decisions the user has accepted or explicitly requested.
- **Still experimenting:** proposals and assumptions that remain open.

Keep accepted decisions current when they change. Mark replaced decisions clearly if their history matters. Do not promote an AI suggestion to an agreed requirement without support from the conversation.

When implementation starts, maintain docs/work-status.md for current tasks and handoffs. Avoid creating a large tracking system before it is needed.

## 7. Communicate simply

Use short answers and ordinary language. Explain programming terms when first needed. Lead with the result or decision. Ask a small number of focused questions rather than presenting a long questionnaire.

Do not make the user translate their intent into programmer language. Turning their description into a clear, testable requirement is part of the AI's job.
