import test from 'node:test';
import assert from 'node:assert/strict';
import { createStashGrid } from '../src/stash-view.js';
import { createLairView } from '../src/lair-view.js';
import { createMapPlanningView } from '../src/loadout-view.js';
import { createCamp, syncStashSlots } from '../src/lair.js';
import { createProfile, knowsRecipe, ownsUpgrade } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';

function fixture(t, coarse = true) {
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date']});
  class Element {
    listeners = {}; attrs = {}; dataset = {}; style = {setProperty(key,value){this[key]=value;}}; children = []; value = ''; open = false;
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    send(type, props = {}) { for (const fn of this.listeners[type] ?? []) fn({ target: this, button: 0, code: '', preventDefault() {}, stopPropagation() {}, ...props }); }
    setAttribute(key, value) { this.attrs[key] = value; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    focus() { this.focused = true; }
    click(){this.send('click');}
    show() { this.open = true; this.nonModal = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getContext() { return new Proxy({}, { get: () => () => {} }); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 300 }; }
  }
  const oldDoc = globalThis.document, oldWin = globalThis.window;
  t.after(() => { globalThis.document = oldDoc; globalThis.window = oldWin; });
  const elements = new Map(), get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  globalThis.document = { querySelector: selector => get(selector.slice(1)), createElement: () => new Element() };
  globalThis.window = { matchMedia: () => ({ matches: coarse }) };
  return { get, setCoarse: value => { coarse = value; } };
}

function holdBook(get,t){get('station-book').send('keydown',{code:'KeyE'});t.mock.timers.tick(1000);get('station-book').send('keyup',{code:'KeyE'});}

test('touch stash pages select actual source slots before an explicit transfer and move whole stacks across pages', t => {
  const { get, setCoarse } = fixture(t), camp = createCamp(), taken = [];
  camp.counts.ruby = 2; camp.slots[16] = 'ruby'; syncStashSlots(camp);
  const grid = createStashGrid(get('stash-grid'), camp, () => {}, type => taken.push(type));
  grid.paint(); assert.equal(get('stash-grid').width, 168); assert.equal(get('stash-page-controls').hidden, false);
  get('stash-page-next').send('click'); assert.equal(get('stash-page-label').textContent, '2 / 4');
  get('stash-grid').send('pointerdown', { pointerType: 'touch', clientX: 150, clientY: 250 });
  assert.deepEqual(taken, []); assert.match(get('stash-selection').textContent, /Ruby × 2/);
  grid.activate(); assert.deepEqual(taken, ['ruby']);
  grid.beginMove(); get('stash-page-next').send('click'); grid.activate();
  assert.equal(camp.slots[16], null); assert.equal(camp.slots[18], 'ruby'); assert.equal(camp.counts.ruby, 2);
  setCoarse(false); grid.paint(); assert.equal(get('stash-grid').width, 336); assert.equal(get('stash-page-controls').hidden, true);
});

test('book action transforms unlock to craft and campfire slot unlocks then activates', t => {
 const {get}=fixture(t),camp=createCamp(),profile=createProfile('tester'),loot={bag:[],held:null};profile.xp=profile.earnedXp=100;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});
 view.open('craft');get('choose-smoke').send('click');assert.equal(get('book-action').textContent,'Hold to unlock');assert.equal(get('book-action-note').textContent,'50 XP');
 holdBook(get,t);assert.equal(profile.xp,50);assert.ok(knowsRecipe(profile,'smoke'));assert.equal(get('book-action').textContent,'Missing ingredients');assert.equal(get('book-action').disabled,true);
 camp.counts.cloth=2;view.refresh();assert.equal(get('book-action').disabled,false);get('book-action').send('click');assert.equal(loot.bag[0].type,'smoke');assert.equal(profile.xp,50);assert.equal(camp.counts.cloth,0);
 get('book-info').send('click');assert.equal(get('book-details').hidden,false);
 view.open('campfire');get('station-passives').send('keydown',{code:'KeyE'});t.mock.timers.tick(1000);get('station-passives').send('keyup',{code:'KeyE'});assert.equal(profile.xp,20);assert.ok(ownsUpgrade(profile,'quickSearch'));assert.equal(get('station-book').hidden,true);assert.equal(get('passive-quickSearch').attrs['aria-pressed'],'false');get('passive-quickSearch').send('click');assert.equal(get('passive-quickSearch').attrs['aria-pressed'],'true');
 get('book-action').send('click');assert.equal(profile.xp,20);
});

