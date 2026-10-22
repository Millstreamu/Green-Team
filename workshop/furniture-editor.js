let furniturePreviewSerial=0;
function furnitureSlot(){return $('furniture-slot').value||'table_1x1';}
async function validateFurnitureImages(project){
 for(const[id,src]of Object.entries(project.furniture??{})){const slot=FURNITURE_ART_SLOTS[id],img=await image(src);if(!slot||img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Furniture ${id} has the wrong PNG dimensions.`);}
}
async function furniturePreview(){
 const serial=++furniturePreviewSerial,id=furnitureSlot(),slot=FURNITURE_ART_SLOTS[id];
 $('furniture-size').textContent=`${slot.width} × ${slot.height} px · ${slot.tilesWide} × ${slot.tilesHigh} solid floor tiles${slot.wallTilesAbove?' · top tile rises up the back wall':''}${slot.container?' · used in the entrance room and other rooms without a purpose':''}`;
 $('furniture-guide-image').src=WORKSHOP_ASSETS.furniture[id].guide;
 $('furniture-state').textContent=draft.furniture[id]?'Custom PNG saved in this draft':'Original placeholder artwork';
 const img=await image(draft.furniture[id]??WORKSHOP_ASSETS.furniture[id].example);if(serial!==furniturePreviewSerial)return;
 const canvas=$('furniture-preview'),c=canvas.getContext('2d');canvas.width=slot.width*4;canvas.height=slot.height*4;c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);
}
async function acceptFurnitureFile(file){
 if(!file)return;const serial=++importSerial,id=furnitureSlot(),slot=FURNITURE_ART_SLOTS[id];
 try{
  if(file.size>5000000||file.type!=='image/png'&&!/\.png$/i.test(file.name))throw Error('Choose a PNG under 5 MB.');
  const source=(await readData(file)).replace(/^data:[^;]*;/,'data:image/png;'),img=await image(source);
  if(img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Expected ${slot.width} × ${slot.height} px; received ${img.naturalWidth} × ${img.naturalHeight}.`);
  if(serial!==importSerial||id!==furnitureSlot())return;
  const next=structuredClone(draft);next.furniture[id]=source;draft=validateWorkshopDraft(next);changed();await furniturePreview();status('Furniture artwork added. Restart a playtest to use it.');
 }catch(error){status(error.message,true);}
}
for(const[id,slot]of Object.entries(FURNITURE_ART_SLOTS)){const o=document.createElement('option');o.value=id;o.textContent=slot.name;$('furniture-slot').append(o);}
$('furniture-slot').value='table_3x1';
$('furniture-slot').addEventListener('change',()=>{importSerial++;furniturePreview();});
$('furniture-file').addEventListener('change',async e=>{await acceptFurnitureFile(e.target.files[0]);e.target.value='';});
$('furniture-drop').addEventListener('dragover',e=>e.preventDefault());
$('furniture-drop').addEventListener('drop',e=>{e.preventDefault();acceptFurnitureFile(e.dataTransfer.files[0]);});
for(const kind of ['blank','guide','example'])$('furniture-'+kind).addEventListener('click',()=>downloadData(furnitureSlot()+'-'+kind+'.png',WORKSHOP_ASSETS.furniture[furnitureSlot()][kind]));
$('furniture-clear').addEventListener('click',()=>{importSerial++;delete draft.furniture[furnitureSlot()];changed();furniturePreview();});
$('furniture-play').addEventListener('click',()=>{const kind=FURNITURE_ART_SLOTS[furnitureSlot()].kind,type=Object.keys(ROOM_TYPES).find(id=>ROOM_TYPES[id].furnishings.includes(kind))??'dining';$('test-room').value=type;tab('play');startTest('room-pass');});
furniturePreview();
