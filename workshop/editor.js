const $=id=>root.querySelector('#ws-'+id), mapNames={manor:'Human Manor',hold:'Dwarf Hold',sanctuary:'Elf Sanctuary'};
let draft=createWorkshopDraft(), revision=0, importSerial=0, audioPreview=null, currentTab='lair', runningTest=null;
const imageCache=new Map();
function status(message,error=false){$('status').textContent=message;$('status').dataset.error=String(error);}
function changed(){revision++;$('draft-state').textContent='Unsaved draft · export to keep';if(!$('game').hidden)$('test-state').textContent='Draft changed. Restart test to apply it.';}
function mapId(){return $('map').value;}
function tab(id){currentTab=id;for(const n of root.querySelectorAll('[data-tab]'))n.setAttribute('aria-pressed',String(n.dataset.tab===id));for(const n of root.querySelectorAll('[data-panel]'))n.hidden=n.dataset.panel!==id;$('map-context').hidden=!['tiles','balance','play'].includes(id);if(id!=='play')stopTest();if(id==='balance')charts();if(id==='lair')lairPreview();}
for(const n of root.querySelectorAll('[data-tab]'))n.addEventListener('click',()=>tab(n.dataset.tab));
function download(name,data,type){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadData(name,data){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
function jsonLiteral(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
async function image(src){if(!imageCache.has(src)){const p=new Image();p.src=src;const ready=p.decode().then(()=>p);imageCache.set(src,ready);}return imageCache.get(src);}
function inputNumber(label,value,min,max,step,change){const wrap=document.createElement('label');wrap.textContent=label;const i=document.createElement('input');Object.assign(i,{type:'number',value:String(value),min:String(min),max:String(max),step:String(step)});wrap.append(i);i.addEventListener('change',()=>{const next=Number(i.value);if(i.value.trim()===''||!Number.isFinite(next)||next<min||next>max||(step===1&&!Number.isInteger(next))){i.value=String(value);status(`Use ${min}–${max} for ${label}.`,true);return;}try{change(next);value=next;changed();status('Draft updated. Restart a test to apply your changes.');charts();}catch(error){i.value=String(value);status(error.message,true);}});return wrap;}
const lootLabels={nearEmptyChance:'Empty near entrance (%)',farEmptyChance:'Empty far away (%)',twoItemChance:'Two items if nonempty (%)',nearMaterialChance:'Materials near entrance (%)',farMaterialChance:'Materials far away (%)',nearRareChance:'Rare valuables near (%)',farRareChance:'Rare valuables far (%)'};
function forms(){const id=mapId();$('loot-title').textContent=mapNames[id]+' loot';$('tiles-title').textContent=mapNames[id]+' tiles';
 $('loot-fields').replaceChildren(...WORKSHOP_LOOT_FIELDS.map(key=>inputNumber(lootLabels[key],Math.round(draft.maps[id].loot[key]*100),0,100,1,v=>{draft.maps[id].loot[key]=v/100;})));
 $('weight-fields').replaceChildren();for(const type of Object.keys(SEARCHABLE_TYPES)){const h=document.createElement('h4');h.textContent=SEARCHABLE_TYPES[type].name;const box=document.createElement('div');box.className='ws-fields';box.append(...WORKSHOP_MATERIALS.map(key=>inputNumber(LOOT_TYPES[key].name,draft.maps[id].weights[type][key]??0,0,100,1,v=>{const weights={...draft.maps[id].weights[type],[key]:v};if(!Object.values(weights).some(n=>n>0))throw Error('Keep at least one nonzero weight.');draft.maps[id].weights[type]=weights;})));$('weight-fields').append(h,box);}
 $('tuning-fields').replaceChildren(...TUNING_FIELDS.filter(f=>f.group!=='loot').map(f=>inputNumber(f.label,draft.tuning[f.id],f.min,f.max,f.step,v=>{draft.tuning[f.id]=v;})));
 $('generator-fields').replaceChildren(...GENERATOR_FIELDS.map(f=>inputNumber(f.label,draft.generator[id][f.id],f.min,f.max,1,v=>{const next={...draft.generator[id],[f.id]:v};validateGenerator(next);draft.generator[id]=next;})));
 $('cost-fields').replaceChildren();for(const [key,p] of Object.entries(PERSONAL_UPGRADES)){const row=document.createElement('div');row.className='ws-cost-row';const name=document.createElement('span');name.textContent=p.name;row.append(name,inputNumber('XP',draft.costs[key],0,10000,1,v=>{draft.costs[key]=v;}));$('cost-fields').append(row);}
 for(const [key,r]of Object.entries(RECIPES)){const box=document.createElement('div');box.className='ws-ingredients';const heading=document.createElement('span');heading.textContent=r.name+' ingredients';box.append(heading,...Object.entries(draft.materials[key]).map(([material,n])=>inputNumber(LOOT_TYPES[material].name,n,1,99,1,v=>{draft.materials[key][material]=v;})));$('cost-fields').append(box);}
 roomPreview();charts();}
$('map').addEventListener('change',()=>{importSerial++;forms();});$('difficulty').addEventListener('change',()=>{charts();if(!$('game').hidden)$('test-state').textContent='Restart test to use the selected difficulty.';});
function charts(){if(!root.querySelector('[data-panel="balance"]')||root.querySelector('[data-panel="balance"]').hidden)return;const depth=Number($('depth').value)/100,type=$('container').value,difficulty=$('difficulty').value;$('depth-label').textContent=Math.round(depth*100)+'%';
 const all=WORKSHOP_MAPS.map(id=>({id,odds:workshopLootOdds(draft,id,type,depth,difficulty,$('room-kind').value||null)}));
 const ids=Object.keys(LOOT_TYPES).filter(id=>all.some(d=>(d.odds.items[id]?.expected??0)>0));
 const max=Math.max(1,...all.flatMap(d=>ids.map(id=>(d.odds.items[id]?.expected??0)*100)))*1.12;
 const host=$('charts');host.replaceChildren();for(const data of all){const section=document.createElement('div'),h=document.createElement('h3'),info=document.createElement('p');h.textContent=mapNames[data.id]+($('room-kind').value?' · '+ROOM_TYPES[$('room-kind').value].name:'');info.className='ws-note';info.textContent=`Empty ${(data.odds.empty*100).toFixed(1)}% · one ${(data.odds.one*100).toFixed(1)}% · two ${(data.odds.two*100).toFixed(1)}%`;section.append(h,info);host.append(section);
 const width=Math.max(270,Math.round(section.getBoundingClientRect().width||300)),height=ids.length*28+48,left=118,right=42,plot=width-left-right;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${mapNames[data.id]} expected item counts per 100 ${type} searches at ${Math.round(depth*100)} percent depth`);
 function s(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n;}
 ids.forEach((id,i)=>{const value=(data.odds.items[id]?.expected??0)*100,y=12+i*28;s('text',{x:0,y:y+12},LOOT_TYPES[id].name);const mark=s('rect',{x:left,y,width:Math.max(0,value/max*plot),height:16,fill:'#bfdb89'});const title=document.createElementNS(ns,'title');title.textContent=`${value.toFixed(2)} expected items; ${((data.odds.items[id]?.chance??0)*100).toFixed(2)}% chance of at least one per search`;mark.append(title);s('text',{x:left+plot+6,y:y+12},value.toFixed(1));});
 const base=height-31;s('line',{x1:left,y1:base,x2:left+plot,y2:base,stroke:'#71806a'});for(const v of [0,max/2,max])s('text',{x:left+v/max*plot,y:base+15,'text-anchor':'middle'},String(Math.round(v)));s('text',{x:left+plot/2,y:height-1,'text-anchor':'middle'},'items / 100 searches');section.append(svg);}
}
$('room-kind').addEventListener('change',charts);$('container').addEventListener('change',charts);$('depth').addEventListener('input',charts);new ResizeObserver(()=>{if(currentTab==='balance')charts();}).observe($('charts'));
async function roomPreview(){const id=mapId(),src=draft.maps[id].tiles??WORKSHOP_ASSETS.classic.example,canvas=$('room'),c=canvas.getContext('2d');$('tile-state').textContent=draft.maps[id].tiles?'Custom PNG · ready for next test':'Classic workshop walls · tall backs, narrow sides, low front edges';c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
 const scene=$('join-scene').value||'room',w=scene==='reference'?classicProofWorld():workshopJoinWorld(scene);canvas.width=w.width*32;canvas.height=(w.height+1)*32;c.imageSmoothingEnabled=false;
 const art=workshopTerrainArt(await image(src));
 if(id!==mapId()||scene!==($('join-scene').value||'room')||src!==(draft.maps[id].tiles??WORKSHOP_ASSETS.classic.example))return;
 $('tile-state').textContent=(art.classic?'Classic · 128 × 96':art.deep?'Earlier deep format · 128 × 128':'Original five-piece format · 128 × 64')+(draft.maps[id].tiles?' · custom PNG':' · workshop example');
 canvas.setAttribute('aria-label',`${mapNames[id]} · ${scene==='reference'?'Approved room & corridor proof':WORKSHOP_JOIN_SCENES[scene]} · ${src===WORKSHOP_ASSETS.classic.test?'test colours':draft.maps[id].tiles?'custom art':'original art'}`);
 if(art.classic){c.fillStyle='#292619';c.fillRect(0,0,canvas.width,canvas.height);}drawTerrainOverview(c,art,w,32,0,32);
}
$('join-scene').addEventListener('change',roomPreview);
$('use-test').addEventListener('click',async()=>{
 const serial=++importSerial,id=mapId();
 try{await image(WORKSHOP_ASSETS.classic.test);if(serial!==importSerial||id!==mapId())return;
 const next=structuredClone(draft);next.maps[id].tiles=WORKSHOP_ASSETS.classic.test;draft=validateWorkshopDraft(next);changed();await roomPreview();
 status(`Test tileset applied to ${mapNames[id]}. Check the three join views, then start a dungeon test.`);
 }catch(error){status(error.message,true);}
});
$('test-png').addEventListener('click',()=>downloadData('classic-walls-test-128x96.png',WORKSHOP_ASSETS.classic.test));
$('guide').src=WORKSHOP_ASSETS.classic.guide;
$('blank').addEventListener('click',()=>downloadData('classic-walls-blank-128x96.png',WORKSHOP_ASSETS.classic.blank));$('reference').addEventListener('click',()=>downloadData('classic-walls-example-128x96.png',WORKSHOP_ASSETS.classic.example));$('guide-download').addEventListener('click',()=>downloadData('green-team-tileset-guide.png',WORKSHOP_ASSETS.classic.guide));
const itemSelect=$('item');for(const [id,item]of Object.entries(LOOT_TYPES)){if(item.runOnly)continue;const o=document.createElement('option');o.value=id;o.textContent=item.name;itemSelect.append(o);}itemSelect.value='scrap';
for(const id of Object.keys(FEEDBACK_SOUNDS)){const o=document.createElement('option');o.value=id;o.textContent=id.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());$('sound').append(o);}$('sound').value='pickup';
function itemSize(id){const cells=LOOT_TYPES[id].cells;return [32*(Math.max(...cells.map(c=>c[0]))+1),32*(Math.max(...cells.map(c=>c[1]))+1)];}
async function itemPreview(){const id=$('item').value,[w,h]=itemSize(id);$('item-size').textContent=`${w} × ${h} px transparent PNG · ${draft.sprites[id]?'custom art':'original art'}`;const canvas=$('item-preview'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,192,192);ctx.imageSmoothingEnabled=false;if(draft.sprites[id]){const p=await image(draft.sprites[id]);if(id!==$('item').value)return;const s=160/Math.max(w,h);ctx.drawImage(p,(192-w*s)/2,(192-h*s)/2,w*s,h*s);}else drawStationItem(ctx,{type:id,rotation:0},32,32,Math.min(128,160/Math.max(w/32,h/32)));}
$('item').addEventListener('change',()=>{importSerial++;itemPreview();});$('sound').addEventListener('change',()=>{importSerial++;soundState();});
$('item-template').addEventListener('click',()=>{const [w,h]=itemSize($('item').value),c=document.createElement('canvas');c.width=w;c.height=h;downloadData(`${$('item').value}-${w}x${h}.png`,c.toDataURL('image/png'));});
$('clear-tiles').addEventListener('click',()=>{importSerial++;draft.maps[mapId()].tiles=null;changed();roomPreview();});$('clear-item').addEventListener('click',()=>{importSerial++;delete draft.sprites[$('item').value];changed();itemPreview();});$('clear-audio').addEventListener('click',()=>{importSerial++;delete draft.audio[$('sound').value];changed();soundState();});
function readData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read this file.'));r.readAsDataURL(file);});}
async function acceptFile(kind,file){const serial=++importSerial,id=mapId(),item=$('item').value,cue=$('sound').value;if(!file)return;try{if(file.size>5000000)throw Error('Choose a file under 5 MB.');let src=await readData(file);
 if(kind!=='audio'){if(file.type!=='image/png'&&!/\.png$/i.test(file.name))throw Error('Use a PNG image.');src=src.replace(/^data:[^;]*;/,'data:image/png;');const p=await image(src);if(kind==='tiles')workshopTerrainArt(p);else{const [w,h]=itemSize(item);if(p.naturalWidth!==w||p.naturalHeight!==h)throw Error(`Expected ${w} × ${h} px, received ${p.naturalWidth} × ${p.naturalHeight}.`);}
 }else{const ext=file.name.split('.').pop().toLowerCase(),mime={wav:'wav',mp3:'mpeg',ogg:'ogg',webm:'webm'}[ext];if(!mime)throw Error('Use WAV, MP3, OGG or WebM audio.');src=src.replace(/^data:[^;]*;/,'data:audio/'+mime+';');const a=new Audio(src);await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=()=>reject(Error('The browser could not decode this audio.'));});}
 if(serial!==importSerial)return;const next=structuredClone(draft);if(kind==='tiles')next.maps[id].tiles=src;else if(kind==='item')next.sprites[item]=src;else next.audio[cue]=src;draft=validateWorkshopDraft(next);changed();status('Asset added. Restart a test to see or hear it in the game.');await roomPreview();await itemPreview();soundState();
 }catch(error){status(error.message,true);}}
function upload(input,drop,kind){$(input).addEventListener('change',e=>{acceptFile(kind,e.target.files[0]);e.target.value='';});const zone=$(drop);zone.addEventListener('dragover',e=>e.preventDefault());zone.addEventListener('drop',e=>{e.preventDefault();acceptFile(kind,e.dataTransfer.files[0]);});}
upload('tiles-file','tile-drop','tiles');upload('item-file','item-drop','item');upload('sound-file','sound-drop','audio');
function soundState(){$('audio-state').textContent=draft.audio[$('sound').value]?'Custom clip · ready for next test':'Original synthesized effect';}
$('listen').addEventListener('click',()=>{audioPreview?.pause();const cue=$('sound').value;if(draft.audio[cue]){audioPreview=new Audio(draft.audio[cue]);audioPreview.volume=.18;audioPreview.play().catch(e=>status(e.message,true));}else{try{const ac=new (window.AudioContext||window.webkitAudioContext)(),slot=FEEDBACK_SOUNDS[cue];slot.notes.forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain(),at=ac.currentTime+i*slot.duration;o.frequency.value=f;o.type=slot.wave;g.gain.setValueAtTime(.035,at);g.gain.exponentialRampToValueAtTime(.0001,at+slot.duration);o.connect(g);g.connect(ac.destination);o.start(at);o.stop(at+slot.duration);});setTimeout(()=>ac.close(),1000);}catch(e){status('Audio preview unavailable: '+e.message,true);}}});
$('export').addEventListener('click',()=>{try{const next=validateWorkshopDraft(draft);download('green-team-workshop-project.json',JSON.stringify(next,null,2),'application/json');$('draft-state').textContent='Project exported · includes imported assets';status('Keep the exported project to continue later or attach it here to integrate your choices.');}catch(e){status(e.message,true);}});
$('import').addEventListener('change',async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;const serial=++importSerial;
 try{
  if(file.size>40000000)throw Error('Project exceeds 40 MB.');
  const next=validateWorkshopDraft(JSON.parse(await file.text()));
  for(const id of WORKSHOP_MAPS)if(next.maps[id].tiles){const p=await image(next.maps[id].tiles);workshopTerrainArt(p);}
  for(const[id,src]of Object.entries(next.sprites)){const p=await image(src),[w,h]=itemSize(id);if(p.naturalWidth!==w||p.naturalHeight!==h)throw Error(`Invalid ${id} image size.`);}
  await validateLairImages(next);await validateFurnitureImages(next);await validateAbilityImages(next);
  if(serial!==importSerial)return;
  stopTest();draft=next;changed();forms();itemPreview();soundState();await lairPreview();await furniturePreview();await abilityPreview();wordsForm();status('Project imported. Start a new test to try it.');
 }catch(error){status(error.message,true);}
});
function stopTest(){$('stop').disabled=true;const frame=$('game');frame.srcdoc='';frame.hidden=true;runningTest=null;$('test-state').textContent='Test stopped. Draft changes are kept until you close this workshop.';}
$('stop').addEventListener('click',stopTest);$('random').addEventListener('click',()=>{$('seed').value=String(crypto.getRandomValues(new Uint32Array(1))[0]);});
function startTest(where){try{const valid=validateWorkshopDraft(draft),seed=Number($('seed').value);if($('seed').value.trim()===''||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be a whole number from 0 to 4294967295.');const start=`window.WORKSHOP_DRAFT=${jsonLiteral(valid)};window.WORKSHOP_MAP=${jsonLiteral(mapId())};window.WORKSHOP_DIFFICULTY=${jsonLiteral($('difficulty').value)};window.WORKSHOP_SEED=${seed};window.WORKSHOP_START=${jsonLiteral(where)};window.WORKSHOP_ROOM=${jsonLiteral($('test-room').value)};window.WORKSHOP_LAIR_POTION=${$('lair-built').checked===true};`;
 const html=decodeURIComponent(escape(atob(WORKSHOP_GAME_HTML))),script=decodeURIComponent(escape(atob(WORKSHOP_GAME_CODE)));
 runningTest={where,map:mapId(),difficulty:$('difficulty').value,seed,built:$('lair-built').checked===true,revision};
 $('stop').disabled=false;$('game').hidden=false;$('game').srcdoc=html.replace('<!--WORKSHOP_SCRIPT-->',`<script type="module">${start}\n${script.replace(/<\/script/gi,'<\\/script')}\n<`+'/script>');$('test-state').textContent=where==='lair'?'Starting lair with your artwork…':'Starting real solo game…';status('Test uses this draft. Restart it after changing assets or balance.');
}catch(e){status(e.message,true);}}
$('start-surface').addEventListener('click',()=>{$('seed').value='1';$('map').value='manor';$('difficulty').value='normal';startTest('surface');});
$('start-room').addEventListener('click',()=>startTest('room-pass'));
$('start-guard-door').addEventListener('click',()=>startTest('guard-door'));
$('start-door').addEventListener('click',()=>{ $('seed').value='1'; $('map').value='manor'; $('difficulty').value='normal'; startTest('door'); });
$('start-dungeon').addEventListener('click',()=>startTest('dungeon'));$('start-lair').addEventListener('click',()=>startTest('lair'));
window.addEventListener('message',e=>{if(e.source!==$('game').contentWindow||!runningTest)return;if(e.data?.type==='workshop-ready')$('test-state').textContent=(runningTest.where==='lair'?`Running lair · potion station ${runningTest.built?'built':'unbuilt'}.`:`Running ${mapNames[runningTest.map]} · ${runningTest.difficulty} · seed ${runningTest.seed}.`)+(runningTest.revision!==revision?' Draft changed; restart to apply edits.':'');if(e.data?.type==='workshop-error')$('test-state').textContent='Game could not start: '+e.data.message;});
forms();itemPreview();soundState();
$('map-context').hidden=true;