test('one stash action packs or returns the selected item without manual arrangement',t=>{
 const {get}=fixture(t),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('stash');
 get('stash-grid').send('pointerdown',{pointerType:'touch',clientX:50,clientY:50});assert.equal(loot.bag.length,0);assert.match(get('stash-action').textContent,/Pack/);get('stash-action').send('click');assert.equal(camp.counts.cloth,0);
 get('lair-sack-grid').send('pointerdown',{pointerType:'touch',clientX:50,clientY:50});assert.match(get('stash-action').textContent,/Return/);get('stash-grid').send('pointermove',{pointerType:'mouse',clientX:150,clientY:50});assert.match(get('stash-action').textContent,/Return/,'hover cannot replace an explicit sack selection');get('stash-action').send('click');assert.equal(camp.counts.cloth,1);assert.equal(loot.bag.length,0);
 get('stash-grid').send('pointerdown',{pointerType:'mouse',clientX:50,clientY:50});assert.equal(loot.bag.length,0,'mouse selects without an unexpected transfer');get('stash-move').send('click');assert.match(get('stash-action').textContent,/Pack/);get('stash-move').send('click');assert.match(get('stash-action').textContent,/Pack/);
});

test('map table shows common finds, changes a draft, and keeps rejected confirmation open', t => {
  const { get } = fixture(t), selected = selectJob('manor', 'normal');
  let allow = false, received = null, cancelled = 0;
  const map = createMapPlanningView(get('map-planning'), job => { received = job; return allow; }, () => selected,
    () => [{ type: 'sword', rotation: 0 }], () => cancelled++);
  map.open(); assert.equal(get('job-common-finds').textContent,'Common finds: Meat and Cloth'); assert.equal(get('confirm-job').disabled, true); assert.equal(get('route-finds').children.length,2);
  get('job-choice').value = 'hold'; get('difficulty-choice').value = 'hard'; get('difficulty-choice').send('change');
  assert.match(get('job-preview').textContent, /Dwarf.*Hard/);
  assert.equal(get('job-common-finds').textContent,'Common finds: Metal scrap and Meat');
  get('job-choice').value='sanctuary';get('job-choice').send('change');assert.equal(get('job-common-finds').textContent,'Common finds: Berries and Mushrooms');
  get('job-choice').value='hold';get('job-choice').send('change');
  get('confirm-job').send('click'); assert.equal(get('map-planning').open, true); assert.equal(selected.jobId, 'manor');
  allow = true; get('confirm-job').send('click'); assert.equal(get('map-planning').open, false); assert.equal(received.jobId, 'hold');
  map.open(); assert.equal(get('job-choice').value, 'manor'); get('close-map').send('click'); assert.equal(cancelled, 1);
});


test('potion action builds once, unlocks, then brews with the same control',t=>{
 const {get}=fixture(t),camp=createCamp(),profile=createProfile('brewer'),loot={bag:[],held:null};camp.counts.gold=30;camp.counts.mushroom=camp.counts.berries=1;profile.xp=profile.earnedXp=50;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});
 view.open('potion');assert.equal(get('book-action').textContent,'Hold to build');holdBook(get,t);assert.equal(camp.counts.gold,0);assert.equal(get('book-action').textContent,'Hold to unlock');
 holdBook(get,t);assert.equal(profile.xp,0);assert.equal(get('book-action').textContent,'Brew');get('book-action').send('click');assert.equal(loot.bag[0].type,'disguise');assert.equal(camp.counts.mushroom,0);assert.equal(camp.counts.berries,0);
});

