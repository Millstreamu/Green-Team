import { createFillingStationGrid } from './station-grid.js';
import { createPassiveView } from './passive-view.js';
import { createGearGuide } from './gear-guide-view.js';
import { gearDetails } from './gear-guide.js';
import { controlHint } from './game-screen.js';
import { PROGRESSION } from './config.js';
import { LOOT_TYPES, itemCells, itemCount } from './loot.js';
import { knowsRecipe, buyPersonalUpgrade, setPassiveActive } from './profile.js';
import { RECIPES, stashPackingPreview, buildPotionStation, POTION_STATION_COST, craftForSack, takeStashItem, returnStashItem } from './lair.js';
import { createStashGrid, createLairSackGrid } from './stash-view.js';
import { stationSprite } from './station-art.js';
import { STATION_CHOICES, stationActionState } from './station-book.js';

export function createLairView(dialog, camp, profile, getLoot, onChange, onClose, onProfileChange = () => {}, commands = null, { debugSupplies = false, feedback = () => {} } = {}) {
  const el = id => document.querySelector(`#${id}`), status = el('craft-status');
  let bookHold=null,bookKeyHeld=false,skipBookClick=false;
  const fillBook=value=>{const style=el('book-action').style;if(style.setProperty)style.setProperty('--hold',value);else style['--hold']=value;};
  const cancelBookHold=()=>{if(bookHold){clearTimeout(bookHold.finish);clearInterval(bookHold.progress);bookHold=null;}fillBook('0%');};
  let mode = 'stash', selected = 'snare', source = 'stash', tools = false, guideOpen = false, details = false, stashDetails = false, pending = null;
  const signature = () => JSON.stringify([camp.counts, camp.buildings, profile.xp, profile.purchases, profile.activePassives, getLoot().bag]);
  const request = message => { pending = { type: message.type, before: signature(), acknowledged: false }; commands(message); refresh(); };
  const passives = createPassiveView(el('station-passives'), profile, message => {
    if (pending) return;
    if (commands) { request(message); return; }
    const ok = message.type === 'buy' ? buyPersonalUpgrade(profile,message.upgrade) : setPassiveActive(profile,message.upgrade,message.active);
    if (ok) onProfileChange(); refresh(); feedback(ok);
  });
  const confirm = (ok, text) => { feedback(ok); if (text) status.textContent = text; };
  const grid = createStashGrid(el('stash-grid'), camp, onChange, type => {
    if (mode !== 'stash') return;
    if (commands) { request({ type: 'take', item: type }); return; }
    const ok = !!takeStashItem(camp, getLoot(), type);
    if (ok) onChange(); refresh(); confirm(ok, ok ? 'Packed into your sack.' : 'Sack full or stack empty.');
  }, commands ? (item, slot) => { request({ type: 'stack', item, slot }); return true; } : null, ok => { if (!commands) feedback(ok); }, () => { source = 'stash'; refreshStashAction(); }, screenY=>sackGrid.focusEdge(screenY),{autoSort:true});
  const sackGrid = createLairSackGrid(el('lair-sack-grid'), getLoot, item => {
    if (mode !== 'stash') return;
    if (commands) { request({ type: 'return', id: item.id }); return; }
    const ok = returnStashItem(camp, getLoot(), item.id);
    if (ok) onChange(); refresh(); confirm(ok, ok ? item.debugSupply ? 'Test item removed.' : 'Returned to shared stash.' : 'Cannot return that item.');
  }, () => { source = 'sack'; refreshStashAction(); },screenY=>grid.focusEdge(screenY));
  el('station-guide').parentElement?.append(el('stash-move'));
  const guide = createGearGuide(() => getLoot().bag, camp, profile);
  const choiceNodes = new Map();
  for (const type of [...Object.keys(RECIPES), 'quickSearch']) {
    const button = el(`choose-${type}`), picture = document.createElement('canvas'), name = document.createElement('span'), known = document.createElement('small');
    picture.width = 32; picture.height = 40; picture.setAttribute('aria-hidden', 'true');
    const image = stationSprite(type); if (image) picture.getContext('2d').drawImage(image, 0, 0);
    name.textContent = type === 'quickSearch' ? 'Quick fingers' : LOOT_TYPES[type].name;
    known.className='recipe-lock';known.setAttribute('aria-hidden','true');button.append(picture, known); choiceNodes.set(type, { button, known });
    button.addEventListener('focus',()=>{if(selected===type||!STATION_CHOICES[mode]?.includes(type)||tools||guideOpen)return;cancelBookHold();selected=type;details=false;status.textContent='';refresh();});
    button.addEventListener('click', () => {
      if (!STATION_CHOICES[mode]?.includes(type) || tools || guideOpen) return;
      cancelBookHold();selected = type; details = false; status.textContent = ''; refresh();
    });
  }
  const recipeGrid=createFillingStationGrid(el('book-choices'),()=>STATION_CHOICES[mode]?.length??0);
  function paintSprite(canvas, type) {
    canvas.dataset.itemType = type ?? '';
    if (!type && canvas.dataset.feedback && canvas.feedbackSnapshot) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
    const sprite = stationSprite(type);
    if (sprite) ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
    else if (LOOT_TYPES[type]) { ctx.fillStyle = LOOT_TYPES[type].color; ctx.fillRect(5, 7, 22, 26); ctx.fillStyle = '#34412a'; ctx.font = '16px monospace'; ctx.fillText(LOOT_TYPES[type].mark, 10, 25); }
    if (type && canvas.feedbackSnapshotType !== type) {
      canvas.feedbackSnapshotType = type;
      const snapshot = document.createElement('canvas'); snapshot.width = canvas.width; snapshot.height = canvas.height;
      snapshot.getContext('2d').drawImage(canvas, 0, 0); canvas.feedbackSnapshot = snapshot;
    }
  }
  function refreshStashAction() {
    grid.setActive(source==='stash');sackGrid.setActive(source==='sack');
    const selection = source === 'stash' ? grid.selection() : sackGrid.selection(), type = selection?.type;
    paintSprite(el('stash-action-icon'), type);
    el('stash-action-name').textContent = type ? LOOT_TYPES[type].name : 'Select an item';
    const preview=source==='stash'&&type&&!selection?.held&&!LOOT_TYPES[type].runOnly?stashPackingPreview(getLoot().bag,type):null;
    sackGrid.setPreview(preview);
    el('stash-action-source').textContent=type?(gearDetails(type)?.summary??(LOOT_TYPES[type].material?'Crafting material.':'')):'';
    el('stash-action').textContent = selection?.held ? 'Place stack' : source === 'stash' ? type&&!preview?'Won’t fit':'Pack 1 →' : `${selection?.debugSupply?'Remove test':'← Return'} ×${selection?itemCount(selection):1}`;
    el('stash-action').disabled = !!pending || !selection?.held && (!type||source==='stash'&&!preview);
    el('stash-action').setAttribute('aria-label',`${el('stash-action').textContent}${type?' · '+LOOT_TYPES[type].name:''}${source==='stash'?' · to your sack':' · to shared lair storage'}`);
    el('stash-move').hidden = mode!=='stash'||tools||guideOpen||source !== 'stash';
    el('stash-move').disabled = !selection?.held && !type;
    el('stash-move').textContent = selection?.held ? 'Cancel move' : 'Arrange';
    el('stash-info').disabled = !type; el('stash-info').setAttribute('aria-expanded', String(stashDetails));
    el('stash-details').hidden = !stashDetails;
    el('stash-details').textContent = type ? controlHint((gearDetails(type) ? `${gearDetails(type).effect} ${gearDetails(type).controls} ${gearDetails(type).limits}` : null) ?? `${LOOT_TYPES[type].name} · shared lair stock. ${LOOT_TYPES[type].material ? 'Use it as a crafting ingredient.' : 'Pack or return this item.'}`) : '';
  }
  function refreshBook() {
    const action = stationActionState(camp, profile, mode, selected); if (!action) return;
    const building = action.type === 'build-potion-station', upgrade = selected === 'quickSearch';
    for (const [type, nodes] of choiceNodes) {
      nodes.button.hidden = !STATION_CHOICES[mode].includes(type);
      nodes.button.setAttribute('aria-pressed', String(type === selected));
      nodes.known.hidden=knowsRecipe(profile,type);nodes.known.textContent='';nodes.button.setAttribute('aria-label',`${LOOT_TYPES[type]?.name??'Quick fingers'}${knowsRecipe(profile,type)?'':', locked'}`);
    }
    recipeGrid.refresh();
    el('book-title').textContent = building ? 'Build potion station' : upgrade ? 'Quick fingers' : LOOT_TYPES[selected].name;
    paintSprite(el('book-sprite'), selected);
    const detail = gearDetails(selected);
    const shortLimits={snare:'One use.',smoke:'Blocks sight, not attacks.',dart:'Walls block shots. Misses still spend the dart.',bell:'Visible goblins take priority.',orb:'Marks stay where the guards were when pinged.',lunch:'Team revive · one use.',disguise:'Close guards recognise you. Searching or using gear ends it.',vanish:'Hits, gear use and ordinary searching end it.',lucky:'Gold-coin finds only · lasts this run.'};
    el('book-effect').textContent = building ? 'Permanent shared upgrade' : upgrade ? `+${Math.round(PROGRESSION.quickSearchBonus * 100)}% search speed` : detail.summary;
    el('book-details').textContent=building?'Built once for everyone in the lair.':shortLimits[selected]??'';el('book-details').hidden=false;

    const materials = building ? { gold: POTION_STATION_COST } : RECIPES[selected]?.materials ?? {};
    const rows = Object.entries(materials).map(([type, amount]) => {
      const row = document.createElement('div'), icon = document.createElement('canvas'), required = document.createElement('strong'), available = document.createElement('small');
      row.className = 'book-ingredient'; icon.width = 32; icon.height = 40; icon.setAttribute('aria-hidden','true'); paintSprite(icon,type);
      required.textContent = `${camp.counts[type]??0} / ${amount}${(camp.counts[type]??0)<amount?' !':''}`;available.textContent='';row.dataset.missing=String((camp.counts[type]??0)<amount);
      row.setAttribute('aria-label', `${amount} ${LOOT_TYPES[type].name} required; ${camp.counts[type] ?? 0} in shared stash`); row.title = LOOT_TYPES[type].name;
      row.append(icon, required); return row;
    });
    el('book-materials').replaceChildren(...rows);
    el('book-action').hidden = action.type === 'owned'; el('book-owned').hidden = action.type !== 'owned';
    el('book-action').textContent = pending ? 'Waiting…' : action.type==='buy'?'Hold to unlock':building?'Hold to build':action.disabled?'Missing ingredients':action.label;el('book-action').setAttribute('aria-label',`${el('book-action').textContent}${action.type==='buy'?` · ${RECIPES[selected].xpCost} XP`:building?` · ${POTION_STATION_COST} shared gold`:''}`); el('book-action').disabled = !!pending || action.disabled;
    el('book-action-note').textContent=action.type==='buy'?`${RECIPES[selected].xpCost} XP${profile.xp<RECIPES[selected].xpCost?' · Need more XP':''}`:building?'Shared lair upgrade':'';
  }
  function refresh() {
    if(pending||tools||guideOpen)cancelBookHold();
    if (pending?.acknowledged && pending.before !== signature()) pending = null;
    grid.paint(); sackGrid.paint();
    el('lair-gold').hidden=mode==='stash'||mode==='craft'||mode==='campfire'||mode==='potion'&&!!camp.buildings?.potion;
    el('lair-gold').textContent = `${camp.counts.gold} gold`; el('lair-gold').setAttribute('aria-label', `${camp.counts.gold} shared gold`);
    el('personal-xp').textContent = `${profile.xp} XP`; el('personal-xp').setAttribute('aria-label', `${profile.xp} personal XP`); el('personal-xp').hidden = mode === 'stash'; el('campfire-xp').hidden = true;
    const inventory = mode === 'stash' && !tools && !guideOpen;
    el('station-inventory').hidden = !inventory;
    el('station-passives').hidden = mode !== 'campfire' || tools || guideOpen;
    if (mode === 'campfire') passives.refresh(!!pending);
    el('station-book').hidden = mode === 'campfire' || mode === 'stash' || tools || guideOpen;
    if(mode==='campfire')el('passive-price').parentElement?.append(status);else if(mode==='craft'||mode==='potion')el('book-action-note').after?.(status);
    el('station-debug-panel').hidden = !tools; el('gear-guide').hidden = !guideOpen;
    el('station-guide').textContent = guideOpen ? 'Back' : 'Guide'; el('station-guide').setAttribute('aria-expanded', String(guideOpen));
    el('station-tools').hidden = mode === 'campfire' || !!commands && !debugSupplies;
    el('station-tools').textContent = tools ? 'Back' : 'Test';
    for (const type of ['snare','smoke','lunch','dart','bell','disguise','vanish','lucky','orb','berries']) el(`debug-pack-${type}`).hidden = !!commands && !debugSupplies;
    if (guideOpen) guide.refresh();
    refreshStashAction(); if (mode !== 'stash' && mode !== 'campfire') refreshBook();
  }
  function bookAction(confirmed=false){
    if (!dialog.open || pending || tools || guideOpen) return;
    const action = stationActionState(camp, profile, mode, selected);
    if (!action || action.disabled || action.type === 'owned' || ['buy','build-potion-station'].includes(action.type)&&!confirmed) return;
    const message = { type: action.type, ...(action.upgrade ? { upgrade: action.upgrade } : {}), ...(action.item ? { item: action.item } : {}) };
    if (commands) { request(message); return; }
    let ok = false, text = '';
    if (action.type === 'build-potion-station') { ok = buildPotionStation(camp); if (ok) { onChange(); text = 'Potion station built.'; } }
    else if (action.type === 'buy') { ok = buyPersonalUpgrade(profile, selected); if (ok) { onProfileChange(); text = selected === 'quickSearch' ? 'Upgrade owned.' : 'Recipe unlocked.'; } }
    else { const crafted = craftForSack(camp, getLoot(), selected, profile); ok = !!crafted; if (ok) { onChange(); text = crafted.destination === 'sack' ? 'In sack' : 'In shared stash · sack full'; } }
    refresh(); confirm(ok, text);
  }
  function beginBookHold(){
    const action=stationActionState(camp,profile,mode,selected);
    if(bookHold||pending||tools||guideOpen||!dialog.open||!action||action.disabled||!['buy','build-potion-station'].includes(action.type))return;
    const started=Date.now(),selection=selected,kind=action.type;
    bookHold={progress:setInterval(()=>{if(!dialog.open||el('station-book').hidden){cancelBookHold();return;}fillBook(`${Math.min(100,(Date.now()-started)/10)}%`);},16),finish:setTimeout(()=>{
      const current=stationActionState(camp,profile,mode,selected);cancelBookHold();
      if(dialog.open&&!tools&&!guideOpen&&selected===selection&&current?.type===kind)bookAction(true);
    },1000)};
  }
  el('book-action').addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const action=stationActionState(camp,profile,mode,selected);skipBookClick=!!action&&['buy','build-potion-station'].includes(action.type);
    if(skipBookClick){event.preventDefault();el('book-action').setPointerCapture?.(event.pointerId);beginBookHold();}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el('book-action').addEventListener(type,cancelBookHold);
  el('book-action').addEventListener('contextmenu',event=>event.preventDefault());
  el('book-action').addEventListener('click',event=>{if(event.detail>1)return;if(skipBookClick){skipBookClick=false;return;}bookAction();});
  const releaseBook=event=>{if(!event||['KeyE','Enter','Space'].includes(event.code)){bookKeyHeld=false;cancelBookHold();}};
  el('station-book').addEventListener('keydown',event=>{
    if(!['KeyW','KeyA','KeyS','KeyD','KeyE','Enter','Space'].includes(event.code))return;
    event.preventDefault();event.stopPropagation?.();if(event.repeat||pending||tools||guideOpen)return;
    if(['KeyE','Enter','Space'].includes(event.code)){if(bookKeyHeld)return;bookKeyHeld=true;const action=stationActionState(camp,profile,mode,selected);if(['buy','build-potion-station'].includes(action?.type))beginBookHold();else bookAction();return;}
    const choices=STATION_CHOICES[mode]??[],columns=Number(el('book-choices').dataset.columns)||(window.matchMedia?.('(max-width:380px)').matches?2:3);
    const next=choices.indexOf(selected)+({KeyW:-columns,KeyA:-1,KeyS:columns,KeyD:1}[event.code]);
    if(next>=0&&next<choices.length){cancelBookHold();selected=choices[next];details=false;refreshBook();el(`choose-${selected}`).focus();}
  });
  el('station-book').addEventListener('keyup',releaseBook);
  el('station-book').addEventListener('focusout',event=>{if(!el('station-book').contains?.(event.relatedTarget))releaseBook();});
  window.addEventListener?.('gamecontrolsreset',()=>releaseBook());window.addEventListener?.('keyup',releaseBook);window.addEventListener?.('blur',()=>releaseBook());
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)releaseBook();});
  el('book-info').addEventListener('click', () => { details = !details; refreshBook(); });
  el('stash-info').addEventListener('click', () => {});
  el('stash-action').addEventListener('click', () => { if (mode !== 'stash' || pending) return; if (source === 'stash') grid.activate(); else sackGrid.activate(); });
  el('stash-close').addEventListener('click',()=>close());
  el('station-guide').addEventListener('click', () => { guideOpen = !guideOpen; tools = false; status.textContent = ''; refresh(); });
  el('station-tools').addEventListener('click', () => { if (mode === 'campfire' || commands && !debugSupplies) return; tools = !tools; guideOpen = false; status.textContent = ''; refresh(); });
  for (const type of ['snare','smoke','lunch','dart','bell','disguise','vanish','lucky','orb','berries']) el(`debug-pack-${type}`).addEventListener('click', () => {
    if (mode === 'campfire') return;
    if (commands) { if (debugSupplies) commands({ type:'debug-pack', item:type }); return; }
    const ok = !!takeStashItem(camp, getLoot(), type, true); if (ok) onChange(); refresh(); confirm(ok, ok ? 'Test item packed.' : 'Sack full.');
  });
  const close = () => { releaseBook();passives.cancel(); grid.reset(); dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => {
    if (event.code === 'KeyQ' && ['stash-grid','lair-sack-grid'].includes(event.target.id)) {
      event.preventDefault(); event.stopPropagation?.(); source = event.target.id === 'stash-grid' ? 'sack' : 'stash'; el(source === 'stash' ? 'stash-grid' : 'lair-sack-grid').focus(); refreshStashAction();
    }
    if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); if (!event.repeat) close(); }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }); el('close-lair').addEventListener('click', close);
  return { refresh, receiveFeedback(message) {
    if (!pending || pending.type !== message.action) return;
    if (!message.ok) { pending = null; status.textContent = 'Action unavailable · shared state refreshed.'; }
    else pending.acknowledged = true;
    refresh();
  }, open(kind) {
    releaseBook();skipBookClick=false;
    mode = kind; selected = STATION_CHOICES[kind]?.[0] ?? 'snare'; source = 'stash'; tools = false; guideOpen = false; details = false; stashDetails = false; pending = null;
    dialog.dataset.mode = kind; el('lair-title').textContent = { potion:'Potion station', craft:'Workbench', campfire:'Campfire', stash:'Lair stash' }[kind];
    el('stash-close').setAttribute('aria-label',`Close ${el('lair-title').textContent}`);
    el('lair-eyebrow').textContent = 'GREEN TEAM'; el('lair-description').textContent = '';
    status.textContent = ''; grid.reset(); sackGrid.reset(); source = 'stash'; refresh(); dialog.showModal();
    if (kind === 'campfire') passives.open(); else el(kind === 'stash' ? 'stash-grid' : 'book-action').focus();
  } };
}
