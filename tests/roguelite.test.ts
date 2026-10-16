import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, finishRun, maxHealth, careerStats, acceptQuest } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { emptyInput, tick } from '../src/engine.ts';
import { parseSave, validState } from '../src/storage.ts';
import { addLocalXp, chooseSkill, localRequired, eligibleOffers, rerollSkills, train, equip, improveEquipment, unlockCareer, convertLegacy, SKILLS } from '../src/roguelite.ts';
import type { SkillId } from '../src/roguelite.ts';
import { combatWaves, battleWorld, updateBattle } from '../src/battle.ts';

function playing(){const s=freshState();assert.equal(startRun(s),null);return s;}
test('新档局内经验与研究能量分离，三选一冻结全部战斗，重载不洗牌',()=>{
  const s=playing(),r=s.run!.rogue!;
  assert.equal(maxHealth(s),110);assert.equal(r.level,1);addLocalXp(r,localRequired(1)+localRequired(2));
  assert.equal(r.offers.length,3);const choices=[...r.offers];
  const before=JSON.stringify(s);tick(s,emptyInput(),.05);assert.equal(JSON.stringify(s),before);
  const loaded=parseSave(before);assert.deepEqual(loaded.run!.rogue!.offers,choices);
  assert.equal(chooseSkill(s,r.offers[0]),null);assert.equal(r.level,2);assert.equal(r.offers.length,3);
  assert.equal(s.research!.energy,0);assert.equal(r.xp,localRequired(2));
  assert.equal(rerollSkills(s),null);assert.equal(r.rerolls,0);assert.notEqual(rerollSkills(s),null);
  assert.equal(validState(s),true);
});
test('攻击与辅助各三槽，满阶不再出现；精英机会与配件共同开放觉醒',()=>{
  const s=playing(),r=s.run!.rogue!;
  r.skills={revolver:5,lantern:5,arc:5,compass:3,watch:3,lining:3};
  assert.deepEqual(eligibleOffers(r),[]);r.awakeTokens=1;
  assert.deepEqual(eligibleOffers(r),['awaken:revolver']);
  addLocalXp(r,12);assert.equal(r.offers.length,3);assert.equal(r.offers[0],'awaken:revolver');
  assert.equal(chooseSkill(s,'awaken:revolver'),null);assert.deepEqual(r.awakenings,['revolver']);assert.equal(r.awakeTokens,0);
  assert.equal(eligibleOffers(r).length,0);assert.equal(validState(s),true);
});
test('普通击杀只留下局内能量掉落，靠近拾取后升级，不直接增加永久等级',()=>{
  const s=playing(),run=s.run!,world=battleWorld(run);run.player.pos={x:10,y:14};run.player.fireCd=2;
  world.enemies=[{id:'test-beast',kind:'beast',pos:{x:10,y:15.2},home:{x:10,y:15.2},hp:1,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}];
  world.projectiles=[{id:'shot',owner:'player',pos:{x:10,y:15},angle:Math.PI/2,damage:20,speed:12,life:1,splash:0,weakpoint:1}];
  tick(s,emptyInput(),.05);assert.equal(run.rogue!.research,1);assert.equal(s.research!.energy,0);
  const drop=world.drops.find(d=>d.xp);assert.ok(drop);assert.equal(run.rogue!.xp,0);
  run.player.pos={...drop.pos};tick(s,emptyInput(),.05);assert.equal(run.rogue!.xp,2);
  const loaded=parseSave(JSON.stringify(s));tick(loaded,emptyInput(),.05);assert.equal(loaded.run!.rogue!.xp,2);
});
test('失败结算只保留已收集永久资源，案件不推进；新局从一级重置且不重复结算',()=>{
  const s=freshState();acceptQuest(s,'K0');startRun(s);const r=s.run!.rogue!;
  r.gold=25;r.research=35;r.equipment=['pocket_compass'];r.level=4;r.picks=3;r.skills.lantern=2;s.run!.materials.iron=2;s.run!.progress.K0=1;
  const summary=finishRun(s,false)!;
  assert.equal(summary.rogue!.level,4);assert.equal(s.research!.energy,35);assert.equal(s.gold,25);assert.equal(s.materials.iron,2);assert.equal(s.quests[0].progress,0);
  assert.ok(s.research!.inventory.includes('pocket_compass'));assert.equal(finishRun(s,false),null);assert.equal(s.gold,25);
  startRun(s);assert.equal(s.run!.rogue!.level,1);assert.deepEqual(s.run!.rogue!.skills,{revolver:1});assert.equal(validState(s),true);
});
test('训练、装备强化和转职校验条件，永久攻防封顶且局内不许修改',()=>{
  const s=freshState();s.gold=10000;s.research!.energy=10000;s.materials.iron=100;
  assert.notEqual(unlockCareer(s,'occultist'),null);s.tutorialDone=true;const gold=s.gold;
  assert.equal(unlockCareer(s,'occultist'),null);assert.equal(s.gold,gold);assert.equal(unlockCareer(s,'harpooner'),null);assert.equal(s.gold,gold-60);
  assert.equal(improveEquipment(s,'oilskin'),null);assert.equal(improveEquipment(s,'oilskin'),'已经拥有强化版本。');
  for(let i=0;i<5;i++){assert.equal(train(s,'power'),null);assert.equal(train(s,'vitality'),null);}
  assert.equal(maxHealth(s),140);assert.notEqual(train(s,'power'),null);assert.equal(equip(s,'diving_coat'),null);
  startRun(s);assert.notEqual(train(s,'power'),null);assert.notEqual(equip(s,'oilskin'),null);assert.equal(validState(s),true);
  const base=careerStats(s).damage;s.run!.rogue!.skills.magazine=3;assert.ok(careerStats(s).damage>base);
});
test('旧档保持旧规则，只能返所显式转换且不重复补偿',()=>{
  const s=freshState('legacy');s.energy=500;s.weapon=1;s.armor=1;s.skill=true;
  startRun(s);assert.notEqual(convertLegacy(s),null);finishRun(s,false);
  const original=JSON.stringify(s);assert.equal(parseSave(original).research,undefined);
  assert.equal(convertLegacy(s),null);assert.equal(s.research!.energy,500);assert.equal(s.energy,500);assert.equal(maxHealth(s),120);
  assert.notEqual(convertLegacy(s),null);assert.equal(s.research!.energy,500);assert.equal(s.gold,90);assert.equal(s.materials.crystal,4);assert.equal(s.materials.iron,2);assert.equal(validState(s),true);
});
test('非法研究、技能、候选、装备、冷却与新旧调查混搭都拒绝',()=>{
  const s=playing();assert.equal(validState(s),true);
  for(const mutate of [(v:any)=>v.research.energy=-1,(v:any)=>v.research.equipped.armor='service_revolver',(v:any)=>v.run.rogue.skills.revolver=6,(v:any)=>v.run.rogue.offers=['bogus'],(v:any)=>v.run.rogue.cooldowns.arc=Infinity,(v:any)=>delete v.run.rogue]){const bad=structuredClone(s);mutate(bad);assert.equal(validState(bad),false);}
});
test('新三阶段时间表及预算与旧档分开，90只同屏上限不丢后续批次',()=>{
  const s=playing(),run=s.run!,waves=combatWaves(run);
  assert.deepEqual(waves.map(w=>w.at),[5,50,100]);assert.equal(waves.reduce((a,w)=>a+Object.values(w.enemies).reduce((x,y)=>x+y,0),0),149);
  run.time=99;updateBattle(run,1.5);updateBattle(run,1.5);
  assert.ok(battleWorld(run).enemies.filter(e=>e.hp>0).length<=90);assert.ok(run.battle!.pending.length>0);assert.equal(validState(s),true);
  const old=freshState('legacy');startRun(old);assert.equal(combatWaves(old.run!)[4].at,105);
});
test('每条自动公共技能造成真实伤害，贯穿命中不会重复命中同一敌人',()=>{
  for(const id of ['lantern','arc','tide','bell'] as SkillId[]){
    const s=playing(),run=s.run!,room=battleWorld(run);run.rogue!.skills[id]=1;run.player.fireCd=2;
    room.enemies=[{id:'victim',kind:'beast',pos:{x:run.player.pos.x+.8,y:run.player.pos.y},home:{...run.player.pos},hp:100,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}];
    tick(s,emptyInput(),.05);assert.ok(room.enemies[0].hp<100,id);assert.equal(validState(s),true);
  }
  const s=playing(),run=s.run!,room=battleWorld(run);run.player.fireCd=2;
  room.enemies=[0,1].map(i=>({id:`victim-${i}`,kind:'beast',pos:{x:10,y:14+i*.8},home:{x:10,y:14+i*.8},hp:100,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}));
  room.projectiles=[{id:'pierce',owner:'player',pos:{x:10,y:13.6},angle:Math.PI/2,damage:20,speed:12,life:1,splash:0,weakpoint:1,pierce:2,hits:[]}];
  for(let i=0;i<3;i++)tick(s,emptyInput(),.05);
  assert.deepEqual(room.enemies.map(e=>e.hp),[80,80]);
});

