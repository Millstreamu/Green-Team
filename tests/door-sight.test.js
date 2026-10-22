import test from 'node:test';
import assert from 'node:assert/strict';
import { doorLeafSegment,roomDoorsBlockSight } from '../src/door-geometry.js';
import { applyRoomDoors,beginRoomDoor,tickRoomDoors } from '../src/room-doors.js';
import { createVitality,seesPlayer,updateGuard } from '../src/guard.js';
import { isWalkable } from '../src/world.js';
import { createDoorTestRoom } from '../workshop/door-test-room.js';
import { lightPolygon } from '../src/lighting.js';
import { selectJob } from '../src/jobs.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { createDungeonSession } from '../server/dungeon-session.js';

test('door gap exposes a slice while the hinged panel still blocks the other side, for every orientation',()=>{
 for(const side of ['north','south','east','west']){
  const d={cells:[{x:3,y:3}],side,progress:0,open:false},w={roomDoors:[d]};
  const rotate=p=>['east','west'].includes(side)?{x:7-p.y,y:p.x}:p;
  for(const x of [3.05,3.25,3.5,3.75,3.95])assert.ok(roomDoorsBlockSight(w,rotate({x,y:2.5}),rotate({x,y:4.5})));
  d.progress=.6;
  const a=rotate({x:3.9,y:2.5}),b=rotate({x:3.9,y:4.5});
  assert.equal(roomDoorsBlockSight(w,a,b),false);assert.equal(roomDoorsBlockSight(w,b,a),false);
  assert.equal(roomDoorsBlockSight(w,rotate({x:3.15,y:2.5}),rotate({x:3.15,y:4.5})),true);
  d.progress=0;assert.ok(roomDoorsBlockSight(w,a,b));d.open=true;d.progress=1;assert.equal(roomDoorsBlockSight(w,a,b),false);
 }
});
test('analytic panel intersection catches a grazing diagonal that tile sampling could miss',()=>{
 const d={cells:[{x:0,y:0}],side:'north',progress:.65,open:false},w={roomDoors:[d]},[a,b]=doorLeafSegment(d);
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 assert.ok(roomDoorsBlockSight(w,{x:mid.x-5,y:mid.y-3},{x:mid.x+5,y:mid.y+3}));
});
test('real guard notices through partial opening and remembers the last seen position when door closes',()=>{
 const {world,guards,start}=createDoorTestRoom(),guard=guards[0],d=world.roomDoors[0],p={id:'p',...start,...createVitality()};
 assert.equal(seesPlayer(world,guard,p),false);d.progress=.6;applyRoomDoors(world,[d]);
 assert.equal(seesPlayer(world,guard,p),true);assert.equal(isWalkable(world,6,7),false);
 for(let i=0;i<12;i++)updateGuard(world,guard,p,.1);assert.equal(guard.state,'chase');
 const lastSeen={...guard.lastSeen};d.progress=0;applyRoomDoors(world,[d]);
 assert.equal(seesPlayer(world,guard,p,true),false);updateGuard(world,guard,p,.1);assert.equal(guard.state,'search');assert.deepEqual(guard.lastSeen,lastSeen);
});
test('every progress change invalidates light occlusion and the widening gap lets light through',()=>{
 const {world,guards,start}=createDoorTestRoom(),d=world.roomDoors[0],p={id:'p',...start,...createVitality(),searchHeld:true};
 const closed=lightPolygon(world,guards[0],6);const before=world.sightVersion;
 assert.ok(beginRoomDoor(world,p,d.id));tickRoomDoors(world,[p],1.2);assert.ok(world.sightVersion>before);
 const partly=lightPolygon(world,guards[0],6);assert.ok(partly.some((p,i)=>p.y>closed[i].y+.3));
 const v=world.sightVersion;p.searchHeld=false;tickRoomDoors(world,[p],.3);assert.ok(world.sightVersion>v);assert.equal(d.progress,0);
});
test('server snapshots reproduce identical partial-door sight on the client',()=>{
 const p={id:'p',name:'P',profile:createProfile(),bag:[],connected:true};
 const s=createDungeonSession({id:'sight',seed:1,job:selectJob('manor','normal')},[p],createCamp());
 s.danger.guards.length=0;
 // Test a real server door independently of its normal placement.
 const serverDoor=s.world.roomDoors[0];serverDoor.progress=.6;applyRoomDoors(s.world,s.world.roomDoors);
 const client={...s.world,roomDoors:[]};applyRoomDoors(client,s.snapshot().roomDoors);
 const c=serverDoor.cells[0],a={x:c.x+.9,y:c.y-1},b={x:c.x+.9,y:c.y+2};
 assert.equal(roomDoorsBlockSight(client,a,b),roomDoorsBlockSight(s.world,a,b));
});

test('rendered leaf endpoints match sight geometry at the actual game tile scale',async()=>{
 const {drawRoomDoor}=await import('../src/room-door-view.js'),{CONFIG}=await import('../src/config.js');
 for(const progress of [0,.4,.8,1]){
  const points=[];let tx=0,ty=0,sx=1,sy=1;
  const ctx={save(){},restore(){},translate(x,y){tx+=x;ty+=y;},scale(x,y){sx*=x;sy*=y;},fillRect(){},beginPath(){},moveTo(x,y){points.push({x:tx+x*sx,y:ty+y*sy});},lineTo(x,y){points.push({x:tx+x*sx,y:ty+y*sy});},stroke(){}};
  const d={cells:[{x:3,y:4}],side:'north',progress};drawRoomDoor(ctx,d,5,7);
  const expected=doorLeafSegment(d).map(p=>({x:p.x*CONFIG.tile+5,y:p.y*CONFIG.tile+7}));
  for(let i=0;i<2;i++){assert.ok(Math.abs(points[i].x-expected[i].x)<1e-8);assert.ok(Math.abs(points[i].y-expected[i].y)<1e-8);}
 }
});
