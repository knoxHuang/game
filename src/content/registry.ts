import catalog from './catalog.generated.json' with { type: 'json' };
import { dungeonSchema } from './schema.ts';
import type { DungeonDefinition, EnemyRole } from './schema.ts';

export const DUNGEONS: readonly DungeonDefinition[] = catalog.map(value => dungeonSchema.parse(value)).sort((a,b)=>a.danger-b.danger || a.map.order-b.map.order || a.id.localeCompare(b.id));
export const DUNGEONS_BY_ID: Readonly<Record<string,DungeonDefinition>> = Object.fromEntries(DUNGEONS.map(d=>[d.id,d]));
export function isDungeonId(id: unknown): id is string { return typeof id==='string' && Object.hasOwn(DUNGEONS_BY_ID,id); }
export function dungeon(id: string): DungeonDefinition {
  if (!isDungeonId(id)) throw new Error(`未知副本：${id}`);
  return DUNGEONS_BY_ID[id];
}
export function enemyDefinition(id: string, role: EnemyRole) { const d=dungeon(id); return role==='guardian'?d.boss:d.minions[role]; }
export function bossAttack(id: string, turn: number) { const attacks=dungeon(id).boss.attacks; return attacks[turn%attacks.length]; }
export const assetKey = (id: string, slot: string) => `dungeon:${id}:${slot}`;
