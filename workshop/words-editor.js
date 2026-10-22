const WORD_LABELS={name:'Name',summary:'Short line · workbench, stash and sack',effect:'Effect',limits:'Limits'};
let wordFocus=null;
function wordsSlot(){return $('words-slot').value||'snare';}
function fillWordPreview(text,slot){return text.replace(/\{(\w+)\}/g,(m,k)=>Object.hasOwn(slot.values,k)?String(slot.values[k]):m);}
function wordsForm(){
 const id=wordsSlot(),slot=WORD_SLOTS[id],custom=draft.words[id]??{};
 $('words-values').replaceChildren(...Object.entries(slot.values).map(([key,value])=>{const b=document.createElement('button');b.type='button';b.textContent=`{${key}} = ${value}`;b.title='Insert into the last text box you used';b.addEventListener('click',()=>{const box=wordFocus?.isConnected?wordFocus:null;if(!box||box.dataset.key==='name')return status('Click into an effect or limits box first.',true);const at=box.selectionStart??box.value.length;box.value=box.value.slice(0,at)+`{${key}}`+box.value.slice(box.selectionEnd??at);box.focus();box.dispatchEvent(new Event('input'));saveWord(box);});return b;}));
 if(!Object.keys(slot.values).length){const p=document.createElement('p');p.className='ws-note';p.textContent='This one has no numbers to insert.';$('words-values').append(p);}
 $('words-fields').replaceChildren(...Object.keys(WORD_LABELS).filter(key=>typeof slot[key]==='string').map(key=>{
  const wrap=document.createElement('label');wrap.className='ws-word-field';wrap.append(WORD_LABELS[key]);
  const box=document.createElement(key==='name'?'input':'textarea');box.dataset.key=key;box.value=custom[key]??slot[key];box.maxLength=key==='name'?40:400;
  const preview=document.createElement('p');preview.className='ws-word-preview';
  const show=()=>{const text=box.value,unknown=[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).find(k=>!Object.hasOwn(slot.values,k));preview.dataset.error=String(!!unknown);preview.textContent=unknown?`{${unknown}} is not one of this item's numbers.`:key==='name'?'':'Shows as: '+fillWordPreview(text,slot);};
  box.addEventListener('focus',()=>{wordFocus=box;});box.addEventListener('input',show);box.addEventListener('change',()=>saveWord(box));show();
  wrap.append(box,preview);return wrap;
 }));
 $('words-state').textContent=Object.keys(custom).length?'Custom words saved in this draft':'Original words';
}
function saveWord(box){
 const id=wordsSlot(),slot=WORD_SLOTS[id],key=box.dataset.key,text=box.value.trim(),next=structuredClone(draft),fields={...(next.words[id]??{})};
 if(!text||text===slot[key])delete fields[key];else fields[key]=text;
 if(Object.keys(fields).length)next.words[id]=fields;else delete next.words[id];
 try{draft=validateWorkshopDraft(next);changed();$('words-state').textContent=Object.keys(draft.words[id]??{}).length?'Custom words saved in this draft':'Original words';status('Words updated. Restart a test to see them.');if(!text)box.value=slot[key];}
 catch(error){status(error.message,true);}
}
for(const[group,label]of [['gear','Workbench gear & potions'],['ability','Campfire abilities']]){const g=document.createElement('optgroup');g.label=label;for(const[id,slot]of Object.entries(WORD_SLOTS))if(slot.group===group){const o=document.createElement('option');o.value=id;o.textContent=slot.name;g.append(o);}$('words-slot').append(g);}
$('words-slot').value='snare';
$('words-slot').addEventListener('change',wordsForm);
$('words-clear').addEventListener('click',()=>{const next=structuredClone(draft);delete next.words[wordsSlot()];draft=validateWorkshopDraft(next);changed();wordsForm();status('Original words restored.');});
$('words-play').addEventListener('click',()=>{tab('play');startTest('lair');});
wordsForm();