for(const [type,xp,ingredients] of [['vanish',75,{mushroom:2,cloth:1}],['lucky',50,{berries:1,scrap:1}]])test(`${type} uses approved book flow with server-compatible item identities`,t=>{
 const {get}=fixture(t),camp=createCamp(),profile=createProfile(type),loot={bag:[],held:null};profile.xp=profile.earnedXp=xp;camp.buildings.potion=true;Object.assign(camp.counts,ingredients);
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('potion');get(`choose-${type}`).send('click');holdBook(get,t);assert.equal(profile.xp,0);assert.equal(get('book-action').textContent,'Brew');get('book-action').send('click');assert.equal(loot.bag[0].type,type);
});

test('network context action waits for acknowledgement and refreshed state, and rejects double clicks',t=>{
 const {get}=fixture(t),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null},sent=[];profile.xp=profile.earnedXp=50;camp.counts.cloth=2;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{},()=>{},m=>sent.push(m));
 view.open('craft');get('choose-smoke').send('click');holdBook(get,t);get('book-action').send('click');assert.deepEqual(sent,[{type:'buy',upgrade:'smoke'}]);assert.equal(get('book-action').disabled,true);
 view.receiveFeedback({action:'buy',ok:true});assert.equal(get('book-action').disabled,true,'ack cannot guess fresh personal state');profile.xp=0;profile.purchases.push('smoke');view.refresh();assert.equal(get('book-action').textContent,'Craft');assert.equal(get('book-action').disabled,false);
 get('book-action').send('click',{detail:2});assert.equal(sent.length,1,'double click cannot buy and immediately craft');get('book-action').send('click');assert.deepEqual(sent[1],{type:'craft',item:'smoke'});view.receiveFeedback({action:'craft',ok:false});assert.equal(get('book-action').disabled,false);
});

test('departure renders the real sack and team, waits for authoritative seats, and allows a cancelled countdown', async t => {
  const { createDepartureView } = await import('../src/loadout-view.js');
  const { createDeparture, toggleCartSeat, tickDeparture, setDestination } = await import('../src/jobs.js');
  const { get } = fixture(t), cart = createDeparture(['you','friend']);
  let requests = 0, active = true;
  const bag = [{id:'packed',type:'lunch',rotation:0,x:0,y:0}];
  const view = createDepartureView(get('departure-panel'), () => ({cart,selfId:'you',players:[{id:'friend',name:'Moss'}],bag,active}), () => { requests++; return true; }, () => {}, {network:true});
  view.open(); assert.equal(get('departure-board').textContent,'Board');
  assert.match(get('departure-sack').attrs['aria-label'],/Packed Lunch/);
  assert.equal(get('departure-roster').children[1].children[1].textContent,'Moss');
  get('departure-board').send('click'); get('departure-board').send('click'); assert.equal(requests,1);
  view.receiveFeedback({action:'board',ok:true}); view.refresh(); assert.equal(get('departure-board').disabled,true,'ack alone is not a seat change');
  toggleCartSeat(cart,'you'); view.refresh(); assert.equal(get('departure-board').textContent,'Hop out'); assert.equal(get('departure-board').disabled,false);
  toggleCartSeat(cart,'friend'); tickDeparture(cart,.5); view.refresh(); assert.match(get('departure-status').textContent,/Leaving in 3/);
  get('departure-board').send('click'); toggleCartSeat(cart,'you'); view.refresh();
  assert.equal(cart.countdown,null); assert.equal(tickDeparture(cart,10),null); assert.equal(get('departure-board').textContent,'Board');
  setDestination(cart,'hold','hard'); view.refresh(); assert.equal(get('departure-route').textContent,'Dwarf Hold'); assert.equal(get('departure-level').textContent,'Hard');
  get('departure-board').send('click'); view.receiveFeedback({action:'board',ok:false}); assert.equal(get('departure-board').disabled,false);
  get('departure-board').send('click',{detail:2}); assert.equal(requests,3,'a double-click cannot toggle seats again');
  active=false;view.refresh();assert.equal(get('departure-panel').open,false);assert.equal(bag.length,1);
});

