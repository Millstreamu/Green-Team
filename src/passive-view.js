import { createFillingStationGrid } from './station-grid.js';
import { PASSIVE_IDS, PASSIVE_LIMIT, PERSONAL_UPGRADES, ownsUpgrade, activePassives, passiveActive } from './profile.js';
import { ABILITY_WORDS, fillMenuWords } from './menu-words.js';
import { drawStationSprite } from './station-art.js';
const PASSIVE_SPRITES = {panicSprint:'sprint',hideSense:'sense',searchVeil:'veil',quickSearch:'quickSearch',quietHands:'vanish',luckyGoblin:'coin',hidingAnchor:'anchor',shadowStillness:'shadow',extraHeart:'heart',haggler:'haggle',treasureBearing:'bearing',crateTrap:'crateTrap',sackSacrifice:'sacrifice'};
export const PASSIVE_DETAILS = Object.freeze(Object.fromEntries(Object.entries(PASSIVE_SPRITES).map(([id,sprite])=>[id,{sprite,effect:fillMenuWords(ABILITY_WORDS[id].effect,id),limits:fillMenuWords(ABILITY_WORDS[id].limits,id)}])));
export function createPassiveView(dialog, profile, onAction) {
 const get=id=>document.querySelector(`#${id}`);let selected=0,pending=false,hold=null,keyHeld=false,suppressClick=null;
 const abilityGrid=createFillingStationGrid(get('passive-grid'),()=>PASSIVE_IDS.length,{className:'passive-placeholder',label:'Reserved for future abilities'});
 function refresh(waiting=false){
  pending=waiting;abilityGrid.refresh();
  if(pending || dialog.hidden)cancelHold();
  get('passive-slots').textContent=`${activePassives(profile).length} / ${PASSIVE_LIMIT} active`;
  PASSIVE_IDS.forEach((id,index)=>{
   const button=get(`passive-${id}`),owned=ownsUpgrade(profile,id),active=passiveActive(profile,id);
   button.setAttribute('aria-pressed',String(active));button.dataset.active=String(active);button.dataset.highlighted=String(selected===index);
   button.tabIndex=selected===index?0:-1;button.disabled=pending;
   get(`passive-tick-${id}`).textContent=active?'✓':'';
   
   button.setAttribute('aria-label',`${PERSONAL_UPGRADES[id].name}. ${owned?(active?'Active; deactivate':'Unlocked; activate'):`Locked; hold to unlock for ${PERSONAL_UPGRADES[id].cost} XP`}`);
  });
  const id=PASSIVE_IDS[selected],info=PASSIVE_DETAILS[id],owned=ownsUpgrade(profile,id),active=passiveActive(profile,id);
  get('passive-title').textContent=PERSONAL_UPGRADES[id].name;
  drawStationSprite(get('passive-sprite'),info.sprite);
  get('passive-effect').textContent=info.effect;get('passive-limits').textContent=info.limits;
  const full=activePassives(profile).length>=PASSIVE_LIMIT;
  get('passive-state').textContent=pending?'Waiting…':!owned?'Hold to unlock':active?'Deactivate':full?'Slots full':'Activate';
  get('passive-price').textContent=!owned?`${PERSONAL_UPGRADES[id].cost} XP${profile.xp<PERSONAL_UPGRADES[id].cost?' · Need more XP':''}`:!active&&full?'Deactivate an ability first':'';
  get('passive-key').style.opacity=pending||(!owned&&profile.xp<PERSONAL_UPGRADES[id].cost)||owned&&!active&&full?'.45':'1';
 }
 function select(index,focus=false){if(index!==selected)cancelHold();selected=index;refresh(pending);if(focus)get(`passive-${PASSIVE_IDS[selected]}`).focus();}
 function activate(){
  if(pending)return;
  const id=PASSIVE_IDS[selected],owned=ownsUpgrade(profile,id);
  if(!owned&&profile.xp<PERSONAL_UPGRADES[id].cost)return;
  if(owned&&!passiveActive(profile,id)&&activePassives(profile).length>=PASSIVE_LIMIT)return;
  onAction(owned?{type:'set-passive',upgrade:id,active:!passiveActive(profile,id)}:{type:'buy',upgrade:id});
 }
 function showHold(value){const style=get('passive-key').style;if(style.setProperty)style.setProperty('--hold',value);else style['--hold']=value;}
 function cancelHold(){
  if(hold){clearTimeout(hold.finish);clearInterval(hold.progress);hold=null;}
  showHold('0%');
 }
 function startHold(pointer=false){
  const id=PASSIVE_IDS[selected];
  if(hold||pending||dialog.hidden||ownsUpgrade(profile,id)||profile.xp<PERSONAL_UPGRADES[id].cost)return;
  const started=Date.now();
  hold={id,progress:setInterval(()=>{
   if(dialog.hidden){cancelHold();return;}
   showHold(`${Math.min(100,(Date.now()-started)/10)}%`);
  },16),finish:setTimeout(()=>{
   if(!hold||hold.id!==PASSIVE_IDS[selected]||dialog.hidden){cancelHold();return;}
   if(pointer)suppressClick=id;cancelHold();activate();
  },1000)};
 }
 PASSIVE_IDS.forEach((id,index)=>{
  const button=get(`passive-${id}`);
  drawStationSprite(get(`passive-icon-${id}`),PASSIVE_DETAILS[id].sprite);
  button.addEventListener('focus',()=>select(index));
  button.addEventListener('pointerenter',()=>{if(!pending)select(index);});
  button.addEventListener('pointerdown',event=>{
   if(pending||event.button!==0)return;
   suppressClick=null;select(index);button.focus();
   if(!ownsUpgrade(profile,id)){event.preventDefault();button.setPointerCapture?.(event.pointerId);startHold(true);}
  });
  button.addEventListener('pointerup',cancelHold);
  button.addEventListener('pointercancel',cancelHold);
  button.addEventListener('lostpointercapture',cancelHold);
  button.addEventListener('contextmenu',event=>event.preventDefault());
  button.addEventListener('click',event=>{
   if(event.detail>1)return;select(index);
   if(suppressClick===id){suppressClick=null;return;}
   if(ownsUpgrade(profile,id))activate();
  });
 });
 dialog.addEventListener('keydown',event=>{
  if(!['KeyW','KeyA','KeyS','KeyD','KeyE','Enter','Space'].includes(event.code))return;
  event.preventDefault();event.stopPropagation?.();if(event.repeat||pending)return;
  if(['KeyE','Enter','Space'].includes(event.code)){
   if(keyHeld)return;keyHeld=true;
   if(ownsUpgrade(profile,PASSIVE_IDS[selected]))activate();else startHold();return;
  }
  const columns=Number(get('passive-grid').dataset.columns)||(window.matchMedia?.('(max-width:480px)').matches?2:3);
  const step={KeyW:-columns,KeyS:columns,KeyA:-1,KeyD:1}[event.code],next=selected+step;
  if(next>=0&&next<PASSIVE_IDS.length)select(next,true);
 });
 function release(event){if(!event||['KeyE','Enter','Space'].includes(event.code)){keyHeld=false;cancelHold();}}
 dialog.addEventListener('keyup',release);
 dialog.addEventListener('focusout',event=>{if(!dialog.contains?.(event.relatedTarget))release();});
 window.addEventListener?.('keyup',release);
 window.addEventListener?.('blur',()=>release());
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)release();});
 return {refresh,cancel(){release();suppressClick=null;},open(){release();suppressClick=null;selected=0;refresh(false);get(`passive-${PASSIVE_IDS[0]}`).focus();}};
}
