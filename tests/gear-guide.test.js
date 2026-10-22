import test from 'node:test';
import assert from 'node:assert/strict';
import { gearDetails, GEAR_TYPES, SUGGESTED_LOADOUTS, loadoutStatus } from '../src/gear-guide.js';
import { createGearGuide } from '../src/gear-guide-view.js';
import { createCamp, RECIPES } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { DART, BELL, DISGUISE, SCRY } from '../src/config.js';

test('gear guide covers actual equipment costs and rules, including known workbench lunch',()=>{
 for(const type of GEAR_TYPES){const item=gearDetails(type);assert.ok(item.controls&&item.effect&&item.limits);assert.equal(item.footprint,'1 sack square · 1 use');if(RECIPES[type]){assert.equal(item.xp,RECIPES[type].xpCost);assert.deepEqual(item.materials,RECIPES[type].materials);}}
 assert.match(gearDetails('dart').effect,new RegExp(`${DART.sleepSeconds}s`));assert.match(gearDetails('bell').effect,new RegExp(`${BELL.investigateSeconds}s`));
 assert.match(gearDetails('disguise').effect,new RegExp(`${DISGUISE.seconds}s`));assert.match(gearDetails('orb').effect,new RegExp(`${SCRY.seconds}s`));
 assert.equal(gearDetails('lunch').xp,0);assert.match(gearDetails('lunch').controls,/No equip/);assert.equal(gearDetails('ruby'),null);
});
test('three suggested kits leave six slots, account for real packed shapes/stock and do not mutate progress',()=>{
 const camp=createCamp(),profile=createProfile(),before=structuredClone({camp,profile});
 for(const id of Object.keys(SUGGESTED_LOADOUTS)){const status=loadoutStatus(id,[],camp,profile);assert.equal(status.slots,3);assert.equal(status.lootSpace,6);assert.equal(status.missing,3);assert.equal(status.freeAfterPacking,6);assert.ok(status.fits);}
 assert.deepEqual({camp,profile},before);
 const bag=[{id:'bell',type:'bell',x:0,y:0,rotation:0},{id:'ruby',type:'ruby',x:1,y:0,rotation:0}];
 const status=loadoutStatus('distraction',bag,camp,profile);assert.equal(status.missing,2);assert.equal(status.rows[0].packed,1);assert.equal(status.rows[0].stock,0);
 assert.equal(status.freeAfterPacking,9-status.used-2);
 const full=Array.from({length:9},(_,i)=>({id:String(i),type:'smoke',x:i%3,y:Math.floor(i/3),rotation:0}));assert.equal(loadoutStatus('sneaking',full,camp,profile).fits,false);
});
test('kit costs separate recipe unlocks from craft totals and include food for workbench lunches',()=>{
 const camp=createCamp(),profile=createProfile();let kit=loadoutStatus('distraction',[],camp,profile);assert.deepEqual(kit.materials,{scrap:3,cloth:4});assert.equal(kit.unlockXp,75);
 profile.purchases=['bell'];kit=loadoutStatus('distraction',[],camp,profile);assert.equal(kit.unlockXp,50);
 kit=loadoutStatus('sneaking',[],camp,profile);assert.deepEqual(kit.materials,{scrap:3,cloth:3,mushroom:1,berries:1});assert.equal(kit.unlockXp,200);
 kit=loadoutStatus('rescue',[],camp,profile);assert.deepEqual(kit.noRecipe,[]);assert.deepEqual(kit.materials,{meat:1,berries:1,scrap:3,cloth:3});assert.equal(kit.unlockXp,125);
});
test('guide tabs and selectors show phone controls and update packing without invoking any mutation',t=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;t.after(()=>{globalThis.window=oldWindow;globalThis.document=oldDocument;});
 class Element{constructor(){this.listeners={};this.children=[];this.value='';}addEventListener(n,f){this.listeners[n]=f;}setAttribute(n,v){this[n]=v;}append(x){this.children.push(x);}replaceChildren(...x){this.children=x;}}
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 globalThis.window={matchMedia:()=>({matches:true})};globalThis.document={querySelector:s=>get(s.slice(1)),createElement:()=>new Element()};
 const camp=createCamp(),profile=createProfile(),bag=[];const view=createGearGuide(()=>bag,camp,profile);view.refresh();
 assert.match(get('guide-item-use').textContent,/Use aim.*Use throw/);assert.equal(get('guide-loadouts').hidden,true);
 get('guide-tab-loadouts').listeners.click();assert.equal(get('guide-loadouts').hidden,false);assert.match(get('guide-loadout-status').textContent,/3 more items/);
 get('guide-loadout-choice').value='rescue';get('guide-loadout-choice').listeners.change();assert.match(get('guide-loadout-plan').textContent,/workbench/);
 bag.push({id:'lunch',type:'lunch',x:0,y:0,rotation:0});view.refresh();assert.match(get('guide-loadout-packed').textContent,/Packed Lunch: 1 \/ 1 packed/);
 get('guide-tab-costs').listeners.click();assert.equal(get('guide-cost-rows').children.length,GEAR_TYPES.length);assert.equal(get('guide-costs').hidden,false);
});