test('campfire grid uses WASD highlight and E unlock/activate/deactivate with personal tick states and no book action',t=>{
 const {get}=fixture(t),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};profile.xp=profile.earnedXp=200;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});
 view.open('campfire');assert.equal(get('station-book').hidden,true);assert.equal(get('station-passives').hidden,false);
 assert.equal(get('passive-title').textContent,'Quick fingers');
 get('station-passives').send('keydown',{code:'KeyD'});assert.equal(get('passive-title').textContent,'Quiet Hands');
 assert.equal(get('passive-state').textContent,'Hold to unlock');assert.equal(get('passive-price').textContent,'75 XP');
 get('station-passives').send('keydown',{code:'KeyE'});t.mock.timers.tick(1000);assert.equal(profile.xp,125);assert.deepEqual(profile.activePassives,[]);
 get('station-passives').send('keydown',{code:'KeyE',repeat:true});assert.deepEqual(profile.activePassives,[]);
 get('station-passives').send('keyup',{code:'KeyE'});get('station-passives').send('keydown',{code:'KeyE'});assert.deepEqual(profile.activePassives,['quietHands']);assert.equal(get('passive-tick-quietHands').textContent,'✓');assert.equal(get('passive-quietHands').dataset.active,'true');
 get('passive-quietHands').send('click',{detail:2});assert.deepEqual(profile.activePassives,['quietHands']);
 get('station-passives').send('keyup',{code:'KeyE'});get('station-passives').send('keydown',{code:'KeyE'});assert.deepEqual(profile.activePassives,[]);assert.equal(profile.xp,125);
 view.open('craft');get('choose-lunch').send('click');assert.equal(get('book-title').textContent,'Packed Lunch');assert.equal(get('station-passives').hidden,true);
});

test('raid cargo panel pages shared shapes, explicitly transfers highlighted items and waits for matching private receipts',async t=>{
 const {createRaidCartView}=await import('../src/raid-cart-view.js'),{createRunCart,transferCart,boardRunCart}=await import('../src/run-cart.js');
 const {get}=fixture(t),cart=createRunCart(),loot={bag:[{id:'carried',type:'ruby',x:0,y:0,rotation:0}],held:null};let active=true,sent=[];
 const view=createRaidCartView(get('raid-cart-panel'),()=>({active,cart,bag:loot.bag,selfId:'you'}),message=>{sent.push(message);return true;},()=>{},{network:true});
 view.open();assert.equal(get('raid-cart-pages').hidden,false);assert.equal(get('raid-cart-used').textContent,'0 / 36');
 get('raid-cart-transfer').send('click');assert.equal(sent.at(-1).type,'cart-transfer');assert.equal(loot.bag.length,1);assert.equal(get('raid-cart-transfer').disabled,true);
 get('raid-cart-transfer').send('click');assert.equal(sent.length,1);
 assert.ok(transferCart(cart,loot,sent[0].id,true));view.refresh();assert.equal(get('raid-cart-transfer').disabled,true,'state before receipt cannot unlock another request');
 view.receiveFeedback({feedbackId:sent[0].feedbackId,ok:true});assert.equal(get('raid-cart-used').textContent,'1 / 36');assert.equal(get('raid-cart-board').disabled,false);
 get('raid-cart-grid').send('pointerdown',{clientX:25,clientY:25});assert.equal(get('raid-cart-transfer').textContent,'Stored · no retrieval');get('raid-cart-transfer').send('click');assert.equal(sent.length,1);assert.equal(loot.bag.length,0);
 get('raid-cart-next').send('click');assert.equal(get('raid-cart-page').textContent,'2 / 4');
 get('raid-cart-board').send('pointerdown');t.mock.timers.tick(1000);get('raid-cart-board').send('pointerup');assert.ok(boardRunCart(cart,'you',true));view.receiveFeedback({feedbackId:sent.at(-1).feedbackId,ok:true});assert.equal(get('raid-cart-board').textContent,'E · Hop out');assert.equal(get('raid-cart-transfer').disabled,true);
 get('close-raid-cart').send('click');assert.equal(sent.at(-1).type,'cart-board');assert.equal(sent.at(-1).active,false,'Continue raid cancels boarding');boardRunCart(cart,'you',false);
 view.open();active=false;view.refresh();assert.equal(get('raid-cart-panel').open,false);
});

