import { commonFinds, RESOURCE_PROFILES } from './resource-profiles.js';
import { selectJob, jobSummary } from './jobs.js';
import { drawStationSprite } from './station-art.js';
import { LOOT_TYPES } from './loot.js';
import { drawInventoryGrid } from './inventory-grid.js';

export function createMapPlanningView(dialog, onConfirm, getCurrent, getBag = () => [], onCancel = () => {}) {
  const get = id => document.querySelector(`#${id}`);
  const jobChoice = get('job-choice'), difficulty = get('difficulty-choice'), start = get('confirm-job');
  const routeIds = ['manor', 'hold', 'sanctuary'];
  const refresh = () => {
    const job = selectJob(jobChoice.value, difficulty.value), current = getCurrent();
    const same = job && current.jobId === job.jobId && current.difficultyId === job.difficultyId;
    start.disabled = !job || same; start.textContent = same ? 'Route set ✓' : 'Set route';
    get('job-common-finds').textContent = job ? `Common finds: ${commonFinds(job.jobId)}` : '';
    get('job-preview').textContent = job ? `${job.jobName} · ${job.difficultyName}. ${jobSummary(job)} Common finds are more frequent, not exclusive. Set the route, then board at the minecart.` : 'Choose a valid route.';
    get('route-risk').textContent=job?.extraGuards?`+${job.extraGuards} guards · +${Math.round((job.goldMultiplier-1)*100)}% sale value · rarer loot more likely`:'Standard guards and rewards';
    get('route-status').textContent = job ? `${job.jobName} · ${job.difficultyName}` : '';
    for (const id of routeIds) {
      get(`route-${id}`).setAttribute('aria-pressed', String(jobChoice.value === id));
      get(`route-${id}`).setAttribute('aria-label',`${selectJob(id,'normal').jobName}${current.jobId===id?', current route':''}`);
      get(`route-current-${id}`).textContent = current.jobId === id ? '✓' : '';
    }
    for (const id of ['normal', 'hard']) get(`route-${id}`).setAttribute('aria-pressed', String(difficulty.value === id));
    const finds = get('route-finds'); finds.replaceChildren();
    for (const type of RESOURCE_PROFILES[job?.jobId]?.common ?? []) {
      const row = document.createElement('span'), icon = document.createElement('canvas'), name = document.createElement('span');
      icon.width = 32; icon.height = 40; icon.setAttribute('aria-hidden', 'true'); drawStationSprite(icon, type);
      name.textContent = LOOT_TYPES[type].name; row.append(icon, name); finds.append(row);
    }
  };
  const cancel = () => { dialog.close(); onCancel(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  get('close-map').addEventListener('click', cancel);
  jobChoice.addEventListener('change', refresh); difficulty.addEventListener('change', refresh);
  for (const id of routeIds) {
    drawRouteLandscape(get(`route-art-${id}`), id);
    get(`route-${id}`).addEventListener('click', () => { jobChoice.value = id; refresh(); });
  }
  for (const id of ['normal', 'hard']) get(`route-${id}`).addEventListener('click', () => { difficulty.value = id; refresh(); });

  dialog.addEventListener('keydown',event=>{if(event.code==='KeyE'){event.preventDefault();event.stopPropagation?.();if(!event.repeat&&!start.disabled)start.click();}});
  start.addEventListener('click', () => {
    if (start.disabled) return;
    const job = selectJob(jobChoice.value, difficulty.value);
    if (!job || onConfirm(job) === false) { refresh(); return; }
    dialog.close();
  });
  return { open() { const selected = getCurrent(); jobChoice.value = selected.jobId; difficulty.value = selected.difficultyId; get('job-preview').hidden = true; refresh(); dialog.showModal(); get(`route-${selected.jobId}`).focus(); } };
}

// Render snapshots only; the existing solo/server cart owns seats and timing.
export function createDepartureView(dialog, getState, onToggle, onClose = () => {}, { network = false } = {}) {
  const get = id => document.querySelector(`#${id}`), button = get('departure-board');
  let pending = false, pendingSeat = false, rosterSignature = '', bagSignature = '', route = '';
  const seated = state => state.cart.aboard instanceof Set ? state.cart.aboard.has(state.selfId) : state.cart.aboard.includes(state.selfId);
  function refresh() {
    if (!dialog.open) return;
    const state = getState();
    if (!state?.cart || state.active === false || state.cart.launched) { dialog.close(); pending = false; onClose(); return; }
    const { cart, selfId, bag = [], players = [] } = state, aboard = seated(state);
    if (pending && aboard !== pendingSeat) pending = false;
    button.textContent = aboard ? 'Hop out' : 'Board'; button.disabled = pending;
    get('close-departure').disabled = pending;
    const seats = cart.aboard instanceof Set ? [...cart.aboard] : cart.aboard;
    get('departure-count').textContent = `${seats.length} / ${cart.participants.length}`;
    get('departure-status').textContent = cart.countdown !== null ? `Leaving in ${Math.ceil(cart.countdown)}…` : aboard ? 'Waiting for the team' : 'Ready to board';
    get('departure-route').textContent = cart.selection.jobName; get('departure-level').textContent = cart.selection.difficultyName;
    if (route !== cart.selection.jobId) { route = cart.selection.jobId; drawRouteLandscape(get('departure-art'), route); }
    const members = cart.participants.map(id => ({ id, name: id === selfId ? 'You' : players.find(p => p.id === id)?.name ?? 'Goblin', aboard: seats.includes(id) }));
    const nextRoster = JSON.stringify(members);
    if (nextRoster !== rosterSignature) {
      rosterSignature = nextRoster; const roster = get('departure-roster'); roster.replaceChildren();
      for (const member of members) {
        const entry = document.createElement('div'), image = document.createElement('img'), name = document.createElement('strong'), status = document.createElement('small');
        entry.className = 'departure-goblin'; image.src = 'assets/goblin.png'; image.alt = ''; image.width = 48; image.height = 48;
        name.textContent = member.name; status.textContent = member.aboard ? '✓ Aboard' : 'Not aboard'; entry.append(image, name, status); roster.append(entry);
      }
    }
    const nextBag = JSON.stringify(bag);
    if (nextBag !== bagSignature) {
      bagSignature = nextBag; const canvas = get('departure-sack'); canvas.width = 168; canvas.height = 168;
      drawInventoryGrid(canvas.getContext('2d'), 3, 3, 56, bag, null, null, { book: true });
      canvas.setAttribute('aria-label', `Your packed sack: ${bag.length ? bag.map(item => LOOT_TYPES[item.type]?.name ?? item.type).join(', ') : 'empty'}`);
    }
  }
  function toggle(event) {
    if (pending || event?.detail > 1 || event?.repeat) return;
    const state = getState(); if (!state?.cart || state.active === false || state.cart.launched) return;
    pendingSeat = seated(state); pending = network; button.disabled = pending;
    if (onToggle() === false) pending = false;
    refresh();
  }
  function close() {
    if (pending) return;
    // Returning to the lair is independent of your seat. Hop out explicitly cancels readiness.
    dialog.close(); onClose();
  }
  button.addEventListener('click', toggle);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  get('close-departure').addEventListener('click', close);
  get('departure-info').addEventListener('click', () => { const details = get('departure-details'); details.hidden = !details.hidden; get('departure-info').setAttribute('aria-expanded', String(!details.hidden)); });
  dialog.addEventListener('keydown', event => { if (event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) toggle(event); } });
  return {
    open() { pending = false; get('departure-details').hidden = true; get('departure-info').setAttribute('aria-expanded','false'); dialog.showModal(); refresh(); button.focus(); },
    refresh,
    close() { pending = false; dialog.close(); },
    receiveFeedback(message) { if (message.action === 'board' && message.ok === false) { pending = false; refresh(); } }
  };
}

export function drawRouteLandscape(canvas,type){
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  r(0,0,96,60,type==='hold'?'#929980':type==='sanctuary'?'#b6c19b':'#bec3a0');
  r(0,36,96,24,'#7c8c5c');r(0,49,96,11,'#62744c');
  if(type==='manor'){
   r(30,22,40,26,'#7c7e65');r(33,24,34,21,'#a7a289');r(25,17,14,32,'#7c7e65');r(60,17,14,32,'#7c7e65');
   r(24,14,16,6,'#786449');r(27,10,10,5,'#786449');r(59,14,16,6,'#786449');r(62,10,10,5,'#786449');r(37,18,24,6,'#786449');
   r(44,34,10,15,'#454e3b');r(30,24,4,6,'#454e3b');r(65,24,4,6,'#454e3b');r(39,28,4,5,'#ddd1a4');r(55,28,4,5,'#ddd1a4');r(43,49,14,11,'#b6a87e');
   for(const x of [6,82]){r(x+3,28,3,22,'#756347');r(x,28,10,13,'#526847');r(x+2,22,6,7,'#526847');}
  }else if(type==='hold'){
   r(0,21,15,27,'#707960');r(7,12,23,36,'#707960');r(24,18,24,30,'#81876d');r(50,10,24,38,'#707960');r(72,19,24,30,'#81876d');r(37,24,28,28,'#666c59');r(43,30,17,23,'#283c32');r(45,33,13,19,'#405043');r(33,49,36,6,'#a29a78');r(19,41,7,5,'#b58b53');r(75,36,7,5,'#b58b53');r(49,35,5,10,'#b29e68');r(44,55,16,5,'#b6a87e');
  }else{
   for(const[x,y]of [[8,7],[26,2],[69,4],[83,12]]){r(x+4,y+13,4,34,'#7b7858');r(x,y+8,13,20,'#6b8758');r(x+3,y,7,13,'#6b8758');}
   r(36,23,27,25,'#afb49a');r(39,18,21,6,'#afb49a');r(43,14,13,5,'#afb49a');r(41,28,5,20,'#627a57');r(53,28,5,20,'#627a57');r(38,46,23,5,'#d0ccaa');r(44,51,12,9,'#c7b989');r(20,51,4,3,'#b78aa1');r(74,49,4,3,'#b78aa1');
  }
 }
