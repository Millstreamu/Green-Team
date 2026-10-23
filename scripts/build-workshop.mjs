import {FURNITURE_ART_SLOTS,furnitureArtId,drawFurnitureArt} from '../src/furniture-art.js';
import {ROOM_TYPES,roomLootPools,roomMaterialContainer} from '../src/room-types.js';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as model from '../workshop/model.js';
import {ABILITY_ART_SLOTS} from '../workshop/ability-art.js';
import {WORD_SLOTS} from '../workshop/word-slots.js';
import {MENU_COLOR_DEFAULTS,MENU_COLOR_NAMES,MENU_ART_SLOTS,menuThemeCss} from '../workshop/menu-theme.js';
import {adaptWorkshopGame} from '../workshop/game-adapter.js';
import {DEFAULT_TUNING,TUNING_FIELDS,validateTuning,runTuning} from '../src/tuning.js';
import {GENERATOR_PRESETS,GENERATOR_FIELDS,generatorSettings,validateGenerator} from '../src/generator-settings.js';
import {RESOURCE_PROFILES} from '../src/resource-profiles.js';
import {CONFIG,SEARCH_LOOT,COMBAT,HEAT,SEARCH} from '../src/config.js';
import {SEARCHABLE_TYPES,searchRewardProfile} from '../src/search.js';
import {RECIPES} from '../src/lair.js';
import {PERSONAL_UPGRADES} from '../src/profile.js';
import {LOOT_TYPES,itemCells} from '../src/loot.js';
import {FEEDBACK_SOUNDS} from '../src/feedback.js';
import {drawTerrainTile,terrainLayers,terrainTile,DEEP_TERRAIN_NAMES,classicTerrainNames,classicTerrainLayers,deepTerrainNames,workshopTerrainArt,deepWallParts,drawDeepFrame,deepWallOpacity,drawDeepWall,drawTerrainOverview} from '../src/terrain-art.js';
import {isFloor} from '../src/world.js';
import {drawItem} from '../src/item-view.js';
import {drawStationItem} from '../src/station-item-view.js';
import {createCamp,createLairWorld} from '../src/lair.js';
const base=new URL('../',import.meta.url),read=async name=>readFile(new URL(name,base),'utf8');
const build=await read('scripts/build.mjs');
const modules=build.match(/const modules = (\[[^\n]+\]);/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
modules.splice(modules.indexOf('main'),0,'tuning');
const raw=(await read('workshop/door-test-room.js'))+'\n'+(await read('workshop/lair-art.js'))+'\n'+(await Promise.all(modules.map(n=>read('src/'+n+'.js')))).join('\n');
let game=adaptWorkshopGame(raw).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const goblin=await readFile(new URL('assets/goblin.png',base));
const human=await readFile(new URL('assets/human/GreenTeam-tileset.png',base));
const humanMeta=JSON.parse(await read('assets/human/GreenTeam-tileset.json'));
game=game.replaceAll("'assets/goblin.png'",JSON.stringify('data:image/png;base64,'+goblin.toString('base64')))
 .replaceAll("'assets/human/GreenTeam-tileset.png'",JSON.stringify('data:image/png;base64,'+human.toString('base64')));
const defaultTerrainSource='data:image/png;base64,'+(await readFile(new URL('workshop/templates/classic-walls/classic-walls-example-128x96.png',base))).toString('base64');
game='const WORKSHOP_TERRAIN_SOURCE='+JSON.stringify(defaultTerrainSource)+';\n'+'const WORKSHOP_HUMAN_METADATA='+JSON.stringify(humanMeta)+';\nfunction workshopRunTuning(draft,id){const t=runTuning(draft.tuning);t.loot={...draft.maps[id].loot};return t;}\n'+game;
let html=(await read('index.html')).replaceAll('src="assets/goblin.png"','src="data:image/png;base64,'+goblin.toString('base64')+'"').replace('<script type="module" src="src/main.js"></script>','<!--WORKSHOP_SCRIPT-->');
html=html.replace('</head>',`<script>window.addEventListener('error',e=>parent.postMessage({type:'workshop-error',message:e.message},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({type:'workshop-error',message:String(e.reason?.message??e.reason)},'*'));</script></head>`);
const values={FURNITURE_ART_SLOTS,ABILITY_ART_SLOTS,WORD_SLOTS,MENU_COLOR_DEFAULTS,MENU_COLOR_NAMES,MENU_ART_SLOTS,ROOM_TYPES,CONFIG,DEFAULT_TUNING,TUNING_FIELDS,GENERATOR_PRESETS,GENERATOR_FIELDS,RESOURCE_PROFILES,SEARCH_LOOT,SEARCHABLE_TYPES,RECIPES,PERSONAL_UPGRADES,LOOT_TYPES,FEEDBACK_SOUNDS,COMBAT,HEAT,SEARCH,DEEP_TERRAIN_NAMES};
let js=Object.entries(values).map(([key,value])=>'const '+key+'='+JSON.stringify(value)+';').join('\n');
js+='\n'+[menuThemeCss,furnitureArtId,drawFurnitureArt,roomLootPools,roomMaterialContainer,validateTuning,runTuning,generatorSettings,validateGenerator,searchRewardProfile,itemCells,isFloor,terrainTile,terrainLayers,drawTerrainTile,classicTerrainNames,classicTerrainLayers,deepTerrainNames,workshopTerrainArt,deepWallParts,drawDeepFrame,deepWallOpacity,drawDeepWall,drawTerrainOverview,drawItem,drawStationItem].map(f=>f.toString()).join('\n');
js+='\n'+(await read('src/station-art.js')).replace(/^export /gm,'');
js+='\n'+(await read('workshop/lair-art.js')).replace(/^export /gm,'');
js+='\n'+(await read('src/lair-drawing.js')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
js+='\n'+(await read('workshop/lair-preview.js')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
js+='\n'+(await read('workshop/model.js')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
js+='\n'+(await read('workshop/classic-terrain-preview.js')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
js+='\n'+(await read('workshop/tile-checks.js')).replace(/^export /gm,'');
const asset={};for(const [id,file] of Object.entries({blank:'tileset-blank-128x64.png',reference:'tileset-example-128x64.png',guide:'tileset-drawing-guide.png',test:'tileset-test-128x64.png'}))asset[id]='data:image/png;base64,'+(await readFile(new URL('workshop/templates/'+file,base))).toString('base64');
asset.classic={};for(const [id,file]of Object.entries({blank:'blank-128x96',example:'example-128x96',test:'test-128x96',guide:'drawing-guide'}))asset.classic[id]='data:image/png;base64,'+(await readFile(new URL('workshop/templates/classic-walls/classic-walls-'+file+'.png',base))).toString('base64');
const lairManifest=JSON.parse(await read('workshop/templates/lair-manifest.json'));asset.lair={};
for(const id of Object.keys(lairManifest)){
 asset.lair[id]={};for(const kind of ['blank','guide','test'])asset.lair[id][kind]='data:image/png;base64,'+(await readFile(new URL(`workshop/templates/lair/${id}-${kind}.png`,base))).toString('base64');
}
asset.furniture={};for(const id of Object.keys(FURNITURE_ART_SLOTS)){asset.furniture[id]={};for(const kind of ['blank','guide','example'])asset.furniture[id][kind]='data:image/png;base64,'+(await readFile(new URL(`workshop/templates/furniture/${id}-${kind}.png`,base))).toString('base64');}
asset.menu={};for(const id of Object.keys(MENU_ART_SLOTS)){asset.menu[id]={};for(const kind of ['blank','guide','example'])asset.menu[id][kind]='data:image/png;base64,'+(await readFile(new URL(`workshop/templates/menu/${id}-${kind}.png`,base))).toString('base64');}
asset.abilities={};for(const id of Object.keys(ABILITY_ART_SLOTS)){asset.abilities[id]={};for(const kind of ['blank','guide','example'])asset.abilities[id][kind]='data:image/png;base64,'+(await readFile(new URL(`workshop/templates/abilities/${id}-${kind}.png`,base))).toString('base64');}
const lairWorld=createLairWorld(createCamp());
js+='\nconst WORKSHOP_LAIR_LAYOUT='+JSON.stringify({width:lairWorld.width,height:lairWorld.height,lair:true,stations:lairWorld.stations,tiles:Array.from(lairWorld.tiles)})+';\n';
js+='\nconst WORKSHOP_ASSETS='+JSON.stringify(asset)+';\nconst WORKSHOP_GAME_HTML='+JSON.stringify(Buffer.from(html).toString('base64'))+';\nconst WORKSHOP_GAME_CODE='+JSON.stringify(Buffer.from(game).toString('base64'))+';\n';
js+=await read('workshop/editor.js');
js+='\n'+await read('workshop/lair-editor.js');
js+='\n'+await read('workshop/furniture-editor.js');
js+='\n'+await read('workshop/ability-editor.js');
js+='\n'+await read('workshop/words-editor.js');
js+='\n'+await read('workshop/menu-editor.js');
const shell=await read('workshop/shell.html'),fragment=shell.replace('/* WORKSHOP_BUNDLE */',js.replaceAll('</script','<\\/script'));
const out=new URL('../build/green-team-workshop-tidy.html',import.meta.url);
await writeFile(out,fragment);await writeFile(new URL('workshop/workshop.html',base),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Green Team Workshop</title></head><body style="margin:0">'+fragment+'</body></html>');
await writeFile(new URL('../build/workshop-game-check.mjs',import.meta.url),game);
await writeFile(new URL('workshop/game-bundle.js',base),game);
await writeFile(new URL('../build/workshop-editor-check.mjs',import.meta.url),'const root={};\n'+js);
console.log('Built '+fileURLToPath(out)+' ('+Buffer.byteLength(fragment)+' bytes); original V97 is unchanged.');

const doorBoot='window.WORKSHOP_DRAFT='+JSON.stringify(model.createWorkshopDraft())+";window.WORKSHOP_MAP='manor';window.WORKSHOP_DIFFICULTY='normal';window.WORKSHOP_SEED=1;window.WORKSHOP_START='guard-door';window.WORKSHOP_LAIR_POTION=false;\n";
await writeFile(new URL('../build/green-team-door-guard-playtest.html',import.meta.url),html.replace('<!--WORKSHOP_SCRIPT-->','<script type="module">'+doorBoot+game.replaceAll('</script','<\\/script')+'<\/script>'));

const roomBoot='window.WORKSHOP_DRAFT='+JSON.stringify(model.createWorkshopDraft())+";window.WORKSHOP_MAP='manor';window.WORKSHOP_DIFFICULTY='normal';window.WORKSHOP_SEED=1;window.WORKSHOP_START='room-pass';window.WORKSHOP_ROOM=new URLSearchParams(window.location.search).get('room')||'dining';window.WORKSHOP_LAIR_POTION=false;\n";
await writeFile(new URL('../build/green-team-room-types-playtest.html',import.meta.url),html.replace('<!--WORKSHOP_SCRIPT-->','<script type="module">'+roomBoot+game.replaceAll('</script','<\\/script')+'<\/script>'));

const surfaceBoot='window.WORKSHOP_DRAFT='+JSON.stringify(model.createWorkshopDraft())+";window.WORKSHOP_MAP='manor';window.WORKSHOP_DIFFICULTY='normal';window.WORKSHOP_SEED=1;window.WORKSHOP_START='surface';window.WORKSHOP_LAIR_POTION=false;\n";
await writeFile(new URL('../build/green-team-surface-loot-playtest.html',import.meta.url),html.replace('<!--WORKSHOP_SCRIPT-->','<script type="module">'+surfaceBoot+game.replaceAll('</script','<\\/script')+'<\/script>'));

await writeFile(new URL('../build/green-team-room-layouts-playtest.html',import.meta.url),html.replace('<!--WORKSHOP_SCRIPT-->','<script type="module">'+roomBoot+game.replaceAll('</script','<\\/script')+'<\/script>'));