test('campfire second row supports the new abilities through the same keyboard slots',t=>{
 const {get}=fixture(t,false),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};profile.xp=profile.earnedXp=500;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('campfire');
 get('station-passives').send('keydown',{code:'KeyS'});assert.equal(get('passive-title').textContent,'Panic Sprint');
 get('station-passives').send('keydown',{code:'KeyE'});t.mock.timers.tick(1000);get('station-passives').send('keyup',{code:'KeyE'});get('station-passives').send('keydown',{code:'KeyE'});assert.deepEqual(profile.activePassives,['panicSprint']);
 get('station-passives').send('keydown',{code:'KeyD'});assert.equal(get('passive-title').textContent,'Hideout Sense');assert.match(get('passive-effect').textContent,/nearest guard/);
 get('station-passives').send('keydown',{code:'KeyD'});assert.equal(get('passive-title').textContent,'Fade Away');assert.match(get('passive-limits').textContent,/Completed searches/);
});

test('unlock requires a complete hold; release, selection, cancellation and close spend nothing',t=>{
 const {get}=fixture(t,false),profile=createProfile();profile.xp=profile.earnedXp=500;
 const view=createLairView(get('lair-panel'),createCamp(),profile,()=>({bag:[],held:null}),()=>{},()=>{});
 view.open('campfire');const panel=get('station-passives'),slot=get('passive-quickSearch');
 slot.send('click');assert.equal(profile.xp,500);
 panel.send('keydown',{code:'KeyE'});t.mock.timers.tick(500);assert.notEqual(get('passive-key').style['--hold'],'0%');
 panel.send('keyup',{code:'KeyE'});t.mock.timers.tick(1000);assert.equal(profile.xp,500);assert.equal(get('passive-key').style['--hold'],'0%');
 panel.send('keydown',{code:'KeyE'});t.mock.timers.tick(500);panel.send('keydown',{code:'KeyD'});t.mock.timers.tick(1000);assert.equal(profile.xp,500);panel.send('keyup',{code:'KeyE'});
 slot.send('pointerdown');t.mock.timers.tick(500);slot.send('pointercancel');t.mock.timers.tick(1000);assert.equal(profile.xp,500);
 slot.send('pointerdown');t.mock.timers.tick(500);get('close-lair').send('click');t.mock.timers.tick(1000);assert.equal(profile.xp,500);
 view.open('campfire');slot.send('pointerdown');t.mock.timers.tick(1000);assert.equal(profile.xp,470);assert.deepEqual(profile.activePassives,[]);
 slot.send('pointerup');slot.send('click');assert.deepEqual(profile.activePassives,[],'release click cannot equip newly unlocked ability');
 slot.send('pointerdown');slot.send('pointerup');slot.send('click');assert.deepEqual(profile.activePassives,['quickSearch']);
});

test('cart opens nonmodally: tap E inspects, full hold boards, cancellation and close do not board',async t=>{
 const {createRaidCartView,cartBubbleAnchor}=await import('../src/raid-cart-view.js');const {createRunCart}=await import('../src/run-cart.js');
 const {get}=fixture(t,false),cart=createRunCart(),sent=[];let active=true;
 const view=createRaidCartView(get('raid-cart-panel'),()=>({active,cart,bag:[],selfId:'you'}),m=>{sent.push(m);return true;});
 view.interactDown();assert.equal(get('raid-cart-panel').nonModal,true);t.mock.timers.tick(500);view.releaseHold();t.mock.timers.tick(1000);assert.equal(sent.length,0);
 view.interactDown();t.mock.timers.tick(500);get('raid-cart-board').send('pointercancel');t.mock.timers.tick(1000);assert.equal(sent.length,0);
 view.interactDown();t.mock.timers.tick(500);view.close();t.mock.timers.tick(1000);assert.equal(sent.length,0);
 view.interactDown();t.mock.timers.tick(1000);assert.equal(sent.length,1);assert.equal(sent[0].type,'cart-board');assert.equal(sent[0].active,true);
 view.releaseHold();view.close();view.interactDown();active=false;view.refresh();t.mock.timers.tick(1000);assert.equal(sent.length,1);
 const anchor=cartBubbleAnchor({width:800,height:400,sceneWidth:400,sceneHeight:200,getBoundingClientRect:()=>({width:800,height:400})},{cartProp:{tileX:4,tileY:2}},{x:4.5,y:3});
 assert.equal(anchor.x,400);assert.equal(anchor.y,152);
});

