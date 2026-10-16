import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, acceptQuest, maxHealth } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { aliveEnemies, battleWorld, emptyRoom, updateBattle } from '../src/battle.ts';
import { emptyInput, tick, targetableEnemy } from '../src/engine.ts';
import { dungeon } from '../src/content/registry.ts';
import { parseSave, validState } from '../src/storage.ts';
import { battleCamera } from '../src/battle-camera.ts';
import { distance, isFree, pathDirection } from '../src/geometry.ts';
const viewports=[{width:320,height:480},{width:360,height:640},{width:414,height:896}];
function state(){const s=freshState('legacy');acceptQuest(s,'K0');startRun(s);return s;}
function advance(s:ReturnType<typeof state>,seconds:number,viewport?:{width:number;height:number}){for(let i=0;i<Math.ceil(seconds/.05);i++){s.run!.player.invincible=.65;s.run!.player.fireCd=2;tick(s,{...emptyInput(),viewport},.05);}}
function skipToBoss(s:ReturnType<typeof state>,viewport=viewports[1]){const r=s.run!,waves=dungeon(r.boss).combat.waves;r.battle!.wave=4;r.battle!.batches=waves.map((w,i)=>i<4?w.batches:0);r.time=waves[4].at;updateBattle(r,0,viewport);updateBattle(r,1,viewport);}

