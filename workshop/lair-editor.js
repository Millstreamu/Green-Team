let lairRenderSerial=0;
function lairSlot(){return $('lair-slot').value||'terrain';}
function lairSource(project,id){return id==='terrain'?project.lair.tiles:project.lair.props[id];}
function lairSize(id){return id==='terrain'?[128,96]:[LAIR_ART_SLOTS[id].width,LAIR_ART_SLOTS[id].height];}

async function validateLairImages(project){
  const entries=[['terrain',project.lair.tiles],...Object.entries(project.lair.props)];
  for(const [id,src]of entries)if(src){const img=await image(src),[w,h]=lairSize(id);if(id==='terrain')workshopTerrainArt(img);else if(img.naturalWidth!==w||img.naturalHeight!==h)throw Error(`Lair ${id} must be ${w} × ${h} px.`);}
}

async function lairPreview(){
  const serial=++lairRenderSerial,id=lairSlot(),[w,h]=lairSize(id),src=lairSource(draft,id);
  $('lair-size').textContent=`${w} × ${h} px transparent PNG${id==='terrain'?' · 9 classic pieces; earlier 128 × 64 and 128 × 128 sheets also accepted':' · keep the blue anchor in mind'}`;
  $('lair-state').textContent=src?'Custom PNG · included in your next lair test':'Classic workshop walls · original station drawings';
  $('lair-guide').src=id==='terrain'?WORKSHOP_ASSETS.classic.guide:WORKSHOP_ASSETS.lair[id].guide;
  try{
    const terrain=workshopTerrainArt(await image(draft.lair.tiles??WORKSHOP_ASSETS.classic.example));
    const images=new Map(await Promise.all(Object.entries(draft.lair.props).map(async([key,source])=>[key,await image(source)])));
    if(serial!==lairRenderSerial)return;
    const world={...WORKSHOP_LAIR_LAYOUT,tiles:new Uint8Array(WORKSHOP_LAIR_LAYOUT.tiles),camp:{buildings:{potion:$('lair-built').checked===true}}};
    drawLairOverview($('lair-layout'),world,terrain,images,id);
  }catch(error){status(error.message,true);}
}

async function acceptLairFile(file){
  if(!file)return;const serial=++importSerial,id=lairSlot();
  try{
    if(file.size>5000000)throw Error('Choose a PNG under 5 MB.');
    if(file.type!=='image/png'&&!/\.png$/i.test(file.name))throw Error('Use a PNG image.');
    const source=(await readData(file)).replace(/^data:[^;]*;/,'data:image/png;');
    const img=await image(source),[w,h]=lairSize(id);
    if(id==='terrain')workshopTerrainArt(img);else if(img.naturalWidth!==w||img.naturalHeight!==h)throw Error(`Expected ${w} × ${h} px, received ${img.naturalWidth} × ${img.naturalHeight}.`);
    if(serial!==importSerial||id!==lairSlot())return;
    const next=structuredClone(draft);if(id==='terrain')next.lair.tiles=source;else next.lair.props[id]=source;
    draft=validateWorkshopDraft(next);changed();await lairPreview();status('Lair artwork added. Walk around lair to test it.');
  }catch(error){status(error.message,true);}
}

for(const [id,slot]of Object.entries(LAIR_ART_SLOTS)){const o=document.createElement('option');o.value=id;o.textContent=slot.name;$('lair-slot').append(o);}
$('lair-slot').value='terrain';
$('lair-slot').addEventListener('change',()=>{importSerial++;if(lairSlot()==='potion')$('lair-built').checked=true;if(lairSlot()==='potionSite')$('lair-built').checked=false;lairPreview();});
$('lair-built').addEventListener('change',lairPreview);
$('lair-file').addEventListener('change',async e=>{await acceptLairFile(e.target.files[0]);e.target.value='';});
$('lair-drop').addEventListener('dragover',e=>e.preventDefault());
$('lair-drop').addEventListener('drop',e=>{e.preventDefault();acceptLairFile(e.dataTransfer.files[0]);});
$('lair-blank').addEventListener('click',()=>downloadData(`lair-${lairSlot()}-blank.png`,lairSlot()==='terrain'?WORKSHOP_ASSETS.classic.blank:WORKSHOP_ASSETS.lair[lairSlot()].blank));
$('lair-guide-download').addEventListener('click',()=>downloadData(`lair-${lairSlot()}-guide.png`,lairSlot()==='terrain'?WORKSHOP_ASSETS.classic.guide:WORKSHOP_ASSETS.lair[lairSlot()].guide));
$('lair-clear').addEventListener('click',()=>{importSerial++;if(lairSlot()==='terrain')draft.lair.tiles=null;else delete draft.lair.props[lairSlot()];changed();lairPreview();status('Selected lair artwork restored to its original drawing.');});
$('lair-test').addEventListener('click',async()=>{importSerial++;draft.lair={tiles:WORKSHOP_ASSETS.classic.test,props:Object.fromEntries(Object.entries(WORKSHOP_ASSETS.lair).map(([id,v])=>[id,v.test]))};changed();await lairPreview();status('Diagnostic art applied to the lair only. Pick a station to check its anchor, or walk around the lair.');});
$('lair-play').addEventListener('click',()=>{tab('play');startTest('lair');});
lairPreview();
