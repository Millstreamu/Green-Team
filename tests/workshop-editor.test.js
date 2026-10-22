import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync}from'node:fs';

async function openWorkshop(){
 const shell=readFileSync(new URL('../workshop/shell.html',import.meta.url),'utf8');
 class Node{
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.children=[];this.events={};this.dataset={};this.attrs={};this.value='';this.hidden=false;this.width=192;this.height=192;this.style={};this.textContent='';}
 append(...children){this.children.push(...children);if(this.tag==='select'&&this.value==='')this.value=children[0]?.value??'';}
 replaceChildren(...a){this.children=a;}addEventListener(k,f){(this.events[k]??=[]).push(f);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}click(){this.send('click');}getBoundingClientRect(){return{width:320,height:200};}getContext(){return new Proxy({},{get:()=>()=>{}});}toDataURL(){return 'data:image/png;base64,AAAA';}
 async send(k,e={}){for(const f of this.events[k]??[])await f({target:this,preventDefault(){},...e});}
 }
 const nodes=new Map();for(const m of shell.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new Node(m[1],m[2]);n.hidden=m[0].includes(' hidden');nodes.set(m[2],n);}
 const get=id=>nodes.get('ws-'+id),root=nodes.get('green-workshop');
 get('map').value='manor';get('difficulty').value='normal';get('container').value='chest';get('depth').value='50';get('seed').value='2371';
 const panels=['tiles','lair','furniture','assets','balance','play'].map(id=>{const n=new Node();n.dataset.panel=id;n.hidden=id!=='lair';return n;});
 const tabs=panels.map(p=>{const n=new Node('button');n.dataset.tab=p.dataset.panel;return n;});
 root.querySelector=s=>s[0]==='#'?nodes.get(s.slice(1)):panels.find(p=>s.includes('"'+p.dataset.panel+'"'));root.querySelectorAll=s=>s==='[data-tab]'?tabs:panels;
 const downloads=[];const document={getElementById:id=>nodes.get(id),createElement:tag=>{const n=new Node(tag);if(tag==='a')n.click=()=>downloads.push(n);return n;},createElementNS:(_,tag)=>new Node(tag)};
 const context={document,window:{addEventListener(){}},Image:class{async decode(){const b=Buffer.from(this.src.split(',')[1],'base64');this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);}},ResizeObserver:class{observe(){}},Blob,URL:{createObjectURL:blob=>{context.lastExport=blob;return'blob:test';},revokeObjectURL(){}},setTimeout,clearTimeout,crypto,atob,btoa,decodeURIComponent,escape,structuredClone,Uint8Array,FileReader:class{readAsDataURL(file){this.result=file.data;queueMicrotask(()=>this.onload());}},console};
 let code=readFileSync(new URL('../workshop/workshop.html',import.meta.url),'utf8').split('<script>')[1].split('</script>')[0];
 code=code.replace('forms();itemPreview();soundState();\n','forms();await itemPreview();soundState();globalThis.wsHarness={getDraft:()=>draft,startTest,acceptFile,tab,charts};\n');
 await vm.runInNewContext(code,context);const api=context.wsHarness;assert.ok(api,'UI initialized');
 return {api,get,context,downloads};
}

test('workshop UI changes map rules, draws three charts, imports PNGs, starts an isolated game and exports the same draft',async()=>{
 const {api,get,context,downloads}=await openWorkshop();
 await get('use-test').send('click');
 assert.match(get('status').textContent,/Test tileset applied to Human Manor/);
 assert.ok(api.getDraft().maps.manor.tiles);assert.equal(api.getDraft().maps.hold.tiles,null);
 for(const id of ['room','halls','thin']){get('join-scene').value=id;await get('join-scene').send('change');assert.match(get('room').attrs['aria-label'],/test colours/);assert.equal(get('room').width,480);assert.equal(get('room').height,384);}
 await get('test-png').send('click');assert.equal(downloads.at(-1).href,api.getDraft().maps.manor.tiles);
 api.tab('balance');assert.equal(get('charts').children.length,3);
 const empty=get('loot-fields').children[0].children[0];empty.value='12';await empty.send('change');assert.equal(api.getDraft().maps.manor.loot.nearEmptyChance,.12);
 get('map').value='hold';await get('map').send('change');assert.equal(api.getDraft().maps.hold.loot.nearEmptyChance,.45);
 const ref='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/tileset-test-128x64.png',import.meta.url)).toString('base64');
 await api.acceptFile('tiles',{size:2000,name:'map.png',type:'image/png',data:ref});assert.equal(api.getDraft().maps.hold.tiles,ref);
 await api.acceptFile('item',{size:2000,name:'wrong.png',type:'image/png',data:ref});assert.equal(get('status').dataset.error,'true');assert.equal(Object.keys(api.getDraft().sprites).length,0);
 api.tab('play');api.startTest('dungeon');assert.ok(!get('game').hidden);const game=get('game').srcdoc;assert.match(game,/window.WORKSHOP_SEED=2371/);assert.ok(!game.includes('src="src/main.js"'));const module=game.match(/<script type="module">([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>new (Object.getPrototypeOf(async function(){}).constructor)(module));
 assert.match(game,/campStorage = undefined/);assert.match(game,/window.WORKSHOP_MAP="hold"/);
 await get('export').send('click');const saved=JSON.parse(await context.lastExport.text());assert.equal(saved.maps.hold.tiles,ref);assert.equal(saved.maps.manor.loot.nearEmptyChance,.12);
 await get('clear-tiles').send('click');assert.equal(api.getDraft().maps.hold.tiles,null);
 get('import').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await get('import').send('change');
 assert.equal(JSON.stringify(api.getDraft()),JSON.stringify(saved),'reopening the real export restores exact image bytes and settings');
 api.startTest('dungeon');assert.match(get('game').srcdoc,/window.WORKSHOP_MAP="hold"/);assert.ok(get('game').srcdoc.includes(ref));
 await get('stop').send('click');assert.ok(get('game').hidden);assert.equal(get('game').srcdoc,'');
 const before=JSON.stringify(api.getDraft());get('import').files=[{size:3,text:async()=>'{bad json'}];await get('import').send('change');assert.equal(JSON.stringify(api.getDraft()),before);

 const fresh=await openWorkshop();assert.equal(fresh.api.getDraft().maps.manor.tiles,null,'a newly opened workshop has no previous draft');
 fresh.get('import').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await fresh.get('import').send('change');
 assert.equal(JSON.stringify(fresh.api.getDraft()),JSON.stringify(saved),'a fresh workshop imports the complete exported project');
 fresh.get('map').value='hold';await fresh.get('map').send('change');fresh.api.tab('play');fresh.api.startTest('dungeon');
 assert.ok(fresh.get('game').srcdoc.includes(ref));assert.match(fresh.get('game').srcdoc,/window.WORKSHOP_MAP="hold"/);
});