test('人物贴住窄缝时，三种竖屏仍能为大体型Boss找到生成路径',async()=>{
  const {spawnPoint,bossHealth}=await import('../src/battle.ts');
  for(const viewport of [{width:320,height:480},{width:360,height:640},{width:414,height:896}]){
    const s=playing(),run=s.run!;run.player.pos={x:7.623570450466336,y:8.682111193696862};
    assert.ok(spawnPoint(run,0,'guardian',viewport));assert.equal(bossHealth(run),1200);
  }
});
test('三职业觉醒分别改变弹幕、爆炸与贯穿，状态可保存',()=>{
  for(const career of ['investigator','occultist','harpooner'] as const){
    const s=freshState();s.career=career;s.research!.careers=['investigator','occultist','harpooner'];startRun(s);
    const run=s.run!,r=run.rogue!,main=career==='investigator'?'revolver':career==='occultist'?'sigil':'harpoon';
    const support=career==='investigator'?'compass':career==='occultist'?'coil':'magazine';
    r.skills[main]=5;r.skills[support]=3;r.awakenings=[main];
    battleWorld(run).enemies=[{id:'target',kind:'beast',pos:{x:run.player.pos.x+3,y:run.player.pos.y},home:{...run.player.pos},hp:100,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}];
    tick(s,emptyInput(),.01);const shots=battleWorld(run).projectiles.filter(p=>p.owner==='player');
    assert.equal(shots.length,career==='occultist'?1:career==='investigator'?6:3);
    if(career==='occultist'){assert.equal(shots[0].splash,2);assert.equal(shots[0].blastChain,true);}else assert.ok(shots.every(p=>(p.pierce??0)>=2));
    assert.equal(validState(s),true);assert.deepEqual(parseSave(JSON.stringify(s)).run!.rogue!.awakenings,[main]);
  }
});
test('两段进攻各出现一只耐打精英，不被批次取整漏掉',()=>{
  const s=playing(),run=s.run!;run.time=33;updateBattle(run,0);
  assert.ok(run.battle!.pending.some(p=>p.elite&&p.id.includes('-0-4-beast-0')));
  run.time=74;updateBattle(run,0);
  assert.ok(run.battle!.pending.some(p=>p.elite&&p.id.includes('-1-3-beast-0')));
  assert.equal(validState(s),true);
});

