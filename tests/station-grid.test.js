import test from 'node:test';import assert from 'node:assert/strict';
import {stationGridCapacity,createFillingStationGrid} from '../src/station-grid.js';
test('station grids fill desktop and phone space while reserving a row and retaining real items',()=>{
 assert.deepEqual(stationGridCapacity(320,300,64,8,6),{columns:4,total:16});
 assert.deepEqual(stationGridCapacity(220,180,48,6,6),{columns:4,total:12});
 const narrow=stationGridCapacity(150,100,44,6,20);assert.equal(narrow.columns,3);assert.ok(narrow.total>=23);
});
test('reserved slots resize without replacing or making extra actions',t=>{
 const previous={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle,ResizeObserver:globalThis.ResizeObserver};t.after(()=>Object.assign(globalThis,previous));
 let callback,size=64;const actual={id:'real-action'};const grid={clientWidth:320,clientHeight:300,children:[actual],dataset:{},style:{setProperty(k,v){this[k]=v;}},append(node){this.children.push(node);}};
 globalThis.document={createElement:tag=>({tag,setAttribute(k,v){this[k]=v;}})};
 globalThis.getComputedStyle=()=>({getPropertyValue:()=>String(size),columnGap:size===64?'8px':'6px'});
 globalThis.ResizeObserver=class{constructor(fn){callback=fn;}observe(){}};
 const view=createFillingStationGrid(grid,()=>6);view.refresh();assert.equal(grid.children.filter(n=>n!==actual&&!n.hidden).length,10);assert.equal(grid.dataset.columns,'4');assert.equal(grid.children[0],actual);
 grid.clientWidth=220;grid.clientHeight=180;size=48;callback();assert.equal(grid.children.filter(n=>n!==actual&&!n.hidden).length,6);
 assert.ok(grid.children.slice(1).every(n=>n.tag==='div'&&n.role==='img'&&!n.tabIndex));
});
