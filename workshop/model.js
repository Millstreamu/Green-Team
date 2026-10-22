import { FURNITURE_ART_SLOTS } from '../src/furniture-art.js';
import { ROOM_TYPES, roomLootPools, roomMaterialContainer } from '../src/room-types.js';
import { DEFAULT_TUNING, validateTuning, runTuning } from '../src/tuning.js';
import { GENERATOR_PRESETS, generatorSettings } from '../src/generator-settings.js';
import { RESOURCE_PROFILES } from '../src/resource-profiles.js';
import { SEARCH_LOOT } from '../src/config.js';
import { SEARCHABLE_TYPES, searchRewardProfile } from '../src/search.js';
import { RECIPES } from '../src/lair.js';
import { PERSONAL_UPGRADES } from '../src/profile.js';
import { LOOT_TYPES } from '../src/loot.js';
import { FEEDBACK_SOUNDS } from '../src/feedback.js';
import { LAIR_ART_SLOTS } from './lair-art.js';
export const WORKSHOP_MAPS = ['manor', 'hold', 'sanctuary'];
export const WORKSHOP_TILES = ['floor', 'wall_top_horz', 'wall_vert', 'wall_corner_top_left', 'wall_bottom_horz'];
export const WORKSHOP_MATERIALS = ['scrap', 'cloth', 'meat', 'berries', 'mushroom'];
export const WORKSHOP_LOOT_FIELDS = Object.keys(SEARCH_LOOT);
export function createWorkshopDraft() {
  return { format: 'green-team-workshop', version: 2, tuning: {...DEFAULT_TUNING}, generator: structuredClone(GENERATOR_PRESETS),
    maps: Object.fromEntries(WORKSHOP_MAPS.map(id => [id, { loot: {...SEARCH_LOOT}, weights: structuredClone(RESOURCE_PROFILES[id].containers), tiles: null }])),
    costs: Object.fromEntries(Object.entries(PERSONAL_UPGRADES).map(([id,p])=>[id,p.cost])),
    materials: Object.fromEntries(Object.entries(RECIPES).map(([id,r])=>[id,{...r.materials}])), sprites: {}, audio: {}, furniture: {}, lair: { tiles: null, props: {} } };
}
function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k=>!Object.hasOwn(value,k))) throw Error(`Invalid ${label}.`);
}
function bounded(value,min,max,label) { if (!Number.isFinite(value) || value<min || value>max) throw Error(`Invalid ${label}: use ${min}–${max}.`); }
function asset(value,kind) {
  if(typeof value!=='string' || value.length>8000000 || !(kind==='image' ? /^data:image\/png;base64,[A-Za-z0-9+/=]+$/ : /^data:audio\/(wav|x-wav|mpeg|mp3|ogg|webm);base64,[A-Za-z0-9+/=]+$/).test(value)) throw Error('Use PNG images or WAV, MP3, OGG audio files under 5 MB.');
}
export function validateWorkshopDraft(value) {
  // Accept only the exact earlier format before adding the optional new domain.
  if(value?.format==='green-team-workshop'&&value.version===1){
    exact(value,Object.keys(createWorkshopDraft()).filter(k=>k!=='lair'&&k!=='furniture'),'version 1 workshop project');
    value={...value,version:2,lair:{tiles:null,props:{}},furniture:{}};
  }
  if(value?.version===2&&!Object.hasOwn(value,'furniture')){exact(value,Object.keys(createWorkshopDraft()).filter(k=>k!=='furniture'),'earlier workshop project');value={...value,furniture:{}};}
  const defaults=createWorkshopDraft(); exact(value,Object.keys(defaults),'workshop project');
  if(value.format!==defaults.format || value.version!==2) throw Error('This is not a supported Green Team Workshop project.');
  exact(value.lair,['tiles','props'],'lair artwork');
  if(value.lair.tiles!==null)asset(value.lair.tiles,'image');
  if(!value.lair.props||typeof value.lair.props!=='object'||Array.isArray(value.lair.props))throw Error('Invalid lair artwork list.');
  for(const [id,src] of Object.entries(value.lair.props)){
    if(!Object.hasOwn(LAIR_ART_SLOTS,id))throw Error('Unknown lair artwork slot.');
    asset(src,'image');
  }
  if(!value.furniture||typeof value.furniture!=='object'||Array.isArray(value.furniture))throw Error('Invalid furniture artwork.');
  for(const[id,src]of Object.entries(value.furniture)){if(!Object.hasOwn(FURNITURE_ART_SLOTS,id))throw Error('Unknown furniture artwork slot.');asset(src,'image');}
  validateTuning(value.tuning); generatorSettings(value.generator); exact(value.maps,WORKSHOP_MAPS,'maps');
  for(const id of WORKSHOP_MAPS) {
    const map=value.maps[id]; exact(map,['loot','weights','tiles'],'map'); exact(map.loot,WORKSHOP_LOOT_FIELDS,'loot rules');
    for(const key of WORKSHOP_LOOT_FIELDS) bounded(map.loot[key],0,1,key);
    exact(map.weights,Object.keys(SEARCHABLE_TYPES),'container weights');
    for(const weights of Object.values(map.weights)) {
      if(!weights || Array.isArray(weights) || Object.keys(weights).some(k=>!WORKSHOP_MATERIALS.includes(k))) throw Error('Unknown material weight.');
      let total=0; for(const weight of Object.values(weights)) { bounded(weight,0,100,'weight'); if(!Number.isInteger(weight)) throw Error('Weights must be whole numbers.'); total+=weight; }
      if(!total) throw Error('Each container needs at least one nonzero material weight.');
    }
    if(map.tiles!==null) asset(map.tiles,'image');
  }
  exact(value.costs,Object.keys(defaults.costs),'unlock costs'); exact(value.materials,Object.keys(defaults.materials),'recipes');
  for(const cost of Object.values(value.costs)) { bounded(cost,0,10000,'XP cost'); if(!Number.isInteger(cost)) throw Error('XP costs must be whole numbers.'); }
  for(const [id,materials] of Object.entries(value.materials)) {
    exact(materials,Object.keys(defaults.materials[id]),'recipe ingredients');
    for(const count of Object.values(materials)) { bounded(count,1,99,'ingredient amount'); if(!Number.isInteger(count)) throw Error('Ingredients must be whole numbers.'); }
  }
  for(const [kind,registry] of [['sprites',LOOT_TYPES],['audio',FEEDBACK_SOUNDS]]) {
    const entries=value[kind]; if(!entries || typeof entries!=='object' || Array.isArray(entries)) throw Error('Invalid asset list.');
    for(const [id,src] of Object.entries(entries)) { if(!Object.hasOwn(registry,id)) throw Error(`Unknown asset slot: ${id}`); asset(src,kind==='sprites'?'image':'audio'); }
  }
  if(JSON.stringify(value).length>40000000) throw Error('Project exceeds 40 MB.');
  return structuredClone(value);
}
export function workshopRunTuning(draft,mapId) { const result=runTuning(draft.tuning); result.loot={...draft.maps[mapId].loot}; return result; }
// Exact marginal odds from the same depth/pool/count rules used by createSearchables.
// Ordinary containers only: treasure-room replacements and personal Lucky bonuses excluded.
export function workshopLootOdds(draft,mapId,type,depth=0,difficulty='normal',roomType=null) {
  const values=draft.maps[mapId].loot, p=searchRewardProfile(depth,values), definition=SEARCHABLE_TYPES[type];
  const rare=Math.min(1,p.rareChance+(difficulty==='hard'?.15:0));
  const weights=draft.maps[mapId].weights[roomMaterialContainer(roomType,type)], materials=Object.entries(weights).flatMap(([id,n])=>Array(n).fill(id));
  const pools=roomLootPools(roomType,definition,materials),single={};
  const add=(id,n)=>{single[id]=(single[id]??0)+n;};
  for(const id of pools.materials) add(id,p.materialChance/pools.materials.length);
  for(const id of pools.pool) add(id,(1-p.materialChance)*(1-rare)/pools.pool.length);
  for(const id of pools.rarePool) add(id,(1-p.materialChance)*rare/pools.rarePool.length);
  const nonempty=1-p.emptyChance, two=values.twoItemChance;
  return { empty:p.emptyChance, one:nonempty*(1-two), two:nonempty*two,
    items:Object.fromEntries(Object.entries(single).map(([id,q])=>[id,{ expected:nonempty*(1+two)*q, chance:nonempty*((1-two)*q+two*(1-(1-q)**2)) }])) };
}