test('cart bubble stays inside the scene above the cart or beside it on short screens',async()=>{
 const {cartBubblePlacement}=await import('../src/raid-cart-view.js');
 const desktop=cartBubblePlacement({x:450,y:430,width:900,height:700},{width:206,height:310});assert.equal(desktop.side,'below');assert.equal(desktop.top,106);
 const phone=cartBubblePlacement({x:422,y:145,width:844,height:390},{width:166,height:270});assert.equal(phone.side,'right');assert.equal(phone.left,236);assert.equal(phone.top,10);
 for(const pos of [desktop,phone])assert.ok(pos.left>=8&&pos.top>=8);
});

test('compact recipe grid reserves future slots and holds cancel before spending or accidentally crafting',t=>{
 const {get}=fixture(t,false),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};profile.xp=profile.earnedXp=200;camp.counts.cloth=5;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('craft');get('choose-smoke').send('click');
 assert.equal(get('choose-smoke').children.length,2,'sprite and lock only');assert.equal(get('choose-smoke').children[1].hidden,false);
 assert.equal(get('book-choices').children.filter(n=>n.className==='book-placeholder'&&!n.hidden).length,6);
 const button=get('book-action');button.send('click');assert.equal(profile.xp,200);
 button.send('pointerdown');t.mock.timers.tick(500);button.send('pointercancel');t.mock.timers.tick(1000);assert.equal(profile.xp,200);button.send('click');
 button.send('pointerdown');t.mock.timers.tick(500);get('choose-bell').send('click');t.mock.timers.tick(1000);assert.equal(profile.xp,200);
 get('choose-smoke').send('click');button.send('pointerdown');t.mock.timers.tick(500);get('station-guide').send('click');t.mock.timers.tick(1000);assert.equal(profile.xp,200);get('station-guide').send('click');
 button.send('pointerdown');t.mock.timers.tick(500);get('close-lair').send('click');t.mock.timers.tick(1000);assert.equal(profile.xp,200);
 view.open('craft');get('choose-smoke').send('click');button.send('pointerdown');t.mock.timers.tick(1000);button.send('pointerup');button.send('click');
 assert.equal(profile.xp,150);assert.equal(loot.bag.length,0);assert.equal(get('choose-smoke').children[1].hidden,true);assert.equal(get('book-action').textContent,'Craft');
 button.send('pointerdown');button.send('pointerup');button.send('click');assert.equal(loot.bag[0].type,'smoke');assert.equal(camp.counts.cloth,3);
 view.open('potion');assert.equal(get('book-choices').children.filter(n=>n.className==='book-placeholder'&&!n.hidden).length,9);
});

test('recipe ingredients give available/required counts, missing markers and keyboard selection',t=>{
 const {get}=fixture(t,false),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('craft');
 get('station-book').send('keydown',{code:'KeyS'});assert.equal(get('book-title').textContent,'Clang bell');
 get('choose-lunch').send('click');const rows=get('book-materials').children;assert.equal(rows.length,2);assert.ok(rows.every(r=>r.children.length===2));assert.ok(rows.some(r=>r.dataset.missing==='true'));assert.ok(rows.every(r=>r.attrs['aria-label'].includes('required')));
 assert.equal(get('book-action').textContent,'Missing ingredients');assert.equal(get('book-action').disabled,true);
});

