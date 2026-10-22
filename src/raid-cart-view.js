import { sceneViewport } from './viewport.js';
import { drawInventoryGrid } from './inventory-grid.js';
import { bagItemAt, itemCells, itemLabel, LOOT_TYPES } from './loot.js';
import { drawStationItem } from './station-item-view.js';
import { CONFIG } from './config.js';
export function drawRaidCart(ctx,prop,ox,oy){
 const x=prop.tileX*CONFIG.tile+ox,y=prop.tileY*CONFIG.tile+oy;
 const rect=(dx,dy,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+dx,y+dy,w,h);};
 rect(2,0,2,24,'#8b8a74');rect(20,0,2,24,'#8b8a74');
 rect(0,4,24,15,'#6e7a74');rect(3,6,18,9,'#26322f');rect(4,14,16,4,'#8c7755');
 rect(1,18,5,5,'#1a2422');rect(18,18,5,5,'#1a2422');
}
export function cartBubbleAnchor(canvas,world,player){
 const bounds=canvas.getBoundingClientRect(),view=sceneViewport(canvas),cart=world.cartProp;
 if(!cart)return null;
 return {x:(view.width/2+(cart.tileX+.5-player.x)*CONFIG.tile)/view.width*bounds.width,
 y:(view.height/2+(cart.tileY-player.y)*CONFIG.tile)/view.height*bounds.height,
 width:bounds.width,height:bounds.height};
}
export function cartBubblePlacement(anchor,size){
 const above=anchor.y>=size.height+22;
 return {left:Math.max(8,Math.min(anchor.width-size.width-8,above?anchor.x-size.width/2:anchor.x-size.width-20)),
 top:Math.max(8,Math.min(anchor.height-size.height-8,above?anchor.y-size.height-14:anchor.y-size.height/2)),side:above?'below':'right'};
}
export function createRaidCartView(dialog,getState,onAction,onClose=()=>{},{network=false,feedback=()=>{}}={}){
 const get=id=>document.querySelector(`#${id}`);let source='bag',cell={x:0,y:0},page=0,pending=null,serial=0,notice='',hold=null;
 const coarse=()=>!!window.matchMedia?.('(any-pointer:coarse)').matches;
 const stamp=s=>JSON.stringify([s.cart.items,s.cart.aboard,s.bag]);
 const selection=s=>bagItemAt(source==='bag'?s.bag:s.cart.items,cell.x,cell.y);
 function paint(id,items,columns,rows,offset={x:0,y:0}){
  const canvas=get(id);canvas.width=columns*56;canvas.height=rows*56;const ctx=canvas.getContext('2d');
  ctx.save();ctx.translate(-offset.x*56,-offset.y*56);
  drawInventoryGrid(ctx,id==='raid-cart-grid'?6:3,id==='raid-cart-grid'?6:3,56,items,source===(id==='raid-cart-grid'?'cart':'bag')?cell:null,null,{book:true});ctx.restore();
 }
 function refresh(){
  if(!dialog.open)return;
  const state=getState();if(!state?.active){close();return;}
  if(pending?.acknowledged&&pending.before!==stamp(state)){pending=null;feedback(true);}
  
  const paged=coarse(),offset=paged?{x:(page%2)*3,y:Math.floor(page/2)*3}:{x:0,y:0};
  paint('raid-cart-grid',state.cart.items,paged?3:6,paged?3:6,offset);paint('raid-cart-sack',state.bag,3,3);
  get('raid-cart-pages').hidden=!paged;get('raid-cart-page').textContent=`${page+1} / 4`;
  get('raid-cart-prev').disabled=page===0;get('raid-cart-next').disabled=page===3;
  get('raid-cart-used').textContent=`${state.cart.items.reduce((n,item)=>n+itemCells(item).length,0)} / 36`;
  const aboard=state.cart.aboard.includes(state.selfId),item=selection(state);
  get('raid-cart-name').textContent=item?itemLabel(item):'Select an item';
  const icon=get('raid-cart-action-icon');icon.dataset.itemType=item?.type??'';
  if(item||!icon.dataset.feedback){icon.width=60;icon.height=60;}
  if(item){const cells=itemCells(item),w=Math.max(...cells.map(c=>c[0]))+1,h=Math.max(...cells.map(c=>c[1]))+1,size=52/Math.max(w,h);drawStationItem(icon.getContext('2d'),{...item,count:undefined},(60-w*size)/2,(60-h*size)/2,size);const snapshot=document.createElement('canvas');snapshot.width=60;snapshot.height=60;snapshot.getContext('2d').drawImage(icon,0,0);icon.feedbackSnapshot=snapshot;}
  const runOnly=source==='bag'&&item&&LOOT_TYPES[item.type].runOnly;get('raid-cart-transfer').textContent=runOnly?'Keep in sack':source==='bag'?'Deposit':'Stored · no retrieval';get('raid-cart-transfer').disabled=!!pending||aboard||!item||!!runOnly||source!=='bag';
  get('raid-cart-board').textContent=aboard?'E · Hop out':'Hold E · Hop in';get('raid-cart-board').disabled=!!pending;
  get('raid-cart-status').textContent=pending?'Waiting…':notice?notice:state.cart.countdown!==null?`Leaving in ${Math.ceil(state.cart.countdown)}…`:aboard?`${state.cart.aboard.length} / ${state.teamCount??1} aboard · Waiting for the team`:'Deposit only · banked on escape.';
  const bubble=dialog.querySelector?.('.cart-bubble');if(state.anchor&&bubble){const bounds=bubble.getBoundingClientRect(),pos=cartBubblePlacement(state.anchor,bounds);bubble.style.left=`${pos.left}px`;bubble.style.top=`${pos.top}px`;bubble.dataset.tail=pos.side;}
 }
 function request(message){
  const state=getState();if(pending||!state?.active)return;
  notice='';const feedbackId=`cargo-${++serial}`;if(network)pending={id:feedbackId,before:stamp(state),acknowledged:false,boarding:message.type==='cart-board'&&message.active};
  const ok=onAction({...message,feedbackId});if(ok===false){pending=null;notice='No room, or that action is unavailable.';feedback(false);}else if(!network)feedback(true);refresh();
 }
 function transfer(){const state=getState(),item=state&&selection(state);if(source==='bag'&&item&&!LOOT_TYPES[item.type].runOnly&&!state.cart.aboard.includes(state.selfId))request({type:'cart-transfer',id:item.id,toCart:true});}
 for(const [id,kind]of [['raid-cart-grid','cart'],['raid-cart-sack','bag']]){
  const canvas=get(id);canvas.addEventListener('pointerdown',event=>{
   if(event.button!==0||pending)return;releaseHold();event.preventDefault();const b=canvas.getBoundingClientRect(),n=kind==='bag'||coarse()?3:6;
   const x=Math.floor((event.clientX-b.left)/b.width*n),y=Math.floor((event.clientY-b.top)/b.height*n);if(x<0||y<0||x>=n||y>=n)return;
   source=kind;cell={x:x+(kind==='cart'&&coarse()?(page%2)*3:0),y:y+(kind==='cart'&&coarse()?Math.floor(page/2)*3:0)};canvas.focus();refresh();
  });
  canvas.addEventListener('keydown',event=>{
   if(pending)return;const dx=Number(event.code==='KeyD')-Number(event.code==='KeyA'),dy=Number(event.code==='KeyS')-Number(event.code==='KeyW');
   if(dx||dy){releaseHold();event.preventDefault();event.stopPropagation?.();if(source!==kind){source=kind;cell={x:0,y:0};}const n=kind==='cart'?6:3;cell={x:Math.max(0,Math.min(n-1,cell.x+dx)),y:Math.max(0,Math.min(n-1,cell.y+dy))};if(kind==='cart')page=Math.floor(cell.y/3)*2+Math.floor(cell.x/3);refresh();}
   if(event.code==='KeyE'){event.preventDefault();event.stopPropagation?.();if(!event.repeat){if(kind==='cart')beginBoard();else transfer();}}
   if(event.code==='KeyQ'){event.preventDefault();event.stopPropagation?.();source=kind==='cart'?'bag':'cart';cell={x:0,y:0};page=0;get(source==='cart'?'raid-cart-grid':'raid-cart-sack').focus();refresh();}
  });
 }
 function close(){releaseHold();const state=getState();if(state?.active&&(state.cart.aboard.includes(state.selfId)||pending?.boarding))onAction({type:'cart-board',active:false,feedbackId:`cargo-${++serial}`});pending=null;dialog.close();onClose();}
 get('raid-cart-transfer').addEventListener('click',event=>{if(!(event.detail>1))transfer();});
 function releaseHold(){if(hold){clearTimeout(hold);hold=null;}get('raid-cart-board').dataset.holding='false';}
 function beginBoard(){
  const s=getState();if(hold||pending||!s?.active)return;
  if(s.cart.aboard.includes(s.selfId)){request({type:'cart-board',active:false});return;}
  get('raid-cart-board').dataset.holding='true';
  hold=setTimeout(()=>{hold=null;get('raid-cart-board').dataset.holding='false';if(getState()?.active)request({type:'cart-board',active:true});},1000);
 }
 get('raid-cart-board').addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();get('raid-cart-board').setPointerCapture?.(event.pointerId);beginBoard();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])get('raid-cart-board').addEventListener(type,releaseHold);
 get('raid-cart-board').addEventListener('click',event=>{const s=getState();if(event.detail===0&&s?.cart.aboard.includes(s.selfId))request({type:'cart-board',active:false});});
 get('raid-cart-board').addEventListener('keydown',event=>{if(['KeyE','Enter','Space'].includes(event.code)){event.preventDefault();event.stopPropagation?.();if(!event.repeat)beginBoard();}});
 get('raid-cart-board').addEventListener('keyup',releaseHold);
 window.addEventListener?.('keyup',event=>{if(event.code==='KeyE')releaseHold();});
 window.addEventListener?.('blur',releaseHold);
 window.addEventListener?.('gamecontrolsreset',releaseHold);
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)releaseHold();});

 for(const [id,step]of [['raid-cart-prev',-1],['raid-cart-next',1]])get(id).addEventListener('click',()=>{page=Math.max(0,Math.min(3,page+step));source='cart';cell={x:page%2*3,y:Math.floor(page/2)*3};refresh();});
 get('close-raid-cart').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{if(event.code==='Escape'||event.code==='Tab'){event.preventDefault();event.stopPropagation?.();close();}});
 return {interactDown(){if(!dialog.open)this.open();beginBoard();},releaseHold,open(){source='bag';cell={x:0,y:0};page=0;pending=null;notice='';const stage=document.querySelector('.stage');if(stage?.append&&dialog.parentElement!==stage)stage.append(dialog);dialog.show();refresh();},refresh,close,receiveFeedback(message){if(!pending||pending.id!==message.feedbackId)return;if(!message.ok){pending=null;notice='Action unavailable · cargo refreshed.';feedback(false);}else pending.acknowledged=true;refresh();}};
}
