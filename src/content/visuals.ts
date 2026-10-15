import { assetKey } from './registry.ts';
import type { SpriteDefinition } from './schema.ts';
export function spriteFrame(sprite: SpriteDefinition, dungeonId: string, role: string, mode: string, time: number): { key: string; frame?: number } {
  if (sprite.type==='builtin') return {key:sprite.key};
  const action = mode in sprite.frames ? mode as keyof typeof sprite.frames : 'idle';
  const frames=sprite.frames[action];
  const index=Math.max(0,Math.floor(time*sprite.fps));
  return { key:assetKey(dungeonId,role), frame:frames[action==='idle'||action==='chase'?index%frames.length:Math.min(index,frames.length-1)] };
}
