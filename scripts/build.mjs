import { readFile, writeFile } from 'node:fs/promises';
// Ship a double-clickable copy without a build dependency or local web server.
const modules = ['config', 'world', 'input', 'render', 'main'];
let code = (await Promise.all(modules.map(name => readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8'))))
  .map(source => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
const sprite = await readFile(new URL('../assets/goblin.png', import.meta.url));
code = code.replace("'assets/goblin.png'", `'data:image/png;base64,${sprite.toString('base64')}'`);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
await writeFile(new URL('../play.html', import.meta.url), html.replace('<script type="module" src="src/main.js"></script>', `<script type="module">\n${code}\n</script>`));
console.log('Built play.html — open directly in a desktop browser.');
