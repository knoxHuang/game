import type { Vec } from './model.ts';

export const BATTLE_HUD_HEIGHT = 80;
export const BOSS_HUD_HEIGHT = 28;

export function battleCamera(width:number,height:number,player:Vec,arena:{width:number;height:number},hasBoss:boolean) {
  const top=BATTLE_HUD_HEIGHT+4+(hasBoss?BOSS_HUD_HEIGHT+4:0),fieldHeight=Math.max(12,height-top-160),tile=Math.max(12,Math.floor(width/12));
  const clamp=(desired:number,visible:number,world:number,origin:number)=>world<=visible?origin+(visible-world)/2:Math.max(origin+visible-world,Math.min(origin,desired));
  const ox=clamp(width/2-(player.x-.5)*tile,width,arena.width*tile,0);
  const oy=clamp(top+fieldHeight*.5-(player.y-.5)*tile,fieldHeight,arena.height*tile,top);
  return {tile,ox,oy,top,fieldHeight,
    minX:Math.max(2.3,(12-ox)/tile+.5),maxX:Math.min(arena.width-2.3,(width-12-ox)/tile+.5),
    minY:Math.max(2.3,(top+12-oy)/tile+.5),maxY:Math.min(arena.height-2.3,(top+fieldHeight-12-oy)/tile+.5)};
}
