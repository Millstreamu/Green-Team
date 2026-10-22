import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base=new URL('../',import.meta.url),read=name=>readFile(new URL(name,base),'utf8'),out=new URL('docs/',base);
await mkdir(out,{recursive:true});await cp(new URL('pages-src/',base),out,{recursive:true});
await cp(new URL('assets/goblin.png',base),new URL('assets/goblin.png',out));
const standalone=await read('play.html'),terrain='data:image/png;base64,'+(await readFile(new URL('workshop/templates/classic-walls/classic-walls-example-128x96.png',base))).toString('base64');
function swap(s,a,b){if(!s.includes(a))throw Error('Static release anchor changed: '+a.slice(0,80));return s.replace(a,b);}
let game=swap(standalone,"const humanTerrain = await loadHumanTerrain().catch(error => { console.warn('Human tiles unavailable; using temporary art.', error.message); return null; });",`const pagesTerrainImage=new Image();pagesTerrainImage.src=${JSON.stringify(terrain)};await pagesTerrainImage.decode();const humanTerrain=workshopTerrainArt(pagesTerrainImage);`);
game=swap(game,"const terrainArt = !world.lair && world.job?.jobId === 'manor' ? humanTerrain : null;",'const terrainArt = humanTerrain;');
const gamePolish=`<style>.pages-back{display:block;padding:12px 0;margin-top:10px;border-top:1px solid #5b684c;color:#e4e9ce;font:13px system-ui,sans-serif;text-decoration:none}.pages-back:focus-visible{outline:2px solid #c2da8c;outline-offset:3px}</style>`;
game=game.replace('<title>Green Team · V88</title>','<title>Play solo · Green Team</title><meta name="description" content="Explore, steal and escape in the Green Team solo browser game."><meta name="theme-color" content="#172317">').replace('</head>',gamePolish+'</head>');
game=swap(game,'<span id="save-status">','<a class="pages-back" href="index.html">← Return to title</a><span id="save-status">');
await writeFile(new URL('game.html',out),game);
const fragment=await read('workshop/workshop.html');const body=fragment.slice(fragment.indexOf('<div id="green-workshop">'),fragment.lastIndexOf('</body>'));
const workshop=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Green Team artwork and balance workshop."><title>Workshop · Green Team</title><link rel="icon" href="../assets/goblin.png"><link rel="stylesheet" href="../assets/site.css"></head><body><nav class="site-nav" aria-label="Site navigation"><a class="brand" href="../index.html"><img src="../assets/goblin.png" alt="" width="32" height="32">GREEN TEAM</a><div class="nav-links"><a href="../creator.html">Creator tools</a><a href="../game.html">Play solo ↗</a></div></nav><main class="workshop-wrap workshop-shell">${body}</main></body></html>`;
await mkdir(new URL('workshop/',out),{recursive:true});await writeFile(new URL('workshop/index.html',out),workshop);
await mkdir(new URL('trials/',out),{recursive:true});
for(const[name,source]of Object.entries({'rooms.html':'green-team-room-types-playtest.html','door.html':'green-team-door-guard-playtest.html','key.html':'green-team-surface-loot-playtest.html'})){
 let html=await readFile(new URL('build/'+source,base),'utf8');html=html.replace('<title>Green Team · V88</title>','<title>Room trial · Green Team</title>').replace('</head>',gamePolish+'</head>');html=swap(html,'<span id="save-status">','<a class="pages-back" href="../creator.html">← Creator tools</a><span id="save-status">');await writeFile(new URL('trials/'+name,out),html);
}
await writeFile(new URL('.nojekyll',out),'');
await writeFile(new URL('404.html',out),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Green Team</title><style>body{margin:10vh auto;padding:24px;max-width:600px;background:#101811;color:#eee9d4;font:18px/1.6 system-ui}a{color:#c2da8c}</style><h1>Wrong passage.</h1><p>This page isn’t here. Return to your site’s title page using your browser’s back button, or open the repository’s Pages URL.</p></html>');
execFileSync('python3',[fileURLToPath(new URL('scripts/package-pages.py',base))],{cwd:fileURLToPath(base),stdio:'inherit'});
console.log('Built static GitHub Pages site in docs/.');
