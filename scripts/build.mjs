import { readFile, writeFile } from 'node:fs/promises';
// Ship a double-clickable copy without a build dependency or local web server.
const modules = ['config', 'jobs', 'dungeon-layout', 'world', 'input', 'loot', 'traps', 'smoke', 'loadout', 'lair', 'loadout-view', 'search', 'navigation', 'guard-routes', 'guard', 'run', 'item-view', 'inventory-grid', 'item-list', 'stash-view', 'lair-view', 'lair-drawing', 'sack-panel', 'sack-view', 'results-view', 'guard-view', 'world-ui', 'search-view', 'trap-view', 'smoke-view', 'render', 'main'];
let code = (await Promise.all(modules.map(name => readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8'))))
  .map(source => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const sprite = await readFile(new URL('../assets/goblin.png', import.meta.url));
code = code.replace("'assets/goblin.png'", `'data:image/png;base64,${sprite.toString('base64')}'`);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
await writeFile(new URL('../play.html', import.meta.url), html.replace('<script type="module" src="src/main.js"></script>', `<script type="module">\n${code}\n</script>`));
console.log('Built play.html — open directly in a desktop browser.');
