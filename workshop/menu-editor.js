const MENU_PREVIEW_SELECTORS={shell:'#green-workshop .mm-shell',slot:'#green-workshop .mm-slot',selected:'#green-workshop .mm-slot.mm-selected',empty:'#green-workshop .mm-slot.mm-empty',lock:'#green-workshop .mm-lock',accent:'#green-workshop .mm-accent',active:'#green-workshop .mm-none',line:'#green-workshop .mm-none',inkText:'#green-workshop .mm-none',fadedText:'#green-workshop .mm-faded',accentText:'#green-workshop .mm-none',chip:'#green-workshop .mm-none'};
let menuPreviewSerial=0;
function menuArtSlot(){return $('menu-art').value||'frame';}
async function validateMenuImages(project){
 for(const[id,src]of Object.entries(project.menu?.art??{})){const slot=MENU_ART_SLOTS[id],img=await image(src);if(!slot||img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Menu art ${id} has the wrong PNG dimensions.`);}
}
function menuPreview(){
 root.querySelector('#ws-menu-look').textContent=menuThemeCss(draft.menu,MENU_PREVIEW_SELECTORS);
 const id=menuArtSlot(),slot=MENU_ART_SLOTS[id];
 $('menu-art-size').textContent=`${slot.width} × ${slot.height} px transparent PNG${id==='frame'?' · 3 × 3 grid of 16 px pieces':' · stretched to each slot'}`;
 $('menu-art-state').textContent=draft.menu.art[id]?'Custom PNG saved in this draft':'Original look';
}
function menuColors(){
 $('menu-colors').replaceChildren(...Object.entries(MENU_COLOR_DEFAULTS).map(([key,original])=>{
  const wrap=document.createElement('label'),input=document.createElement('input'),reset=document.createElement('button');
  wrap.append(MENU_COLOR_NAMES[key]);input.type='color';input.value=draft.menu.colors[key]??original;reset.type='button';reset.textContent='Original';reset.disabled=!draft.menu.colors[key];
  input.addEventListener('input',()=>{const next=structuredClone(draft);next.menu.colors[key]=input.value;draft=validateWorkshopDraft(next);reset.disabled=false;menuPreview();});
  input.addEventListener('change',()=>{changed();status('Menu colour updated. Restart a lair test to see it.');});
  reset.addEventListener('click',()=>{delete draft.menu.colors[key];changed();menuColors();menuPreview();});
  wrap.append(input,reset);return wrap;
 }));
}
async function acceptMenuArtFile(file){
 if(!file)return;const serial=++importSerial,id=menuArtSlot(),slot=MENU_ART_SLOTS[id];
 try{
  if(file.size>5000000||file.type!=='image/png'&&!/\.png$/i.test(file.name))throw Error('Choose a PNG under 5 MB.');
  const source=(await readData(file)).replace(/^data:[^;]*;/,'data:image/png;'),img=await image(source);
  if(img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error(`Expected ${slot.width} × ${slot.height} px; received ${img.naturalWidth} × ${img.naturalHeight}.`);
  if(serial!==importSerial||id!==menuArtSlot())return;
  const next=structuredClone(draft);next.menu.art[id]=source;draft=validateWorkshopDraft(next);changed();menuPreview();status('Menu art added. Restart a lair test to see it.');
 }catch(error){status(error.message,true);}
}
function menuForm(){menuColors();menuPreview();}
for(const[id,slot]of Object.entries(MENU_ART_SLOTS)){const o=document.createElement('option');o.value=id;o.textContent=slot.name;$('menu-art').append(o);}
$('menu-art').addEventListener('change',()=>{importSerial++;menuPreview();});
$('menu-art-file').addEventListener('change',async e=>{await acceptMenuArtFile(e.target.files[0]);e.target.value='';});
$('menu-art-drop').addEventListener('dragover',e=>e.preventDefault());
$('menu-art-drop').addEventListener('drop',e=>{e.preventDefault();acceptMenuArtFile(e.dataTransfer.files[0]);});
for(const kind of ['blank','guide','example'])$('menu-art-'+kind).addEventListener('click',()=>downloadData(menuArtSlot()+'-'+kind+'.png',WORKSHOP_ASSETS.menu[menuArtSlot()][kind]));
$('menu-art-clear').addEventListener('click',()=>{importSerial++;delete draft.menu.art[menuArtSlot()];changed();menuPreview();});
$('menu-reset').addEventListener('click',()=>{importSerial++;draft.menu={colors:{},art:{}};changed();menuForm();status('Original menu look restored.');});
$('menu-play').addEventListener('click',()=>{tab('play');startTest('lair');});
for(const canvas of root.querySelectorAll('.mm-slot canvas'))drawStationSprite(canvas,canvas.dataset.sprite);
menuForm();