test('native focus selects the intended recipe and a changed shared build cost cannot spend stale gold',t=>{
 const {get}=fixture(t,false),camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};profile.xp=profile.earnedXp=200;camp.counts.gold=30;
 const view=createLairView(get('lair-panel'),camp,profile,()=>loot,()=>{},()=>{});view.open('craft');get('choose-dart').send('focus');assert.equal(get('book-title').textContent,'Sleep dart');
 get('station-book').send('keydown',{code:'KeyE'});t.mock.timers.tick(1000);get('station-book').send('keyup',{code:'KeyE'});assert.ok(knowsRecipe(profile,'dart'));assert.equal(knowsRecipe(profile,'smoke'),false);
 view.open('potion');get('book-action').send('pointerdown');t.mock.timers.tick(500);camp.counts.gold=0;view.refresh();t.mock.timers.tick(1000);get('book-action').send('pointerup');assert.equal(camp.buildings.potion,false);assert.equal(camp.counts.gold,0);
});

test('campfire gets future slots and both keyboards follow the measured column count',t=>{
 const {get}=fixture(t,false),profile=createProfile();const view=createLairView(get('lair-panel'),createCamp(),profile,()=>({bag:[],held:null}),()=>{},()=>{});
 view.open('campfire');assert.equal(get('passive-grid').children.filter(n=>n.className==='passive-placeholder'&&!n.hidden).length,5);
 get('passive-grid').dataset.columns='4';get('station-passives').send('keydown',{code:'KeyS'});assert.equal(get('passive-title').textContent,'Hideout Sense');
 view.open('craft');get('book-choices').dataset.columns='4';get('station-book').send('keydown',{code:'KeyS'});assert.equal(get('book-title').textContent,'Scrying orb');
 get('station-book').send('keydown',{code:'KeyD'});assert.equal(get('book-title').textContent,'Packed Lunch');get('station-book').send('keydown',{code:'KeyD'});assert.equal(get('book-title').textContent,'Packed Lunch');
});

test('WASD crosses between facing grid edges and return states show the full quantity',t=>{
 const {get}=fixture(t,false),camp=createCamp(),loot={bag:[{id:'coins',type:'coin',x:0,y:0,rotation:0,count:3}],held:null};
 const view=createLairView(get('lair-panel'),camp,createProfile(),()=>loot,()=>{},()=>{});view.open('stash');
 for(let i=0;i<6;i++)get('stash-grid').send('keydown',{code:'KeyD'});
 assert.equal(get('lair-sack-grid').focused,true);assert.equal(get('stash-action').textContent,'← Return ×3');
 get('lair-sack-grid').send('keydown',{code:'KeyE'});assert.equal(camp.counts.coin,3);assert.equal(loot.bag.length,0);
 get('lair-sack-grid').send('keydown',{code:'KeyA'});assert.equal(get('stash-grid').focused,true);assert.equal(get('stash-action').textContent,'Pack 1 →');
});

test('phone navigation uses the visible stash page, then crosses and returns to the same page',t=>{
 const {get}=fixture(t,true),camp=createCamp();camp.slots=Array(36).fill(null);camp.slots[11]='cloth';camp.counts.cloth=3;
 const view=createLairView(get('lair-panel'),camp,createProfile(),()=>({bag:[],held:null}),()=>{},()=>{});view.open('stash');get('stash-page-next').send('click');
 get('stash-grid').send('keydown',{code:'KeyD'});get('stash-grid').send('keydown',{code:'KeyD'});assert.equal(get('stash-action-name').textContent,'Select an item');
 get('stash-grid').send('keydown',{code:'KeyD'});assert.equal(get('lair-sack-grid').focused,true);
 get('lair-sack-grid').send('keydown',{code:'KeyA'});assert.equal(get('stash-page-label').textContent,'2 / 4');assert.equal(get('stash-action-name').textContent,'Select an item');
});

