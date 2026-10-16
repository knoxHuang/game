import { freshRogue } from './roguelite.ts';
import { emptyRoom, combatWaves } from './battle.ts';
import { dungeonAccess, emptyMaterials, maxHealth } from './model.ts';
import type { GameState } from './model.ts';
import { dungeon } from './content/registry.ts';
import { DEFAULT_DUNGEON } from './content/schema.ts';

export function startRun(s:GameState):string|null {
  if(s.run)return '已经有一次进行中的调查。';
  const tutorial=s.quests.some(q=>!q.ready&&q.id==='K0'),definition=dungeon(tutorial?DEFAULT_DUNGEON:s.selectedBoss),arena=definition.arena;
  const access=dungeonAccess(s,definition.id);
  if(!access.available)return access.reasons.join('；');
  const world=emptyRoom(0);
  world.objects=arena.objects.map(o=>({id:`arena-${o.id}`,kind:o.kind,pos:{...o.at},used:false,...(o.material?{material:o.material,amount:o.amount}:{})}));
  world.hazards=arena.hazards.map((pos,i)=>({id:`arena-surge-${i}`,pos:{...pos},phase:0,hit:false,boss:false}));
  s.run={id:++s.sequence,room:0,boss:definition.id,time:0,
    player:{pos:{...arena.entry},hp:maxHealth(s),potions:s.extraPotion?2:1,facing:-Math.PI/2,action:'none',timer:0,angle:-Math.PI/2,dodgeCd:0,skillCd:0,fireCd:0,invincible:0,hits:[]},
    battle:{version:3,wave:0,batches:[0,0,0,0,0],won:false,pending:[]},world,rooms:[emptyRoom(0)],
    materials:emptyMaterials(),progress:{},survey:0,harm:{},potionsUsed:0,tutorial};
  if(s.research){s.run.rogue=freshRogue(s.career,s.sequence*2654435761);s.run.player.hp=maxHealth(s);}
  s.run.battle!.batches=combatWaves(s.run).map(()=>0);
  s.extraPotion=false;s.summary=null;return null;
}
