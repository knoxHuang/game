import { dungeon } from './content/registry.ts';
import type { Vec } from './model.ts';
import { arenaBounds } from './arena-bounds.ts';

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const direction = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);

export function isFree(dungeonId: string, p: Vec, radius: number): boolean {
  const arena=dungeon(dungeonId).arena;
  const b=arenaBounds(arena);
  if(p.x-radius<b.minX||p.x+radius>b.maxX||p.y-radius<b.minY||p.y+radius>b.maxY)return false;
  for(const obstacle of arena.obstacles) {
    const x=Math.max(obstacle.x-.5,Math.min(p.x,obstacle.x+.5));
    const y=Math.max(obstacle.y-.5,Math.min(p.y,obstacle.y+.5));
    if(Math.hypot(p.x-x,p.y-y)<radius)return false;
  }
  return true;
}
export function moveBody(dungeonId: string, p: Vec, delta: Vec, radius: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 0.1));
  const before = { ...p };
  for (let i = 0; i < steps; i++) {
    const x = p.x + delta.x / steps;
    if (isFree(dungeonId, { x, y: p.y }, radius)) p.x = x;
    const y = p.y + delta.y / steps;
    if (isFree(dungeonId, { x: p.x, y }, radius)) p.y = y;
  }
  return distance(before, p) > 0.001;
}
export function lineClear(dungeonId: string, a: Vec, b: Vec, radius = 0.02): boolean {
  const count = Math.ceil(distance(a, b) * 12);
  for (let i = 1; i < count; i++) {
    const p = { x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count };
    if (!isFree(dungeonId, p, radius)) return false;
  }
  return true;
}
export function pathDirection(dungeonId: string, from: Vec, to: Vec, radius = 0.31): number | null {
  if (lineClear(dungeonId, from, to, radius)) return direction(from, to);
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  // A small player can stand beside cover that the pursuer cannot occupy.
  // Route to an adjacent body-safe cell rather than an unreachable target cell.
  const goal = nearestFreePoint(dungeonId,{ x: Math.round(to.x), y: Math.round(to.y) },radius,true);
  const key = (p: Vec) => `${p.x},${p.y}`;
  const queue: { p: Vec; first: Vec | null }[] = [{ p: start, first: null }];
  const seen = new Set([key(start)]);
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if ((node.p.x === goal.x && node.p.y === goal.y) || distance(node.p,to) <= radius + .22) return direction(from, node.first ?? to);
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const p = { x: node.p.x + d.x, y: node.p.y + d.y };
      if (seen.has(key(p)) || !isFree(dungeonId, p, radius)) continue;
      seen.add(key(p)); queue.push({ p, first: node.first ?? p });
    }
  }
  return null;
}

export function nearestFreePoint(id:string,point:Vec,radius:number,snapToGrid=false):Vec {
  if(isFree(id,point,radius)&&(!snapToGrid||(Number.isInteger(point.x)&&Number.isInteger(point.y))))return {...point};
  const arena=dungeon(id).arena,b=arenaBounds(arena);
  const clamped={x:Math.max(b.minX+radius,Math.min(point.x,b.maxX-radius)),y:Math.max(b.minY+radius,Math.min(point.y,b.maxY-radius))};
  if(!snapToGrid&&isFree(id,clamped,radius))return clamped;
  let best:Vec|undefined;
  for(let y=2;y<=arena.height-2;y++)for(let x=2;x<=arena.width-2;x++){
    const candidate={x,y};if(isFree(id,candidate,radius)&&(!best||distance(point,candidate)<distance(point,best)))best=candidate;
  }
  if(!best)throw new Error('战区没有可用的安全位置');return best;
}
