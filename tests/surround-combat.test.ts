import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, careerStats } from '../src/model.ts';
import type { Enemy } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { spawnPoint, updateBattle, battleWorld } from '../src/battle.ts';
import { tick, emptyInput, targetableEnemy } from '../src/engine.ts';
import { distance, isFree } from '../src/geometry.ts';
import { parseSave } from '../src/storage.ts';
import { tickAutoSkills } from '../src/combat-skills.ts';
import { dungeon } from '../src/content/registry.ts';
import { battleCamera } from '../src/battle-camera.ts';

function setup(){const s=freshState();startRun(s);return {s,r:s.run!,world:battleWorld(s.run!)};}
function enemy(kind:Enemy['kind'],x:number,y:number):Enemy{return {id:'approaching-'+kind,kind,pos:{x,y},home:{x,y},hp:500,mode:'chase',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0};}

test('三职业各成长阶段均保留短射程，怪物先逼近才被射击，弹道不多走枪口偏移',()=>{
 for(const [career,range,main] of [['investigator',3.8,'revolver'],['occultist',3.2,'sigil'],['harpooner',4.6,'harpoon']] as const)for(const level of [1,3,5]){
  const {s,r,world}=setup();s.career=career;r.rogue!.skills={[main]:level};
  const e=enemy('beast',15.2,14);world.enemies=[e];assert.equal(careerStats(s).range,range);assert.equal(targetableEnemy(s),null);
  const before=distance(e.pos,r.player.pos);tick(s,emptyInput(),.05);assert.ok(distance(e.pos,r.player.pos)<before);assert.equal(world.projectiles.filter(p=>p.owner==='player').length,0);
  e.pos={x:13,y:14};e.mode='recover';e.timer=-1;r.player.fireCd=0;tick(s,emptyInput(),.05);
  const shot=world.projectiles.find(p=>p.owner==='player')!;assert.ok(shot);assert.ok(distance(r.player.pos,shot.pos)+shot.life*shot.speed<=range+.001);
 }
});

test('周围位置随机取样，不固定方向，并允许从实际屏幕外生成',()=>{
 const original=Math.random;let seed=20261016;
 Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 try{for(const viewport of [{width:320,height:480},{width:360,height:640},{width:414,height:896}]){
  const {r}=setup(),camera=battleCamera(viewport.width,viewport.height,r.player.pos,dungeon(r.boss).arena,false),points=[],sides=new Set<string>();let inside=0,outside=0,nonOctant=0;
  for(let i=0;i<64;i++){
   const at=spawnPoint(r,0,'beast',viewport);assert.ok(at);assert.ok(distance(at.pos,r.player.pos)>=dungeon(r.boss).combat.safeDistance);assert.ok(isFree(r.boss,at.pos,.34));
   points.push(at.pos);sides.add(at.side);const x=camera.ox+(at.pos.x-.5)*camera.tile,y=camera.oy+(at.pos.y-.5)*camera.tile;
   if(x<0||x>viewport.width||y<0||y>viewport.height)outside++;else inside++;
   const angle=Math.atan2(at.pos.y-r.player.pos.y,at.pos.x-r.player.pos.x)/(Math.PI/4);if(Math.abs(angle-Math.round(angle))>.08)nonOctant++;
  }
  assert.notDeepEqual(points[0],points[1]);assert.equal(sides.size,4);assert.ok(inside>0&&outside>0);assert.ok(nonOctant>32,'不应吸附到八个固定方向');
 }}finally{Math.random=original;}
});

test('怪物浮出期间不能被攻击或造成伤害，重载保留进度，浮出后向玩家追击',()=>{
 const {s,r,world}=setup();r.player.fireCd=2;r.battle!.pending=[{id:'surfacing',kind:'beast',pos:{x:13.2,y:14},side:'east',remaining:.5}];
 updateBattle(r,.2);assert.equal(world.enemies.length,0);assert.equal(targetableEnemy(s),null);assert.equal(r.player.hp,110);
 const loaded=parseSave(JSON.stringify(s)),restored=loaded.run!;assert.ok(Math.abs(restored.battle!.pending[0].remaining-.3)<1e-6);
 updateBattle(restored,.31);assert.equal(battleWorld(restored).enemies.length,1);assert.equal(restored.battle!.pending.length,0);
 const e=battleWorld(restored).enemies[0],before=distance(e.pos,restored.player.pos);tick(loaded,emptyInput(),.05);assert.ok(distance(e.pos,restored.player.pos)<before);
});

test('远程眷属先走入较近交战距离，不在旧射程边缘发呆',()=>{
 for(const kind of ['bug','cultist'] as const){
  const {s,r,world}=setup();const e=enemy(kind,14.7,14);world.enemies=[e];r.player.fireCd=100;
  tick(s,emptyInput(),.05);assert.equal(e.mode,'chase');assert.ok(e.pos.x<14.7);
  for(let i=0;i<40;i++){r.player.fireCd=100;tick(s,emptyInput(),.05);}
  assert.ok(distance(e.pos,r.player.pos)<=dungeon(r.boss).minions[kind].range+.01);assert.ok(e.mode==='windup'||e.mode==='attack'||e.mode==='recover'||e.turn>0);
 }
});

test('辅助攻击不会在主武器交战距离外提前点杀，新手仍有靠近过程',()=>{
 for(const id of ['lantern','arc','tide','bell'] as const){
  const {s,r,world}=setup();r.rogue!.skills={revolver:1,[id]:5,coil:5};world.enemies=[enemy('beast',15.2,14)];
  const hits:string[]=[],visuals:string[]=[];tickAutoSkills(s,.05,e=>hits.push(e.id),e=>visuals.push(e.kind));
  assert.equal(hits.length,0);assert.equal(visuals.length,0);assert.equal(r.rogue!.fields.length,0);
  world.enemies[0].pos={x:11,y:14};tickAutoSkills(s,.05,e=>hits.push(e.id),e=>visuals.push(e.kind));
  assert.ok(hits.length>0||r.rogue!.fields.length>0,`${id} 在近处仍应生效`);
 }
});


test('屏外普通怪持续追进来，进入近距离前不攻击玩家',()=>{
 const {s,r,world}=setup(),e=enemy('beast',17,14);world.enemies=[e];
 assert.equal(targetableEnemy(s),null);const attacks=[];
 for(let i=0;i<20;i++){const result=tick(s,emptyInput(),.05);attacks.push(...result.events.filter(e=>e.kind==='attack'));}
 assert.ok(e.pos.x<17);assert.equal(r.player.hp,110);assert.equal(attacks.length,0);
 for(let i=0;i<30;i++){const result=tick(s,emptyInput(),.05);attacks.push(...result.events.filter(e=>e.kind==='attack'));}
 assert.ok(e.pos.x<15);assert.ok(attacks.length>0,'逼近后应能被短射程武器攻击');
});

test('Boss首招前先逼近，超时后仍会发动攻击而非永久等待',()=>{
 const {s,r,world}=setup(),e=enemy('guardian',15.4,14);world.enemies=[e];r.player.fireCd=100;
 tick(s,emptyInput(),.05);assert.equal(e.mode,'chase');assert.ok(e.pos.x<15.4);
 e.timer=4.1;tick(s,emptyInput(),.05);assert.equal(e.mode,'windup');
});
