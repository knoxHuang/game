import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, experience, gainEnergy, maxHealth, careerStats, finishRun, energyThreshold } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { emptyInput, tick, targetableEnemy } from '../src/engine.ts';
import { updateBattle, battleWorld } from '../src/battle.ts';
import { dungeon } from '../src/content/registry.ts';
import { validState, parseSave } from '../src/storage.ts';

function encounter() {
  const s=freshState('legacy'); startRun(s);
  const r=s.run!; r.time=5; updateBattle(r,0); updateBattle(r,1);
  const room=battleWorld(r), enemy=room.enemies[0];
  enemy.pos={x:r.player.pos.x+1,y:r.player.pos.y}; enemy.mode='recover'; enemy.timer=0;
  room.enemies=[enemy]; r.player.fireCd=2;
  return {s,r,room,enemy};
}
function shoot(f:ReturnType<typeof encounter>,damage:number) {
  f.room.projectiles.push({id:`shot-${f.r.time}`,pos:{...f.enemy.pos},angle:0,life:1,damage,owner:'player',speed:0,splash:0,weakpoint:1});
  return tick(f.s,emptyInput(),.01);
}
test('初始左轮需两次命中近战怪，只有致死命中发能量且重载不重复',()=>{
  const f=encounter(), damage=careerStats(f.s).damage;
  shoot(f,damage); assert.equal(f.enemy.hp,8); assert.equal(f.s.energy,0);
  shoot(f,damage); assert.equal(f.enemy.hp,0); assert.equal(f.s.energy,2);
  const loaded=parseSave(JSON.stringify(f.s)); tick(loaded,emptyInput(),.05);
  assert.equal(loaded.energy,2); assert.equal(loaded.run!.energyGained,2);
  finishRun(loaded,false); assert.equal(loaded.energy,2); assert.equal(loaded.summary!.energyGained,2);
});
test('经验阈值、跨多级、生命增量和等级伤害准确，满级继续记录',()=>{
  const s=freshState('legacy'); startRun(s); s.run!.player.hp=30;
  gainEnergy(s,99); assert.equal(experience(s).level,1);
  gainEnergy(s,1); assert.equal(experience(s).level,2); assert.equal(s.run!.player.hp,32);
  assert.equal(maxHealth(s),102); assert.equal(careerStats(s).damage,10.2);
  gainEnergy(s,energyThreshold(10)-100); assert.equal(experience(s).level,10);
  assert.equal(s.run!.player.hp,48); assert.equal(maxHealth(s),118);
  gainEnergy(s,100000); assert.equal(experience(s).level,60); assert.equal(experience(s).capped,true);
  assert.ok(validState(s)); assert.equal(parseSave(JSON.stringify(s)).energy,s.energy);
});
test('同批致死不会被击杀升级复活，失败仍保留经验',()=>{
  const f=encounter(); f.s.energy=98; f.r.player.hp=1;
  f.room.hazards.push({id:'fatal',pos:{...f.r.player.pos},phase:1,hit:false,boss:false,damage:10});
  const result=shoot(f,80);
  assert.equal(result.dead,true); assert.equal(f.r.player.hp,0); assert.equal(experience(f.s).level,2);
  finishRun(f.s,false); assert.equal(f.s.energy,100);
});
test('旧档缺少能量字段从零兼容，非法数值拒绝，配置独立提供奖励',()=>{
  const s=freshState('legacy'); delete s.energy;
  assert.equal(experience(parseSave(JSON.stringify(s))).current,0);
  for(const energy of [-1,.1,NaN,Infinity,'100']) assert.equal(validState({...s,energy}),false);
  const d=dungeon('tide_colossus');
  assert.deepEqual(['beast','bug','cultist'].map(k=>d.minions[k as keyof typeof d.minions].energy),[2,3,5]);
  assert.equal(d.boss.rewards.energy,220);
});

test('快速弹丸沿途命中，不跳过小目标，不穿掩体',()=>{
  const f=encounter(); f.enemy.pos={x:11,y:14};
  f.room.projectiles.push({id:'fast',pos:{x:10.5,y:14},angle:0,life:1,damage:10,owner:'player',speed:20,splash:0,weakpoint:1});
  tick(f.s,emptyInput(),.05); assert.equal(f.enemy.hp,8);
  const w=encounter(); w.enemy.pos={x:7.5,y:8};
  w.room.projectiles.push({id:'blocked',pos:{x:5.2,y:8},angle:0,life:1,damage:80,owner:'player',speed:20,splash:0,weakpoint:1});
  for(let i=0;i<4;i++)tick(w.s,emptyInput(),.05);
  assert.equal(w.enemy.hp,18); assert.equal(w.room.projectiles.length,0);
});

test('自动射击按实际视口选敌，不向小屏外盲射',()=>{
  const f=encounter(); f.enemy.pos={x:10,y:8};
  assert.equal(targetableEnemy(f.s,9,{width:320,height:480}),null);
  assert.equal(targetableEnemy(f.s,9,{width:414,height:896})?.id,f.enemy.id);
});
