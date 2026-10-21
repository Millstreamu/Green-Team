# Green Team — GitHub Pages release

This folder is the ready-to-upload website. No Node installation, build service, login or backend is needed to host it.

## Publish after merging this pull request

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/docs**, then click **Save**.
4. Wait for GitHub to publish, then open the URL shown in Pages settings.

The site files are already in `docs/`; no manual ZIP upload or Node build is needed. The existing repository root remains the original server/development entry point. To make future changes to this newer release, extract `downloads/source.zip` into its own directory and use its build instructions. The standalone source's generated Pages folder can then replace the static files here.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## What is included

- `index.html`: public title page, Play solo and a short getting-started guide.
- `game.html`: actual solo game, normal progression and browser saves, with the approved classic terrain across maps and the lair.
- `creator.html`: secondary creator page linked from the title-page footer.
- `workshop/index.html`: the full artwork/balance workshop, isolated from normal game saves.
- `trials/`: disposable room, door/guard and visible-key trials.
- `downloads/drawing-templates.zip`: all current drawing templates and guides.
- `downloads/source.zip`: reproducible game/workshop/server source without saved lairs or installed dependencies.

All site navigation is relative, so project sites and custom domains work. Creator tools are public pages, not authenticated admin screens. No multiplayer/admin login is presented on this static release. Multiplayer needs the Node server in the source package.

## Saves and workshop projects

Solo progress is saved in this browser when local storage is available. It does not sync between browsers or devices. Keep the same hosting origin to retain that browser's saves. Workshop previews use disposable supplies and do not read or write normal solo progress. **Export project** before closing the workshop to keep your draft assets and balance settings.

## Updates and rebuilding

To publish a later ready-made release, replace these site files in the same repository and retain the same Pages URL.

To work on the source: extract `downloads/source.zip` into its own directory, use Node 22.13 or newer and run `npm ci`. `npm run build:pages` regenerates the standalone game, workshop and this static release in `pages/`, plus a fresh `green-team-github-pages.zip` beside the source directory. Upload the contents of `pages/` to your publishing branch. Normal game development/server instructions remain in the source README. Template PNGs and the homepage image are already included; optional native rendering scripts are not required for a static rebuild.

Browser and physical-phone visual testing should still be done after publishing. Automated game, workshop and static-path checks are recorded in the project work status.
