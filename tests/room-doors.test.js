import { clearPath } from '../src/loot.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRoomDoors,beginRoomDoor,cancelRoomDoor,tickRoomDoors,createRoomDoors } from '../src/room-doors.js';
import { isWalkable,isSightOpen } from '../src/world.js';
import { selectInteraction } from '../src/search.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
function fixture(){
 const w={width:7,height:7,tiles:new Uint8Array(49).fill(1)};
 const d={id:'door',cells:[{x:3,y:3,side:'north'}],x:3.5,y:3.5,side:'north',progress:0,open:false,openerId:null};applyRoomDoors(w,[d]);
 const p={id:'p',x:3.5,y:2.5,state:'active',searchHeld:true};return {w,d,p};
}
test('door opens gradually, blocks movement/sight until finished and stays open',()=>{
 const {w,d,p}=fixture();assert.equal(selectInteraction(w,p,[],[]).kind,'door');assert.ok(beginRoomDoor(w,p,d.id));
 tickRoomDoors(w,[p],1);assert.equal(d.progress,.5);assert.equal(isWalkable(w,3,3),false);assert.equal(clearPath(w,{x:3.15,y:2.5},{x:3.15,y:4.5}),false);
 const version=w.sightVersion;tickRoomDoors(w,[p],1);assert.equal(d.open,true);assert.ok(w.sightVersion>version);assert.ok(isWalkable(w,3,3));assert.ok(isSightOpen(w,3,3));
 p.searchHeld=false;tickRoomDoors(w,[p],5);assert.equal(d.progress,1);
});
test('release, movement, downing, disconnect and interruption close an unfinished door quickly',()=>{
 for(const interrupt of [p=>p.searchHeld=false,p=>p.x+=.3,p=>p.state='down',p=>p.connected=false,p=>p.loot={held:{id:'held'}}]){
 const {w,d,p}=fixture();beginRoomDoor(w,p,d.id);tickRoomDoors(w,[p],1);interrupt(p);tickRoomDoors(w,[p],.3);assert.equal(d.progress,0);assert.equal(d.open,false);assert.equal(d.openerId,null);
 }
 const {w,d,p}=fixture();beginRoomDoor(w,p,d.id);tickRoomDoors(w,[p],1);cancelRoomDoor(w,p);p.searchHeld=false;tickRoomDoors(w,[p],.3);assert.equal(d.progress,0);
});
test('one opener owns the hold; teammates do not multiply progress and can take over after release',()=>{
 const {w,d,p}=fixture(),q={...p,id:'q'};assert.ok(beginRoomDoor(w,p,d.id));assert.equal(beginRoomDoor(w,q,d.id),false);
 tickRoomDoors(w,[p,q],1);assert.equal(d.progress,.5);cancelRoomDoor(w,p);assert.ok(beginRoomDoor(w,q,d.id));tickRoomDoors(w,[p,q],1);assert.equal(d.open,true);
});
test('server validates range, shares progress, times out stale holds and keeps a fully opened door',()=>{
 const p={id:'p',name:'P',profile:createProfile(),bag:[],connected:true};
 const session=createDungeonSession({id:'doors',seed:2371,job:selectJob('manor','normal')},[p],createCamp());
 // Place a controlled doorway on open floor for authoritative interaction checks.
 const w=session.world,cell={x:Math.floor(p.x),y:Math.floor(p.y)+1,side:'north'};
 const d={id:'controlled',cells:[cell],side:'north',x:cell.x+.5,y:cell.y+.5,progress:0,open:false,openerId:null};
 applyRoomDoors(w,[d]);session.danger.guards.length=0;
 assert.equal(session.action(p,{type:'open-door',id:'forged'}),false);
 assert.ok(session.action(p,{type:'open-door',id:d.id}));session.tick(.1);assert.equal(session.snapshot().roomDoors[0].progress,.05);
 p.searchHeld=false;session.tick(.1);session.tick(.1);assert.equal(d.progress,0);
 assert.ok(session.action(p,{type:'open-door',id:d.id}));
 for(let i=0;i<21;i++){p.inputAge=0;p.searchHeld=true;session.tick(.1);}assert.ok(d.open);
 session.disconnect(p);session.tick(.1);assert.equal(session.snapshot().roomDoors[0].open,true);
});

test('generated door preserves key access and never seals spawn, guards or cages',()=>{
 for(const seed of [1,4,6,7,10,13]){
  const p={id:'p',name:'P',profile:createProfile(),bag:[],connected:true};
  const s=createDungeonSession({id:'generated',seed,job:selectJob('manor','normal')},[p],createCamp());
  assert.equal(s.world.roomDoors.length,1);const d=s.world.roomDoors[0],r=s.world.rooms[d.roomIndex];
  assert.notEqual(d.roomIndex,s.world.treasure.roomIndex);assert.notEqual(d.roomIndex,0);
  const inside=p=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
  assert.ok(s.danger.guards.every(g=>!inside(g)));assert.ok(s.danger.rescue.cages.every(c=>!inside(c)));
  const key=s.objects.find(o=>o.id===s.world.treasure.keyContainerId);assert.ok(!inside(key));
 }
});
