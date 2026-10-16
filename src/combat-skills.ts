import type { GameEvent } from './engine.ts';
import type { Enemy, GameState } from './model.ts';
import { battleWorld } from './battle.ts';
import { distance, lineClear } from './geometry.ts';
import { rogueArea, rogueCooldown, rogueDamage, skillLevel } from './roguelite.ts';

type Hit=(enemy:Enemy,damage:number)=>void;
export function tickAutoSkills(s:GameState,dt:number,hit:Hit,visual:(event:GameEvent)=>void){
  const run=s.run!,r=run.rogue;if(!r)return;
  const world=battleWorld(run),p=run.player;
  const targets=()=>world.enemies.filter(e=>e.hp>0&&lineClear(run.boss,p.pos,e.pos)).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos));
  const power=rogueDamage(s),area=rogueArea(s);
  for(const id of ['lantern','arc','tide','bell'] as const){
    const level=skillLevel(s,id);if(!level)continue;
    r.cooldowns[id]=Math.max(0,(r.cooldowns[id]??0)-dt);
    if(r.cooldowns[id]!>0)continue;
    const enemies=targets();if(!enemies.length)continue;
    if(id==='lantern'){
      r.cooldowns[id]=.8*rogueCooldown(s);
      for(const e of enemies)if(distance(p.pos,e.pos)<(1.2+level*.18)*area)hit(e,(5+level*3)*power);
    }else if(id==='arc'){
      r.cooldowns[id]=2*rogueCooldown(s);
      let origin=p.pos;
      for(let i=0;i<level+1;i++){
        const target=enemies.filter(e=>e.hp>0&&distance(origin,e.pos)<4.5&&lineClear(run.boss,origin,e.pos)).sort((a,b)=>distance(origin,a.pos)-distance(origin,b.pos))[0];
        if(!target)break;visual({kind:'ability',ability:'arc',pos:{...target.pos},from:{...origin}});hit(target,(10+level*4)*power);origin=target.pos;enemies.splice(enemies.indexOf(target),1);
      }
    }else if(id==='tide'){
      if(distance(p.pos,enemies[0].pos)>7)continue;
      r.cooldowns[id]=3.2*rogueCooldown(s);
      if(r.fields.length<8)r.fields.push({pos:{...enemies[0].pos},life:3,pulse:0,level});
    }else{
      r.cooldowns[id]=3.5*rogueCooldown(s);
      visual({kind:'ability',ability:'bell',pos:{...p.pos},radius:(2.2+level*.3)*area});
      for(const e of enemies)if(distance(p.pos,e.pos)<(2.2+level*.3)*area)hit(e,(15+level*6)*power);
    }
  }
  for(const field of r.fields){
    field.life-=dt;field.pulse-=dt;
    if(field.pulse<=0){field.pulse+=.65;for(const e of world.enemies)if(e.hp>0&&distance(field.pos,e.pos)<(1+field.level*.16)*area&&lineClear(run.boss,field.pos,e.pos))hit(e,(5+field.level*3)*power);}
  }
  r.fields=r.fields.filter(f=>f.life>0);
}
