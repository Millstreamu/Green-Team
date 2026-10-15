# How we build this game together

Status: agreed working method, version 1.

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

## 4. Keep planning bounded

Describe the overall game briefly, then fully specify only the next playable slice. A candidate first slice is several goblins, one dungeon, one guard type, loot, an alarm, escape, and a return to the lair. Its exact scope still needs agreement.

Before implementing a slice, establish:

- The player actions and a concrete example of play.
- The screens and feedback required.
- The rules and editable values it needs.
- What the server must coordinate between players.
- Observable checks that tell us it works.

Use temporary art where useful. Play together before expanding. The builder grows to support this game; a general-purpose engine is outside the current goal.

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
