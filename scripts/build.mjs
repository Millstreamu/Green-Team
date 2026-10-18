import { readFile, writeFile } from 'node:fs/promises';
// Ship a double-clickable copy without a build dependency or local web server.
const modules = ['config', 'generator-settings', 'jobs', 'profile', 'dungeon-layout', 'world', 'prop-placement', 'input', 'loot', 'treasure', 'traps', 'smoke', 'loadout', 'lair', 'loadout-view', 'hiding', 'search', 'navigation', 'rescue', 'guard-routes', 'guard', 'pressure', 'run', 'item-view', 'inventory-grid', 'item-list', 'stash-view', 'lair-view', 'lair-drawing', 'sack-panel', 'sack-view', 'results-view', 'guard-view', 'world-ui', 'pressure-view', 'search-view', 'hiding-view', 'trap-view', 'smoke-view', 'rescue-view', 'terrain-art', 'lighting', 'treasure-view', 'render', 'game-screen', 'main'];
let code = (await Promise.all(modules.map(name => readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8'))))
  .map(source => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const sprite = await readFile(new URL('../assets/goblin.png', import.meta.url));
code = code.replace("'assets/goblin.png'", `'data:image/png;base64,${sprite.toString('base64')}'`);
const humanSheet = await readFile(new URL('../assets/human/GreenTeam-tileset.png', import.meta.url));
const humanMetadata = await readFile(new URL('../assets/human/GreenTeam-tileset.json', import.meta.url));
code = code.replace("'assets/human/GreenTeam-tileset.png'", `'data:image/png;base64,${humanSheet.toString('base64')}'`)
  .replace("'assets/human/GreenTeam-tileset.json'", `'data:application/json;base64,${humanMetadata.toString('base64')}'`);
const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8')).replace('src="assets/goblin.png"', `src="data:image/png;base64,${sprite.toString('base64')}"`);
await writeFile(new URL('../play.html', import.meta.url), html.replace('<script type="module" src="src/main.js"></script>', `<script type="module">\n${code}\n</script>`));
console.log('Built play.html — open directly in a desktop browser.');
