import {freshState,usePotion,finishRun} from '../src/model.ts';
import {startRun} from '../src/maps.ts';
import {tick,emptyInput} from '../src/engine.ts';
import {battleWorld,combatWaves} from '../src/battle.ts';
import {chooseSkill,mainSkill} from '../src/roguelite.ts';
import {pathDirection,distance} from '../src/geometry.ts';
import {validState} from '../src/storage.ts';
const results=[];
for(const career of ['investigator','occultist','harpooner'] as const)for(const initial of [101,202]){
 let seed=initial;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const s=freshState();s.career=career;s.research!.careers=['investigator','occultist','harpooner'];startRun(s);
 const run=s.run!,r=run.rogue!,points=[{x:4,y:12},{x:10,y:5},{x:16,y:12},{x:10,y:20}];let target=0,firstUpgrade:number|null=null,bossHp:number|null=null,maxEnemies=0;
 for(let i=0;i<6000;i++){
  if(r.offers.length){if(firstUpgrade===null)firstUpgrade=run.time;
   const main=mainSkill(career);
   const score=(o:string)=>o.startsWith('awaken:')?200:o===main?(r.skills[main]!<3?120:70):['lantern','arc','bell','tide'].includes(o)?(Object.keys(r.skills).length<3?110:45):o==='compass'?85:o==='lining'?60:30;
   chooseSkill(s,[...r.offers].sort((a,b)=>score(b)-score(a))[0]);continue;
  }
  if(run.player.hp<50&&run.player.potions)usePotion(s);
  if(distance(run.player.pos,points[target])<.5)target=(target+1)%points.length;
  const angle=pathDirection(run.boss,run.player.pos,points[target],.22),input=emptyInput();input.viewport={width:360,height:640};
  if(angle!==null)input.move={x:Math.cos(angle),y:Math.sin(angle)};
  input.dodge=run.player.dodgeCd===0&&battleWorld(run).enemies.some(e=>e.hp>0&&distance(e.pos,run.player.pos)<1.1);
  const result=tick(s,input,.05);maxEnemies=Math.max(maxEnemies,battleWorld(run).enemies.filter(e=>e.hp>0).length);
  if(run.battle!.wave===combatWaves(run).length&&bossHp===null)bossHp=run.player.hp;
  if(i%100===0&&!validState(s))throw new Error('Invalid simulation save '+career+' '+run.time);
  if(result.dead||run.battle!.won)break;
 }
 const row={career,seed:initial,time:Math.round(run.time),hp:run.player.hp,won:run.battle!.won,level:r.level,firstUpgrade:Math.round(firstUpgrade??-1),bossArrivalHp:bossHp,maxEnemies,skills:r.skills};
 if(run.battle!.won)finishRun(s,true);
 if(!validState(s))throw new Error('Invalid result');results.push(row);process.stdout.write(JSON.stringify(row)+'\n');
}
