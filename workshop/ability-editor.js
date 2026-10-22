let abilityPreviewSerial=0;
function abilitySlot(){return $('ability').value||'quickSearch';}
async function validateAbilityImages(project){
 for(const[id,src]of Object.entries(project.abilities??{})){const slot=ABILITY_ART_SLOTS[id],img=await image(src);if(!slot||img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Ability icon ${id} has the wrong PNG dimensions.`);}
}
async function abilityPreview(){
 const serial=++abilityPreviewSerial,id=abilitySlot(),slot=ABILITY_ART_SLOTS[id];
 $('ability-size').textContent=`${slot.width} × ${slot.height} px transparent PNG`;
 $('ability-state').textContent=draft.abilities[id]?'Custom PNG saved in this draft':'Original icon';
 const img=await image(draft.abilities[id]??WORKSHOP_ASSETS.abilities[id].example);if(serial!==abilityPreviewSerial)return;
 const canvas=$('ability-preview'),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);
}
async function acceptAbilityFile(file){
 if(!file)return;const serial=++importSerial,id=abilitySlot(),slot=ABILITY_ART_SLOTS[id];
 try{
  if(file.size>5000000||file.type!=='image/png'&&!/\.png$/i.test(file.name))throw Error('Choose a PNG under 5 MB.');
  const source=(await readData(file)).replace(/^data:[^;]*;/,'data:image/png;'),img=await image(source);
  if(img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Expected ${slot.width} × ${slot.height} px; received ${img.naturalWidth} × ${img.naturalHeight}.`);
  if(serial!==importSerial||id!==abilitySlot())return;
  const next=structuredClone(draft);next.abilities[id]=source;draft=validateWorkshopDraft(next);changed();await abilityPreview();status('Ability icon added. Restart a lair test to see it at the campfire.');
 }catch(error){status(error.message,true);}
}
for(const[id,slot]of Object.entries(ABILITY_ART_SLOTS)){const o=document.createElement('option');o.value=id;o.textContent=slot.name;$('ability').append(o);}
$('ability').addEventListener('change',()=>{importSerial++;abilityPreview();});
$('ability-file').addEventListener('change',async e=>{await acceptAbilityFile(e.target.files[0]);e.target.value='';});
$('ability-drop').addEventListener('dragover',e=>e.preventDefault());
$('ability-drop').addEventListener('drop',e=>{e.preventDefault();acceptAbilityFile(e.dataTransfer.files[0]);});
for(const kind of ['blank','guide','example'])$('ability-'+kind).addEventListener('click',()=>downloadData(abilitySlot()+'-'+kind+'.png',WORKSHOP_ASSETS.abilities[abilitySlot()][kind]));
$('ability-clear').addEventListener('click',()=>{importSerial++;delete draft.abilities[abilitySlot()];changed();abilityPreview();});
abilityPreview();