test('波内持续分批来敌，清场、水平或垂直移动均不改变时间',()=>{
 const s=state(),r=s.run!;advance(s,5.9);assert.equal(aliveEnemies(r).length,4);assert.equal(r.battle!.wave,1);
 const ids=aliveEnemies(r).map(e=>e.id);r.player.pos={x:15,y:12};advance(s,6);assert.equal(aliveEnemies(r).length,8);assert.ok(ids.every(id=>aliveEnemies(r).some(e=>e.id===id)));
 battleWorld(r).enemies=[];advance(s,.2);assert.equal(r.battle!.batches![0],2);
 r.time=29.95;advance(s,.9);assert.equal(r.battle!.wave,2);assert.ok(aliveEnemies(r).length>=6);
});
test('三种竖屏均有周围随机安全预警，出生前没有攻击者',()=>{
 for(const viewport of viewports){const s=state(),r=s.run!;r.time=4.95;tick(s,{...emptyInput(),viewport},.05);
 assert.equal(r.battle!.pending.length,4);assert.ok(r.battle!.pending.every(p=>['north','east','south','west'].includes(p.side)));assert.equal(aliveEnemies(r).length,0);
 for(const p of r.battle!.pending){assert.ok(distance(p.pos,r.player.pos)>=3);assert.ok(isFree(r.boss,p.pos,.34));}
 advance(s,.9,viewport);assert.equal(aliveEnemies(r).length,4);}
});
test('第五波在场地各角出现，不受设施等级或残敌影响',()=>{
 for(const pos of [{x:3,y:3.1},{x:17,y:3.1},{x:3,y:19.9},{x:17,y:19.9}]){const s=state(),r=s.run!;advance(s,5.9);r.player.pos=pos;skipToBoss(s);assert.equal(r.battle!.wave,5);assert.ok(aliveEnemies(r).some(e=>e.kind==='guardian'));assert.ok(aliveEnemies(r).some(e=>e.kind==='beast'));}
});
test('预警中重载保留批次与倒计时，不重复发怪',()=>{
 const s=state();s.run!.time=4.95;tick(s,emptyInput(),.05);const before=s.run!.battle!.pending.map(p=>p.id),restored=parseSave(JSON.stringify(s));
 assert.equal(restored.run!.time,s.run!.time);advance(restored,.9);assert.deepEqual(new Set(aliveEnemies(restored.run!).map(e=>e.id)),new Set(before));advance(restored,1);assert.equal(aliveEnemies(restored.run!).length,4);assert.ok(validState(restored));
});
test('旧路段调查转换保留生命、物资与证物，并能补出 Boss',()=>{
 const s=state(),r=s.run!;r.rooms=Array.from({length:7},(_,i)=>emptyRoom(i));r.rooms[6].objects=[{id:'old-exit',kind:'exit',pos:{x:6,y:110},used:false}];r.materials={crystal:3,iron:2};r.progress.K0=1;r.player.hp=76;
 Reflect.deleteProperty(r,'world');Reflect.deleteProperty(r,'battle');r.room=0;r.player.pos={x:6,y:8};
 const restored=parseSave(JSON.stringify(s));assert.equal(restored.run!.battle!.version,3);assert.equal(restored.run!.player.hp,76);assert.deepEqual(restored.run!.materials,{crystal:3,iron:2});assert.equal(restored.run!.progress.K0,1);advance(restored,1);assert.ok(aliveEnemies(restored.run!).some(e=>e.kind==='guardian'));assert.ok(validState(restored));
});
test('旧定时调查转换不补发已开始阶段，迁移仅执行一次',()=>{
 const s=state(),r=s.run!;r.rooms=Array.from({length:7},(_,i)=>emptyRoom(i));r.room=4;r.time=70;r.player.pos={x:6,y:70};r.player.hp=76;r.battle={version:2,wave:3,won:false,pending:[]};r.world=emptyRoom(0);r.world.objects=[{id:'exit',kind:'exit',pos:{x:6,y:110},used:false}];
 const converted=parseSave(JSON.stringify(s)),position={...converted.run!.player.pos};advance(converted,1);assert.equal(aliveEnemies(converted.run!).length,0);assert.ok(Math.abs(converted.run!.time-71)<.001);assert.deepEqual(parseSave(JSON.stringify(converted)).run!.player.pos,position);assert.ok(isFree(r.boss,position,.22));
});
test('敌人可从水平方向接近并被自动射击选中',()=>{
 const s=state(),r=s.run!;advance(s,5.9);const enemy=aliveEnemies(r)[0];r.player.pos={x:10,y:14};enemy.pos={x:11,y:14};battleWorld(r).enemies=[enemy];assert.equal(targetableEnemy(s)?.id,enemy.id);
});
test('Boss 胜利停止残留伤害，退散敌人不发奖励',()=>{
 const s=state(),r=s.run!;skipToBoss(s);const world=battleWorld(r),boss=aliveEnemies(r).find(e=>e.kind==='guardian')!;
 world.enemies.push({...structuredClone(boss),id:'survivor',kind:'beast',hp:28,pos:{x:11,y:14}});boss.hp=1;boss.mode='recover';r.player.fireCd=2;
 world.projectiles.push({id:'kill',pos:{...boss.pos},angle:0,life:1,damage:80,owner:'player',speed:0,splash:0,weakpoint:2},{id:'lingering',pos:{...r.player.pos},angle:0,life:1,damage:80,owner:'enemy',speed:0,splash:0,weakpoint:1});
 tick(s,emptyInput(),.05);assert.equal(r.battle!.won,true);assert.equal(r.player.hp,maxHealth(s));assert.equal(s.energy,dungeon(r.boss).boss.rewards.energy);assert.equal(r.materials.crystal,dungeon(r.boss).boss.rewards.crystal);assert.equal(world.projectiles.length,0);assert.equal(world.hazards.length,0);assert.equal(aliveEnemies(r).length,0);const time=r.time;advance(s,2);assert.equal(r.time,time);
});
test('二维镜头跟随两轴，并在四个边界限制空白',()=>{
 const arena=dungeon('tide_colossus').arena;
 for(const viewport of viewports)for(const hasBoss of [false,true])for(const player of [{x:2.5,y:2.5},{x:17.5,y:2.5},{x:2.5,y:21.5},{x:17.5,y:21.5},{x:10,y:14}]){
 const c=battleCamera(viewport.width,viewport.height,player,arena,hasBoss);assert.ok(c.ox<=0);assert.ok(c.ox+arena.width*c.tile>=viewport.width);assert.ok(c.oy<=c.top);assert.ok(c.oy+arena.height*c.tile>=c.top+c.fieldHeight);assert.ok(c.minX<c.maxX&&c.minY<c.maxY);
 }
 assert.notEqual(battleCamera(360,640,{x:7,y:14},arena,false).ox,battleCamera(360,640,{x:13,y:14},arena,false).ox);
});
test('112只残敌与 Boss 共存，三种视口不漏批次且可存档',()=>{
 for(const viewport of viewports){const s=state(),r=s.run!;
 for(const wave of dungeon(r.boss).combat.waves){r.time=wave.at;updateBattle(r,0,viewport);advance(s,24,viewport);assert.ok(validState(s));}
 advance(s,3,viewport);assert.equal(r.battle!.wave,5);assert.ok(aliveEnemies(r).some(e=>e.kind==='guardian'));assert.equal(aliveEnemies(r).length,113);assert.equal(r.battle!.pending.length,0);}
});
test('被怪物贴身后仍能向外脱离',()=>{
 const s=state(),r=s.run!;r.time=5;updateBattle(r,0);updateBattle(r,1);const world=battleWorld(r),enemy=aliveEnemies(r)[0];world.enemies=[enemy];enemy.pos={x:r.player.pos.x+.1,y:r.player.pos.y};enemy.mode='recover';enemy.timer=-.5;r.player.fireCd=2;const x=r.player.pos.x;tick(s,{...emptyInput(),move:{x:-1,y:0}},.05);assert.ok(r.player.pos.x<x);
});
test('屏外预警不随镜头尺寸变化跳点；贴近玩家时重选并完整预警',()=>{
 const s=state(),r=s.run!;r.time=5;updateBattle(r,0,viewports[1]);const before=r.battle!.pending.map(p=>({...p.pos}));
 updateBattle(r,.4,viewports[0]);assert.deepEqual(r.battle!.pending.map(p=>p.pos),before);
 const warning=r.battle!.pending[0];r.player.pos={...warning.pos};updateBattle(r,.41,viewports[2]);
 const relocated=r.battle!.pending.find(p=>p.id===warning.id)!;assert.ok(relocated);assert.ok(distance(relocated.pos,r.player.pos)>=dungeon(r.boss).combat.safeDistance);assert.equal(relocated.remaining,dungeon(r.boss).combat.warning);
});
test('Boss 屏外先追近，不从屏外开始蓄力',()=>{
 const s=state(),r=s.run!,viewport=viewports[0];skipToBoss(s,viewport);const boss=aliveEnemies(r).find(e=>e.kind==='guardian')!;boss.pos={x:4,y:14};boss.mode='chase';r.player.pos={x:10,y:14};r.player.fireCd=2;tick(s,{...emptyInput(),viewport},.05);assert.equal(boss.mode,'chase');assert.equal(battleWorld(r).hazards.filter(h=>h.boss).length,0);assert.ok(boss.pos.x>4);
});
test('大体型寻路按身体宽度绕开掩体',()=>{
 const angle=pathDirection('tide_colossus',{x:5.25,y:6},{x:5.25,y:11},1.12);assert.notEqual(angle,null);assert.ok(Math.abs(Math.cos(angle!))>.1);
});

test('远程怪被掩体挡住视线时，继续绕行并发动攻击',()=>{
 for(const kind of ['bug','cultist'] as const){
 const s=state(),r=s.run!;r.player.pos={x:3,y:7};r.battle!.batches=[4,4,5,5,1];
 const enemy={id:'occluded-ranged',kind,pos:{x:6.5,y:9},home:{x:6.5,y:9},hp:30,mode:'chase' as const,timer:0,angle:0,turn:0,hit:false,flash:0,lost:0};
 battleWorld(r).enemies=[enemy];const start={...enemy.pos};advance(s,1);
 assert.ok(distance(start,enemy.pos)>.15,`${kind} 不应在射距内隔墙发呆`);
 advance(s,5);assert.ok(enemy.turn>0,`${kind} 绕行后应完成攻击`);
 }
});
