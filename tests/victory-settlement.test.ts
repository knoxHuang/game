import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, finishRun } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { battleWorld, winBattle } from '../src/battle.ts';
import { parseSave, validState } from '../src/storage.ts';

test('Boss胜利后退出仍成功结算，收齐掉落并只发一次奖励', () => {
  const s = freshState();
  s.quests = [{ id:'K1', progress:0, ready:false, instance:1 }];
  startRun(s);
  const run = s.run!;
  run.rogue!.research = 40;
  battleWorld(run).drops.push(
    { id:'boss-material', pos:{x:10,y:15}, material:'crystal', amount:2, taken:false },
    { id:'boss-evidence', pos:{x:10,y:15}, quest:'K1', taken:false },
  );
  winBattle(run);
  const summary = finishRun(s, false)!;
  assert.equal(summary.success, true);
  assert.equal(s.quests[0].ready, true);
  assert.equal(s.materials.crystal, 2);
  assert.equal(s.research!.energy, 40);
  assert.equal(s.gold, 45);
  assert.ok(s.bossReports?.includes(run.boss));
  assert.equal(validState(s), true);
  const loaded = parseSave(JSON.stringify(s));
  assert.equal(finishRun(loaded, false), null);
  assert.equal(loaded.gold, 45);
  assert.equal(loaded.materials.crystal, 2);
});

test('未击败Boss的主动结束仍为失败，不伪造胜利或报告', () => {
  const s = freshState(); startRun(s);
  assert.equal(finishRun(s, false)?.success, false);
  assert.equal(s.bossReports?.length ?? 0, 0);
});

test('胜利自动收取掉落时遵守余额上限，结算仍能保存',()=>{
  const s=freshState();startRun(s);const r=s.run!;
  r.materials.crystal=1e9;r.rogue!.gold=1e9;r.rogue!.research=1e9;
  battleWorld(r).drops.push({id:'extra',pos:{x:10,y:14},material:'crystal',amount:3,taken:false});
  winBattle(r);finishRun(s,true);
  assert.equal(s.summary!.materials.crystal,1e9);assert.equal(validState(s),true);
});
