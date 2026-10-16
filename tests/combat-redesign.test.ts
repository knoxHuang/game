import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaArtFrame } from '../src/arena-art.ts';
import { freshState, careerStats, finishRun } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { battleWorld, combatWaves, bossHealth, enemyHealth } from '../src/battle.ts';
import { emptyInput, tick } from '../src/engine.ts';
import { parseSave, validState } from '../src/storage.ts';
import { rollOffers } from '../src/roguelite.ts';
import type { Enemy } from '../src/model.ts';

const playing=()=>{const s=freshState();startRun(s);return s;};

test('三种竖屏的背景统一等比取图，2:3母图不再被拉伸成5:6',()=>{
  for(const width of [320,360,414]){
    const tile=Math.floor(width/12),w=20*tile,h=24*tile;
    const f=arenaArtFrame(1024,1536,w,h);
    assert.ok(Math.abs(f.width*f.scale-w)<1e-8);
    assert.ok(Math.abs(f.height*f.scale-h)<1e-8);
    assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=1024&&f.y+f.height<=1536);
    assert.ok(f.y>0);assert.equal(f.x,0);
  }
});

test('短局新近战怪需初始左轮三发，旧调查维持旧生命与五阶段',()=>{
  const s=playing(),run=s.run!;
  assert.equal(combatWaves(run).length,3);
  assert.equal(Math.ceil(enemyHealth(run,'beast')/careerStats(s).damage),3);
  assert.equal(enemyHealth(run,'beast',true),56);
  const old=structuredClone(s),r=old.run!;
  delete r.rogue!.pacingVersion;
  r.battle!.batches=[5,8,8,8,0];r.battle!.wave=4;r.time=279;
  assert.equal(combatWaves(r).length,5);assert.equal(combatWaves(r)[4].at,280);
  assert.equal(bossHealth(r),5000);assert.equal(enemyHealth(r,'beast'),18);
  assert.equal(validState(old),true);
  const loaded=parseSave(JSON.stringify(old));assert.equal(loaded.run!.time,279);
  finishRun(loaded,false);startRun(loaded);
  assert.equal(combatWaves(loaded.run!).length,3);
  assert.equal(validState(loaded),true);
});

test('灵魂从吸附范围飞向玩家，抵达后才发经验，不穿掩体拾取',()=>{
  const s=playing(),r=s.run!,w=battleWorld(r);r.player.fireCd=2;
  w.drops=[{id:'xp',pos:{x:r.player.pos.x+1.8,y:r.player.pos.y},taken:false,xp:2}];
  const x=w.drops[0].pos.x;
  tick(s,emptyInput(),.05);
  assert.ok(w.drops[0].pos.x<x);assert.equal(r.rogue!.xp,0);
  for(let i=0;i<8;i++)tick(s,emptyInput(),.05);
  assert.equal(r.rogue!.xp,2);assert.equal(w.drops.length,0);
  const loaded=parseSave(JSON.stringify(s));tick(loaded,emptyInput(),.05);assert.equal(loaded.run!.rogue!.xp,2);
  r.player.pos={x:5,y:8};w.drops=[{id:'blocked',pos:{x:7,y:8},taken:false,xp:2}];
  tick(s,emptyInput(),.05);assert.equal(w.drops[0].pos.x,7);assert.equal(r.rogue!.xp,2);
});

test('主武器升级在3阶和5阶改变弹幕形态，爆炸范围仍满足存档契约',()=>{
  const counts:number[]=[];
  for(const level of [1,3,5]){
    const s=playing(),r=s.run!,p=r.player;
    r.rogue!.skills.revolver=level;
    battleWorld(r).enemies=[{id:'target',kind:'beast',pos:{x:p.pos.x+3,y:p.pos.y},home:{...p.pos},hp:100,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}];
    tick(s,emptyInput(),.01);counts.push(battleWorld(r).projectiles.filter(b=>b.owner==='player').length);
    assert.equal(validState(s),true);
  }
  assert.deepEqual(counts,[1,2,3]);
  const s=playing();s.career='occultist';s.research!.careers.push('occultist');
  s.run!.rogue!.skills={sigil:5,coil:3};
  assert.equal(careerStats(s).splash,2);
});

test('Boss每轮短暂逼近后仍会攻击，不在远处永久等待或无限追逐',()=>{
  const s=playing(),r=s.run!,w=battleWorld(r);
  r.player.fireCd=2;
  const boss={id:'boss',kind:'guardian' as const,pos:{x:15,y:14},home:{x:15,y:14},hp:1200,mode:'chase' as 'chase'|'windup',timer:0,angle:0,turn:1,hit:false,flash:0,lost:0};
  w.enemies=[boss];tick(s,emptyInput(),.05);
  assert.ok(boss.pos.x<15);assert.equal(boss.mode,'chase');
  boss.timer=1.2;tick(s,emptyInput(),.05);assert.equal(boss.mode,'windup');
});

test('攻击槽未填满时持续提供新攻击，不只在已有技能上堆数字',()=>{
  for(let seed=1;seed<=32;seed++){
    const r=playing().run!.rogue!;r.seed=seed;r.skills={revolver:3,lantern:1};
    rollOffers(r);
    assert.ok(r.offers.some(id=>['arc','tide','bell'].includes(id)));
  }
});

test('沉钟打断并推开普通怪，清除被打断法术；Boss只受伤不受控',()=>{
  const s=playing(),r=s.run!,w=battleWorld(r);r.player.fireCd=2;r.rogue!.skills.bell=1;
  const enemy=(kind:Enemy['kind'],x:number,y:number):Enemy=>({id:kind,kind,pos:{x,y},home:{x,y},hp:100,mode:'windup',timer:.2,angle:0,turn:0,hit:false,flash:0,lost:0});
  const beast=enemy('beast',10.8,14),cultist=enemy('cultist',10,14.8),boss=enemy('guardian',10,16);
  w.enemies=[beast,cultist,boss];
  w.hazards=[{id:'spell-cultist-pending',pos:{x:10,y:14},phase:.3,hit:false,boss:false,magic:true,damage:14,radius:.8}];
  tick(s,emptyInput(),.05);
  assert.equal(beast.mode,'recover');assert.ok(beast.pos.x>10.8);
  assert.equal(cultist.mode,'recover');assert.ok(cultist.pos.y>14.8);assert.equal(w.hazards.length,0);
  assert.equal(boss.mode,'windup');assert.equal(boss.pos.y,16);assert.ok(boss.hp<100);
  assert.equal(validState(s),true);
});