test('觉醒符弹产生真实二次爆裂，沿目标连锁且不会只改变图标',()=>{
  const s=playing(),run=s.run!,room=battleWorld(run);run.player.fireCd=2;
  room.enemies=[0,1.4,2.5].map((x,i)=>({id:`chain-${i}`,kind:'beast',pos:{x:10+x,y:14.8},home:{x:10+x,y:14.8},hp:50,mode:'recover',timer:0,angle:0,turn:0,hit:false,flash:0,lost:0}));
  room.projectiles=[{id:'chain-shot',owner:'player',pos:{x:10,y:14.5},angle:Math.PI/2,damage:10,speed:12,life:1,splash:0,weakpoint:1,blastChain:true}];
  const result=tick(s,emptyInput(),.05);
  assert.deepEqual(room.enemies.map(e=>e.hp),[40,43,46.5]);
  assert.ok(result.events.some(e=>e.kind==='ability'&&e.ability==='sigil'));
});

test('高余额结算保持存档有效，不因超出余额上限卡在调查中',()=>{
  const s=playing();s.gold=1e9;s.research!.energy=1e9;s.materials={crystal:1e9,iron:1e9};
  s.run!.rogue!.gold=100;s.run!.rogue!.research=344;s.run!.materials={crystal:2,iron:2};
  finishRun(s,false);assert.equal(validState(s),true);assert.equal(s.gold,1e9);assert.equal(s.research!.energy,1e9);
});
