import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBounds } from '../src/arena-bounds.ts';
import { isFree, moveBody } from '../src/geometry.ts';
import { dungeon } from '../src/content/registry.ts';
import { freshState } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { parseSave } from '../src/storage.ts';
import { spawnPoint, battleWorld } from '../src/battle.ts';
import { dungeonSchema } from '../src/content/schema.ts';

test('木地板外的码头装饰不可行走，持续移动和闪避不能穿过四边',()=>{
  const id='tide_colossus',b=arenaBounds(dungeon(id).arena);
  assert.equal(isFree(id,{x:17,y:22},.22),false);
  for(const [pos,delta] of [
    [{x:10,y:19},{x:0,y:20}], [{x:10,y:4},{x:0,y:-20}],
    [{x:4,y:14},{x:-20,y:0}], [{x:17,y:14},{x:20,y:0}],
  ]){
    moveBody(id,pos,delta,.22);assert.ok(isFree(id,pos,.22));
    assert.ok(pos.x>=b.minX+.22&&pos.x<=b.maxX-.22&&pos.y>=b.minY+.22&&pos.y<=b.maxY-.22);
  }
});

test('贴边时各类敌人只在地板内生成，且可到达玩家',()=>{
  const s=freshState();startRun(s);const r=s.run!;
  for(const pos of [{x:2.75,y:3.05},{x:18.25,y:3.05},{x:2.75,y:20.05},{x:18.25,y:20.05}]){
    r.player.pos=pos;
    for(const kind of ['beast','bug','cultist','guardian'] as const){
      const at=spawnPoint(r,0,kind);assert.ok(at);assert.ok(isFree(r.boss,at.pos,kind==='guardian'?dungeon(r.boss).boss.radius:dungeon(r.boss).minions[kind].radius));
    }
  }
});

test('边缘旧档恢复到最近安全点，进度与掉落不变，重复读档不再移动',()=>{
  const s=freshState();startRun(s);const r=s.run!;r.player.pos={x:17,y:22};r.player.hp=67;r.time=33;
  battleWorld(r).drops=[{id:'saved-xp',pos:{x:17,y:22},taken:false,xp:3}];
  r.battle!.pending=[{id:'saved-warning',kind:'beast',pos:{x:17,y:22},side:'south',remaining:.1}];
  const loaded=parseSave(JSON.stringify(s)),next=loaded.run!;
  assert.ok(isFree(r.boss,next.player.pos,.22));assert.equal(next.player.pos.x,17);
  assert.equal(next.player.hp,67);assert.equal(next.time,33);assert.equal(battleWorld(next).drops[0].xp,3);
  assert.ok(isFree(r.boss,battleWorld(next).drops[0].pos,.12));
  assert.ok(isFree(r.boss,next.battle!.pending[0].pos,dungeon(r.boss).minions.beast.radius));
  assert.equal(next.battle!.pending[0].remaining,dungeon(r.boss).combat.warning);
  assert.deepEqual(parseSave(JSON.stringify(loaded)),loaded);
});

test('无自定义范围的副本沿用原边界，错误范围与设施越界被拒绝',()=>{
  assert.deepEqual(arenaBounds({width:20,height:24}),{minX:1.5,maxX:18.5,minY:1.5,maxY:22.5});
  const pack=structuredClone(dungeon('tide_colossus'));
  pack.arena.bounds!.maxY=30;assert.equal(dungeonSchema.safeParse(pack).success,false);
  pack.arena.bounds!.maxY=10;assert.equal(dungeonSchema.safeParse(pack).success,false);
});