test('stash fit reasons and network pending feedback do not guess shared transfers',t=>{
 const {get}=fixture(t,false),camp=createCamp(),loot={bag:[],held:null},sent=[];
 const view=createLairView(get('lair-panel'),camp,createProfile(),()=>loot,()=>{},()=>{},()=>{},m=>sent.push(m));view.open('stash');get('stash-action').send('click');assert.equal(sent.length,1);assert.equal(loot.bag.length,0);assert.equal(get('stash-action').disabled,true);
 view.receiveFeedback({action:'take',ok:false});assert.equal(loot.bag.length,0);
 loot.bag=Array.from({length:9},(_,i)=>({id:'f'+i,type:'ruby',x:i%3,y:Math.floor(i/3),rotation:0}));view.refresh();assert.equal(get('stash-action').textContent,'Won’t fit');assert.equal(get('stash-action').disabled,true);
});

test('stash sorts by display name and preserves selected type through peer stock changes',t=>{
 const {get}=fixture(t,true),camp=createCamp(),loot={bag:[],held:null};const beforeSlots=[...camp.slots];
 const view=createLairView(get('lair-panel'),camp,createProfile(),()=>loot,()=>{},()=>{});view.open('stash');
 get('stash-grid').send('pointerdown',{clientX:50,clientY:50});assert.equal(get('stash-action-name').textContent,'Cloth');
 get('stash-grid').send('pointerdown',{clientX:150,clientY:50});assert.equal(get('stash-action-name').textContent,'Metal scrap');assert.deepEqual(camp.slots,beforeSlots,'display sorting does not rewrite shared saved slot positions');
 camp.counts.bell=1;view.refresh();assert.equal(get('stash-action-name').textContent,'Metal scrap','a peer adding an earlier item must not change the selected transfer');
 get('stash-action').send('click');assert.equal(loot.bag[0].type,'scrap');
 get('stash-grid').send('pointerdown',{clientX:50,clientY:50});assert.equal(get('stash-action-name').textContent,'Clang bell');
 get('stash-close').send('click');assert.equal(get('lair-panel').open,false);
});

test('packing the last alphabetical stack clears selection instead of packing the next item',t=>{
 const {get}=fixture(t,true),camp=createCamp(),loot={bag:[],held:null};const view=createLairView(get('lair-panel'),camp,createProfile(),()=>loot,()=>{},()=>{});view.open('stash');
 get('stash-grid').send('pointerdown',{clientX:50,clientY:50});assert.equal(get('stash-action-name').textContent,'Cloth');get('stash-action').send('click');assert.equal(loot.bag[0].type,'cloth');assert.equal(get('stash-action-name').textContent,'Select an item');assert.equal(get('stash-action').disabled,true);
 get('stash-grid').send('keydown',{code:'KeyE'});assert.equal(loot.bag.length,1);
});


test('map shows the difficulty tradeoff and E applies once while X cancels a draft',t=>{
 const {get}=fixture(t,false);let current=selectJob('manor','normal'),sets=0;
 const map=createMapPlanningView(get('map-planning'),job=>{current=job;sets++;return true;},()=>current);
 map.open();get('route-hold').send('click');get('route-hard').send('click');assert.match(get('route-risk').textContent,/2 guards.*50%/);assert.equal(get('route-current-manor').textContent,'✓');
 get('map-planning').send('keydown',{code:'KeyE',repeat:true});assert.equal(sets,0);
 get('map-planning').send('keydown',{code:'KeyE'});assert.equal(sets,1);assert.equal(current.jobId,'hold');assert.equal(current.difficultyId,'hard');assert.equal(get('map-planning').open,false);
 map.open();get('route-sanctuary').send('click');get('close-map').send('click');assert.equal(sets,1);assert.equal(current.jobId,'hold');assert.equal(get('map-planning').open,false);
});

test('top-left close works for each station and selected recipe limits remain available',t=>{
 const {get}=fixture(t,false);const view=createLairView(get('lair-panel'),createCamp(),createProfile(),()=>({bag:[],held:null}),()=>{},()=>{});
 for(const kind of ['campfire','craft','potion']){view.open(kind);assert.match(get('stash-close').attrs['aria-label'],/Close/);if(kind!=='campfire'){assert.equal(get('book-details').hidden,false);assert.ok(get('book-details').textContent.length>0);}get('stash-close').send('click');assert.equal(get('lair-panel').open,false);}
});
