import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, acceptQuest } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { emptyRoom } from '../src/battle.ts';
import { tick, emptyInput } from '../src/engine.ts';

test('旧存档中一级调查所抵达 Boss 区后，不会出现区域清理但没有 Boss 的死局',()=>{
  const state=freshState('legacy');acceptQuest(state,'K0');startRun(state);
  const run=state.run!;
  run.rooms=Array.from({length:7},(_,i)=>emptyRoom(i));
  Reflect.deleteProperty(run,'battle');Reflect.deleteProperty(run,'world');
  run.room=0;run.player.pos={x:6,y:8};run.player.invincible=.65;
  run.rooms[0].visited=true;
  for(let i=0;i<80;i++){run.player.hp=100;run.player.invincible=.65;tick(state,emptyInput(),.05);}
  assert.ok([...run.rooms,...(run.world?[run.world]:[])].some(room=>room.enemies.some(e=>e.kind==='guardian'&&e.hp>0)), 'Boss 区显示已清理，却从未生成 Boss');
});
