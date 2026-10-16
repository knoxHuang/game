import type { Enemy, Room, Run, SpawnWarning, Vec } from './model.ts';
import { dungeon, enemyDefinition } from './content/registry.ts';
import { roles, LEGACY_WORLD_HEIGHT } from './content/schema.ts';
import { battleCamera } from './battle-camera.ts';
import { distance, isFree, nearestFreePoint, pathDirection } from './geometry.ts';

export const emptyRoom=(id:number):Room=>({id,enemies:[],objects:[],drops:[],hazards:[],projectiles:[],visited:true,grace:0,encounter:'pending',wave:0,waveDelay:0});
export const battleWorld=(run:Run):Room=>run.world??run.rooms[run.room];
export const combatWaves=(run:Run)=>{const c=dungeon(run.boss).combat;return run.rogue&&c.rogueWaves?c.rogueWaves:c.waves;};
export const bossHealth=(run:Run)=>{const d=dungeon(run.boss);return run.rogue?(d.combat.rogueBossHealth??d.boss.hp):d.boss.hp;};
export const aliveEnemies=(run:Run)=>battleWorld(run).enemies.filter(e=>e.hp>0);

// Upgrade old in-flight saves without clearing the character, loot or quests.
export function ensureBattle(run:Run):void {
  if(run.battle?.version===3&&run.world)return;
  const previous=run.battle,world=run.world??emptyRoom(0),definition=dungeon(run.boss);
  if(!run.world)for(const room of run.rooms){
    world.enemies.push(...room.enemies);world.objects.push(...room.objects);world.drops.push(...room.drops);
    world.hazards.push(...room.hazards);world.projectiles.push(...room.projectiles);
  }
  const clearedBoss=world.objects.some(o=>o.id.endsWith('-extraction'));
  const wave=previous?.wave??(world.enemies.some(e=>e.kind==='guardian')||clearedBoss?5:Math.min(4,Math.max(0,6-run.room)));
  if(!previous){run.time=wave===0?Math.min(run.time,definition.combat.waves[0].at-1):definition.combat.waves[wave-1].at;if(run.room===0&&wave<5)run.time=definition.combat.waves[4].at;}
  const project=(point:Vec,radius:number)=>nearestFreePoint(run.boss,{x:2+(point.x-1.5)/10*(definition.arena.width-4),y:2+(point.y-1.5)/(LEGACY_WORLD_HEIGHT-3)*(definition.arena.height-4)},radius);
  run.player.pos=project(run.player.pos,.22);
  for(const enemy of world.enemies){enemy.pos=project(enemy.pos,enemyDefinition(run.boss,enemy.kind).radius);enemy.home=project(enemy.home,enemyDefinition(run.boss,enemy.kind).radius);}
  for(const item of [...world.objects,...world.drops,...world.hazards,...world.projectiles])item.pos=project(item.pos,.12);
  const pending=previous?.pending??[];for(const item of pending)item.pos=project(item.pos,enemyDefinition(run.boss,item.kind).radius);
  run.world=world;run.room=0;run.rooms=[emptyRoom(0)];
  run.battle={version:3,wave,won:previous?.won??false,pending,batches:definition.combat.waves.map((w,i)=>i<wave?w.batches:0)};
  if(clearedBoss)winBattle(run);
}