test('lair artwork is independent, dimension checked, playable and preserved by export/reopen',async()=>{
 const {api,get,context,downloads}=await openWorkshop();
 await get('lair-test').send('click');const lair=api.getDraft().lair;
 assert.ok(lair.tiles);assert.equal(Object.keys(lair.props).length,7);
 assert.equal(api.getDraft().maps.manor.tiles,null);assert.equal(api.getDraft().maps.hold.tiles,null);
 for(const id of ['terrain','stash','craft','campfire','planning','tunnel','potion','potionSite']){
  get('lair-slot').value=id;await get('lair-slot').send('change');
  assert.equal(get('lair-layout').width,576);assert.equal(get('lair-layout').height,448);
  await get('lair-blank').send('click');assert.match(downloads.at(-1).download,new RegExp('lair-'+id+'-blank'));
 }
 assert.equal(get('lair-built').checked,false);
 get('lair-slot').value='potion';await get('lair-slot').send('change');assert.equal(get('lair-built').checked,true);
 const wrong='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/tileset-test-128x64.png',import.meta.url)).toString('base64');
 const before=JSON.stringify(api.getDraft());get('lair-file').files=[{size:2000,name:'wrong.png',type:'image/png',data:wrong}];await get('lair-file').send('change');
 assert.equal(get('status').dataset.error,'true');assert.equal(JSON.stringify(api.getDraft()),before);
 const png='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/lair/potion-test.png',import.meta.url)).toString('base64');
 get('lair-file').files=[{size:2000,name:'potion.png',type:'image/png',data:png}];await get('lair-file').send('change');assert.equal(api.getDraft().lair.props.potion,png);
 await get('lair-play').send('click');assert.match(get('game').srcdoc,/window.WORKSHOP_START="lair"/);assert.match(get('game').srcdoc,/window.WORKSHOP_LAIR_POTION=true/);
 assert.ok(get('game').srcdoc.includes(png));
 await get('export').send('click');const saved=JSON.parse(await context.lastExport.text());assert.equal(saved.version,2);
 const fresh=await openWorkshop();fresh.get('import').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await fresh.get('import').send('change');
 assert.equal(JSON.stringify(fresh.api.getDraft()),JSON.stringify(saved));
 const bad=structuredClone(saved);bad.lair.props.potion=wrong;
 fresh.get('import').files=[{size:JSON.stringify(bad).length,text:async()=>JSON.stringify(bad)}];await fresh.get('import').send('change');
 assert.equal(fresh.get('status').dataset.error,'true');assert.equal(JSON.stringify(fresh.api.getDraft()),JSON.stringify(saved));
});

