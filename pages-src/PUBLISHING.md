# Green Team — GitHub Pages site

`docs/` is the public website. GitHub Pages serves it from **Settings → Pages → Deploy from a branch → main → /docs**.

Do not edit the generated pages here by hand. They are rebuilt from the game source in the repository root:

```
npm ci
npm run build:pages
```

That regenerates `index.html`, `game.html`, `creator.html`, `404.html`, `workshop/`, `trials/`, `assets/` and `downloads/drawing-templates.zip` in this folder. Commit the result and Pages publishes it. The page sources live in `pages-src/`; the game itself lives in `src/`.

The other Markdown files in `docs/` are design notes and decisions, not part of the website.

## What is included

- `index.html`: public title page, Play solo and a short getting-started guide.
- `game.html`: the solo game, with normal progression and browser saves.
- `creator.html`: secondary creator page linked from the title-page footer.
- `workshop/index.html`: the artwork/balance workshop, isolated from normal game saves.
- `trials/`: disposable room, door/guard and visible-key trials.
- `downloads/drawing-templates.zip`: current drawing templates and guides.

All site navigation is relative, so project sites and custom domains work. Multiplayer needs the Node server (`npm start`) and is not part of this static site.

## Saves

Solo progress is saved in each player's browser. It does not sync between browsers or devices. Keep the same Pages URL to keep those saves. Workshop previews use disposable supplies and never touch normal solo progress; **Export project** in the workshop to keep drafts.