function spawnArea(run:Run,kind:Enemy['kind'],viewport:{width:number;height:number}) {
  const camera=battleCamera(viewport.width,viewport.height,run.player.pos,dungeon(run.boss).arena,kind==='guardian'||aliveEnemies(run).some(e=>e.kind==='guardian'));
  const actor=enemyDefinition(run.boss,kind),margin=kind==='guardian'?actor.size/2:.4;
  return {minY:camera.minY+margin,maxY:camera.maxY-margin,left:Math.max(camera.minX+margin,1.5+actor.radius+.25),right:Math.min(camera.maxX-margin,dungeon(run.boss).arena.width-1.5-actor.radius-.25)};
}
function candidates(run:Run,index:number,kind:Enemy['kind'],viewport:{width:number;height:number}):{pos:Vec;side:SpawnWarning['side']}[] {
  const {minY,maxY,left,right}=spawnArea(run,kind,viewport);
  const sides:SpawnWarning['side'][]=['north','east','south','west'];
  const result:{pos:Vec;side:SpawnWarning['side']}[]=[];
  // Search the intended side before falling back, so one blocked point does not erase that direction.
  for(let sideOffset=0;sideOffset<4;sideOffset++)for(let attempt=0;attempt<8;attempt++) {
    const side=sides[(index+sideOffset)%4],fraction=[.2,.5,.8,.35,.65,.1,.9,.42][(Math.floor(index/4)+attempt)%8];
    const pos=side==='north'?{x:left+fraction*(right-left),y:minY}:side==='south'?{x:left+fraction*(right-left),y:maxY}:side==='west'?{x:left,y:minY+fraction*(maxY-minY)}:{x:right,y:minY+fraction*(maxY-minY)};
    result.push({pos,side});
  }
  // Additional safe cells let later waves coexist without reusing occupied edge points.
  for(let y=minY;y<=maxY;y+=.95)for(let x=left;x<=right;x+=.95){
    const dx=x-run.player.pos.x,dy=y-run.player.pos.y;
    result.push({pos:{x,y},side:Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north'});
  }
  return result;
}
export function spawnPoint(run:Run,index:number,kind:Enemy['kind'],viewport={width:360,height:640}) {
  const world=battleWorld(run),radius=enemyDefinition(run.boss,kind).radius;
  return candidates(run,index,kind,viewport).find(({pos})=>
    distance(pos,run.player.pos)>=dungeon(run.boss).combat.safeDistance+(kind==='guardian'?.8:0)
    &&isFree(run.boss,pos,radius)
    &&(kind==='guardian'||world.enemies.every(e=>e.hp<=0||distance(pos,e.pos)>=radius+enemyDefinition(run.boss,e.kind).radius+.2))
    &&(kind==='guardian'||(run.battle?.pending??[]).every(p=>p.queued||distance(pos,p.pos)>=radius+enemyDefinition(run.boss,p.kind).radius+.15))
    &&pathDirection(run.boss,pos,run.player.pos,radius)!==null);
}
export function updateBattle(run:Run,dt:number,viewport={width:360,height:640}):{changed:boolean;messages:string[]} {
  ensureBattle(run);const state=run.battle!,world=run.world!,definition=dungeon(run.boss),messages:string[]=[];
  if(state.won)return {changed:false,messages};
  let changed=false;
  const waves=combatWaves(run);
  for(let waveIndex=0;waveIndex<waves.length;waveIndex++) {
    const wave=waves[waveIndex];if(run.time+1e-7<wave.at)break;
    state.wave=Math.max(state.wave,waveIndex+1);
    while(state.batches![waveIndex]<wave.batches&&run.time+1e-7>=wave.at+state.batches![waveIndex]*wave.batchInterval){
      const batch=state.batches![waveIndex]++;
      for(const kind of roles){
        const count=Math.floor(wave.enemies[kind]*(batch+1)/wave.batches)-Math.floor(wave.enemies[kind]*batch/wave.batches);
        for(let i=0;i<count;i++){
          const id=`timed-${run.id}-${waveIndex}-${batch}-${kind}-${i}`,index=state.pending.length+waveIndex*3+batch*4;
          const at=spawnPoint(run,index,kind,viewport);
          const queued=!!run.rogue&&(!at||(kind!=='guardian'&&world.enemies.filter(e=>e.hp>0).length+state.pending.filter(p=>!p.queued).length>=90));
          const elite=!!run.rogue&&waveIndex>=2&&kind==='cultist'&&i===0&&batch===Math.ceil(wave.batches/wave.enemies.cultist)-1;
          state.pending.push({...(run.rogue?{queued,elite}:{}),id,kind,pos:at?.pos??{...run.player.pos},side:at?.side??'north',remaining:definition.combat.warning});
        }
      }
      if(batch===0)messages.push(waveIndex===4?`${definition.name}正在显现！`:`第 ${waveIndex+1} / 5 阶段 · 敌群持续来袭`);
      changed=true;
    }
  }
  const retained:SpawnWarning[]=[];let placements=0;
  for(const pending of state.pending) {
    if(pending.queued){
      if(pending.kind!=='guardian'&&(world.enemies.filter(e=>e.hp>0).length+retained.filter(p=>!p.queued).length>=90||placements>=4)){retained.push(pending);continue;}
      placements++;const at=spawnPoint(run,retained.length+state.wave,pending.kind,viewport);
      if(at){pending.pos=at.pos;pending.side=at.side;pending.queued=false;pending.remaining=definition.combat.warning;changed=true;}
      retained.push(pending);continue;
    }
    pending.remaining=Math.max(0,pending.remaining-dt);
    if(pending.remaining>0){retained.push(pending);continue;}
    if(run.rogue&&pending.kind!=='guardian'&&world.enemies.filter(e=>e.hp>0).length>=90){pending.queued=true;retained.push(pending);continue;}
    const radius=enemyDefinition(run.boss,pending.kind).radius;
    const area=spawnArea(run,pending.kind,viewport);
    if(pending.pos.x<area.left||pending.pos.x>area.right||pending.pos.y<area.minY||pending.pos.y>area.maxY||distance(pending.pos,run.player.pos)<definition.combat.safeDistance||!isFree(run.boss,pending.pos,radius)||(pending.kind!=='guardian'&&world.enemies.some(e=>e.hp>0&&distance(e.pos,pending.pos)<radius+enemyDefinition(run.boss,e.kind).radius+.1))) {
      const at=spawnPoint(run,retained.length+state.wave,pending.kind,viewport);
      if(at){pending.pos=at.pos;pending.side=at.side;}else if(run.rogue)pending.queued=true;pending.remaining=definition.combat.warning;retained.push(pending);changed=true;continue;
    }
    const pos={...pending.pos};
    world.enemies.push({id:pending.id,kind:pending.kind,pos,home:{...pos},hp:pending.kind==='guardian'?bossHealth(run):enemyDefinition(run.boss,pending.kind).hp*(pending.elite?2:1),...(pending.elite?{elite:true}:{}),mode:'chase',timer:0,angle:Math.PI/2,turn:0,hit:false,flash:0,lost:0});changed=true;
  }
  state.pending=retained;
  return {changed,messages};
}
export function winBattle(run:Run):void {
  if(!run.battle||run.battle.won)return;
  run.battle.won=true;run.battle.pending=[];
  const world=battleWorld(run);
  world.enemies=world.enemies.filter(e=>e.kind==='guardian');world.projectiles=[];world.hazards=[];
  for(const drop of world.drops)if(!drop.taken)drop.pos={...run.player.pos};
  world.objects.push({id:`victory-exit-${run.id}`,kind:'exit',pos:{...run.player.pos},used:false});
}