test('deep sheets import into map and lair, export exact PNG bytes and reopen without losing legacy art',async()=>{
 const h=await openWorkshop(),{api,get,context}=h;
 const png='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/deep-walls/deep-walls-example-128x128.png',import.meta.url)).toString('base64');
 const legacy='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/tileset-test-128x64.png',import.meta.url)).toString('base64');
 await api.acceptFile('tiles',{size:2000,name:'deep.png',type:'image/png',data:png});
 assert.equal(api.getDraft().maps.manor.tiles,png);
 get('lair-slot').value='terrain';get('lair-file').files=[{size:2000,name:'lair-deep.png',type:'image/png',data:png}];await get('lair-file').send('change');
 assert.equal(api.getDraft().lair.tiles,png);
 get('map').value='hold';await get('map').send('change');await api.acceptFile('tiles',{size:2000,name:'old.png',type:'image/png',data:legacy});
 await get('export').send('click');const saved=JSON.parse(await context.lastExport.text());
 const fresh=await openWorkshop();fresh.get('import').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await fresh.get('import').send('change');
 assert.equal(JSON.stringify(fresh.api.getDraft()),JSON.stringify(saved));
 assert.equal(fresh.api.getDraft().maps.manor.tiles,png);assert.equal(fresh.api.getDraft().maps.hold.tiles,legacy);
 assert.equal(fresh.api.getDraft().lair.tiles,png);fresh.api.startTest('lair');assert.ok(fresh.get('game').srcdoc.includes(png));
 const before=JSON.stringify(fresh.api.getDraft());const invalid='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/lair/stash-test.png',import.meta.url)).toString('base64');
 await fresh.api.acceptFile('tiles',{size:2000,name:'wrong.png',type:'image/png',data:invalid});
 assert.equal(fresh.get('status').dataset.error,'true');assert.equal(JSON.stringify(fresh.api.getDraft()),before);
});

test('classic sheets and approved proof preview work in map/lair and reopen with identical PNGs',async()=>{
 const {api,get,context,downloads}=await openWorkshop();
 const png='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/classic-walls/classic-walls-example-128x96.png',import.meta.url)).toString('base64');
 get('join-scene').value='reference';await get('join-scene').send('change');assert.equal(get('room').width,736);assert.equal(get('room').height,640);
 assert.match(get('room').attrs['aria-label'],/Approved room/);
 await api.acceptFile('tiles',{size:2000,name:'classic.png',type:'image/png',data:png});assert.equal(api.getDraft().maps.manor.tiles,png);
 get('lair-slot').value='terrain';get('lair-file').files=[{size:2000,name:'classic.png',type:'image/png',data:png}];await get('lair-file').send('change');assert.equal(api.getDraft().lair.tiles,png);
 await get('blank').send('click');const blank=Buffer.from(downloads.at(-1).href.split(',')[1],'base64');assert.equal(blank.readUInt32BE(16),128);assert.equal(blank.readUInt32BE(20),96);
 await get('export').send('click');const saved=JSON.parse(await context.lastExport.text()),fresh=await openWorkshop();
 fresh.get('import').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await fresh.get('import').send('change');assert.equal(JSON.stringify(fresh.api.getDraft()),JSON.stringify(saved));
 fresh.api.startTest('lair');assert.ok(fresh.get('game').srcdoc.includes(png));
});

test('room comparisons chart all three maps and the chosen room launches without changing the saved project',async()=>{
 const {api,get}=await openWorkshop(),before=JSON.stringify(api.getDraft());api.tab('balance');
 for(const type of ['dining','storage','prayer','bedroom','kitchen','armoury']){
  get('room-kind').value=type;await get('room-kind').send('change');assert.equal(get('charts').children.length,3);
  assert.match(get('charts').children[0].children[0].textContent,/ · /);
  get('test-room').value=type;await get('start-room').send('click');assert.match(get('game').srcdoc,/window.WORKSHOP_START="room-pass"/);assert.ok(get('game').srcdoc.includes('window.WORKSHOP_ROOM="'+type+'"'));
 }
 assert.equal(JSON.stringify(api.getDraft()),before);
});

test('furniture UI imports exact-size PNGs, rejects wrong sizes, exports and reopens the same artwork',async()=>{
 const {api,get,context}=await openWorkshop();api.tab('furniture');
 get('furniture-slot').value='bed_1x2';await get('furniture-slot').send('change');
 const source='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/furniture/bed_1x2-example.png',import.meta.url)).toString('base64');
 await get('furniture-file').send('change',{target:{files:[{name:'bed.png',type:'image/png',size:100,data:source}],value:'bed.png'}});
 assert.equal(api.getDraft().furniture.bed_1x2,source);
 const wrong='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/furniture/bed_1x1-example.png',import.meta.url)).toString('base64');
 await get('furniture-file').send('change',{target:{files:[{name:'bad.png',type:'image/png',size:100,data:wrong}],value:'bad.png'}});
 assert.match(get('status').textContent,/Expected 32 × 64/);assert.equal(api.getDraft().furniture.bed_1x2,source);
 await get('export').send('click');const exported=await context.lastExport.text();
 await get('furniture-clear').send('click');assert.equal(api.getDraft().furniture.bed_1x2,undefined);
 await get('import').send('change',{target:{files:[{size:exported.length,text:async()=>exported}],value:'project.json'}});
 assert.equal(api.getDraft().furniture.bed_1x2,source);
 await get('furniture-play').send('click');assert.ok(get('game').srcdoc.includes('window.WORKSHOP_ROOM="bedroom"'));
 await get('furniture-blank').send('click');await get('furniture-guide').send('click');await get('furniture-example').send('click');
});
