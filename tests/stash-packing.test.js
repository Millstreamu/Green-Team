import test from 'node:test';import assert from 'node:assert/strict';
import {stashPackingPreview,createCamp,takeStashItem} from '../src/lair.js';
const item=(id,type,x,y,count)=>({id,type,x,y,rotation:0,...(count?{count}:{})});
test('stash destination preview shares rotated shape placement and never mutates or spends',()=>{
 const bag=[0,1,2].map(x=>item('block'+x,'ruby',x,0)),before=structuredClone(bag),preview=stashPackingPreview(bag,'sword');
 assert.deepEqual(bag,before);assert.equal(preview.rotation,1);assert.equal(preview.x,0);assert.equal(preview.y,1);
 const camp=createCamp();camp.counts.sword=1;const real=takeStashItem(camp,{bag,held:null},'sword');assert.equal(real.x,preview.x);assert.equal(real.y,preview.y);assert.equal(real.rotation,preview.rotation);
});
test('full sack can merge a coin stack; actual non-fitting item is rejected without changes',()=>{
 const bag=Array.from({length:9},(_,i)=>item('i'+i,i?'ruby':'coin',i%3,Math.floor(i/3),i?undefined:8));const before=structuredClone(bag);
 const preview=stashPackingPreview(bag,'coin');assert.equal(preview.x,0);assert.equal(preview.y,0);assert.equal(preview.count,9);assert.deepEqual(bag,before);assert.equal(stashPackingPreview(bag,'ruby'),null);
 const camp=createCamp();camp.counts.coin=1;assert.ok(takeStashItem(camp,{bag,held:null},'coin'));assert.equal(bag.length,9);assert.equal(bag[0].count,9);assert.equal(stashPackingPreview(bag,'coin'),null);
});
