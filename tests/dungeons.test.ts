import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dungeonSchema } from '../src/content/schema.ts';
import { DUNGEONS, DUNGEONS_BY_ID, dungeon } from '../src/content/registry.ts';
import { worldRegion } from '../src/content/world-map.ts';
import { spriteFrame } from '../src/content/visuals.ts';
import { freshState, acceptQuest, finishRun } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { aliveEnemies, battleWorld, updateBattle } from '../src/battle.ts';
import { emptyInput, tick } from '../src/engine.ts';
import { parseSave, validState } from '../src/storage.ts';
import { checkContent } from '../scripts/content-check.ts';

export function investigation(id='tide_colossus') {
  const state=freshState('legacy');state.shop=2;state.tutorialDone=true;state.selectedBoss=id;state.bossReports=DUNGEONS.map(d=>d.id);
  // Engine fixtures exercise unfinished packs independently from the real departure gate.
  const pack=dungeon(id),status=pack.status,region=worldRegion(pack.map.region)!,charted=region.charted;
  try { pack.status='ready';Object.assign(region,{charted:true});assert.equal(acceptQuest(state,'K1'),null);assert.equal(startRun(state),null);return state; }
  finally { pack.status=status;Object.assign(region,{charted}); }
}
export function bossRun(id='tide_colossus') {
  const state=investigation(id),run=state.run!;run.time=dungeon(id).combat.waves[4].at;run.battle!.wave=4;run.battle!.batches=dungeon(id).combat.waves.map((w,i)=>i<4?w.batches:0);
  updateBattle(run,0);updateBattle(run,1);return state;
}
test('v3 存档与五波调查可正确往返保存',()=>{
  assert.ok(validState(freshState('legacy')));
  for(const d of DUNGEONS){const state=bossRun(d.id);assert.equal(aliveEnemies(state.run!)[0].hp,d.boss.hp);assert.deepEqual(parseSave(JSON.stringify(state)),state);}
});
test('教学调查使用默认主题，同样有五波与 Boss',()=>{
  const s=freshState('legacy');s.selectedBoss='cthulhu_avatar';acceptQuest(s,'K0');startRun(s);const r=s.run!;
  assert.equal(r.boss,'tide_colossus');r.time=105;r.battle!.wave=4;r.battle!.batches=dungeon(r.boss).combat.waves.map((w,i)=>i<4?w.batches:0);updateBattle(r,0);updateBattle(r,1);
  assert.ok(aliveEnemies(r).some(e=>e.kind==='guardian'));
});
test('新增副本 id、攻击参数与奖励无需扩展白名单',()=>{
  const fixture=structuredClone(dungeon('tide_colossus'));fixture.id='test_new_entity';fixture.name='测试显现';fixture.boss.hp=440;fixture.boss.rewards={crystal:7,iron:2};
  const fan=fixture.boss.attacks.find(a=>a.type==='fan')!;fan.damage=31;fan.speed=5.2;
  Object.assign(DUNGEONS_BY_ID,{[fixture.id]:dungeonSchema.parse(fixture)});
  try {
    const s=bossRun(fixture.id),r=s.run!,world=battleWorld(r),boss=aliveEnemies(r)[0];r.player.fireCd=2;
    assert.ok(validState(s));boss.mode='windup';boss.turn=1;boss.angle=Math.PI;boss.timer=fixture.boss.windup[0];tick(s,emptyInput(),.01);
    assert.equal(world.projectiles.length,fan.offsets.length);assert.ok(world.projectiles.every(p=>p.damage===31&&p.speed===5.2));assert.ok(validState(s));
    world.projectiles=[];boss.hp=1;boss.mode='recover';boss.timer=0;
    world.projectiles.push({id:'test-hit',pos:{...boss.pos},angle:0,life:1,damage:80,owner:'player',speed:0,splash:0,weakpoint:2});
    tick(s,emptyInput(),.01);assert.equal(boss.hp,0);assert.equal(r.materials.crystal,7);assert.equal(r.materials.iron,2);assert.equal(r.progress.K1,1);assert.equal(r.battle!.won,true);
    finishRun(s,true);assert.equal(s.quests[0].ready,true);assert.ok(validState(s));
  }finally{Reflect.deleteProperty(DUNGEONS_BY_ID,fixture.id);}
});
test('各副本第二阶段落点使用配置且位于当前交战区',()=>{
  for(const d of DUNGEONS){const s=bossRun(d.id),r=s.run!,world=battleWorld(r),boss=aliveEnemies(r)[0],ground=d.boss.attacks[0];if(ground.type!=='ground')continue;
    world.hazards=[];r.player.fireCd=2;boss.pos={x:r.player.pos.x+2,y:r.player.pos.y};boss.mode='chase';boss.hp=d.boss.hp*d.boss.phaseAt;tick(s,emptyInput(),.01);
    assert.equal(world.hazards.length,ground.phaseTwoOffsets.length);assert.ok(world.hazards.every(h=>h.damage===ground.damage&&h.pos.y>0&&h.pos.y<d.arena.height));assert.ok(validState(s));}
});
test('失败仍丢失未撤离战利品和新任务进度',()=>{const s=investigation();s.run!.materials.crystal=9;s.run!.progress.K1=1;finishRun(s,false);assert.equal(s.materials.crystal,0);assert.equal(s.quests[0].progress,0);assert.ok(validState(s));});
test('未知字段、非法第五波、缺失撤离和不完整美术均被拒绝',()=>{
  const base=structuredClone(DUNGEONS[0]);assert.equal(dungeonSchema.safeParse({...base,arbitraryMechanic:true}).success,false);
  assert.equal(dungeonSchema.safeParse({...base,boss:{...base.boss,attacks:[{type:'teleport'}]}}).success,false);
  base.arena.objects=[];assert.equal(dungeonSchema.safeParse(base).success,false);
  const bad=structuredClone(DUNGEONS[0]);bad.combat.waves[4].enemies.guardian=0;assert.equal(dungeonSchema.safeParse(bad).success,false);
  assert.equal(dungeonSchema.safeParse({...DUNGEONS[0],status:'ready'}).success,false);assert.equal(dungeonSchema.safeParse({...DUNGEONS[0],style:'another-style'}).success,false);
});
test('动作图集攻击停在末帧，移动循环',()=>{
  const pack=structuredClone(DUNGEONS[0]);pack.boss.sprite={type:'sheet',src:'/assets/dungeons/test/boss.png',frameSize:128,fps:8,anchor:{x:.5,y:.5},frames:{idle:[0,1],chase:[2,3],windup:[4],attack:[5,6],recover:[7],hurt:[8],defeat:[9,10]}};
  const sprite=dungeonSchema.parse(pack).boss.sprite;assert.equal(spriteFrame(sprite,'test','guardian','attack',9).frame,6);assert.equal(spriteFrame(sprite,'test','guardian','chase',.25).frame,2);assert.equal(spriteFrame(sprite,'test','guardian','defeat',9).frame,10);
});
test('自动发现第四包，拒绝缺图、重叠标记与断路',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'fog-content-'));try{
    for(const d of DUNGEONS)await copyFile(`src/content/dungeons/${d.id}.json`,join(dir,`${d.id}.json`));
    const pack=structuredClone(DUNGEONS[0]);pack.id='test_fourth_pack';pack.map={...pack.map,x:28,y:86,order:4};const file=join(dir,`${pack.id}.json`);await writeFile(file,JSON.stringify(pack));assert.equal((await checkContent(dir)).packs.length,4);assert.deepEqual((await checkContent(dir)).errors,[]);
    pack.map.requires=['missing_boss'];await writeFile(file,JSON.stringify(pack));assert.ok((await checkContent(dir)).errors.some(e=>e.includes('未知前置报告')));
    pack.map.requires=[pack.id];await writeFile(file,JSON.stringify(pack));assert.ok((await checkContent(dir)).errors.some(e=>e.includes('循环')));pack.map.requires=[];
    pack.map={...pack.map,x:54,y:17,order:4};await writeFile(file,JSON.stringify(pack));assert.ok((await checkContent(dir)).errors.some(e=>e.includes('过近')));pack.map={...pack.map,x:28,y:86,order:4};
    pack.art.portrait='/assets/dungeons/missing.png';await writeFile(file,JSON.stringify(pack));assert.ok((await checkContent(dir)).errors.some(e=>e.includes('missing.png')));pack.art.portrait=DUNGEONS[0].art.portrait;
    delete pack.arena.bounds;pack.arena.obstacles=Array.from({length:17},(_,i)=>({x:i+2,y:9}));await writeFile(file,JSON.stringify(pack));assert.ok((await checkContent(dir)).errors.some(e=>e.includes('隔断')));
  }finally{await rm(dir,{recursive:true,force:true});}
});
