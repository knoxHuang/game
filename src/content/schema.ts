import { z } from 'zod';

export const STYLE_ID = 'fog-harbor-pixel-v1';
export const DEFAULT_DUNGEON = 'tide_colossus';
export const LEGACY_SEGMENT_COUNT = 7;
export const LEGACY_SEGMENT_HEIGHT = 16;
export const LEGACY_WORLD_HEIGHT = LEGACY_SEGMENT_COUNT * LEGACY_SEGMENT_HEIGHT;
export const roles = ['beast', 'bug', 'cultist', 'guardian'] as const;
export const modes = ['idle', 'chase', 'windup', 'attack', 'recover'] as const;
const bounded = (min: number, max: number) => z.number().finite().min(min).max(max);
const text = z.string().trim().min(1).max(600);
const label = z.string().trim().min(1).max(40);
const point = z.strictObject({ x: bounded(2, 31), y: bounded(2, 31) });
const material = z.enum(['crystal', 'iron']);
const quest = z.enum(['K0', 'Q11', 'Q12', 'Q13', 'K1']);
const file = z.string().regex(/^\/assets\/[a-zA-Z0-9_/-]+\.(png|webp)$/);
const builtin = z.enum(['beast', 'bug', 'cultist', 'boss-tide_colossus', 'boss-many_eyed_priest', 'boss-cthulhu_avatar']);
const frameList = z.array(z.number().int().min(0)).min(1).max(32);
export const spriteSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('builtin'), key: builtin }),
  z.strictObject({ type: z.literal('sheet'), src: file, frameSize: z.union([z.literal(64), z.literal(128), z.literal(256), z.literal(512)]), fps: bounded(1, 16), anchor: z.strictObject({x:bounded(0,1),y:bounded(0,1)}), frames: z.strictObject({ idle: frameList, chase: frameList, windup: frameList, attack: frameList, recover: frameList, hurt: frameList, defeat: frameList }) }),
]);
const tileSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('builtin'), key: z.enum(['sea-floor', 'sea-wall', 'rock']) }),
  z.strictObject({ type: z.literal('image'), src: file }),
]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const rewards = z.strictObject({ energy: bounded(0, 10000).int().default(0), crystal: bounded(0, 10).int(), iron: bounded(0, 10).int() });
const source = z.strictObject({ title: text, url: z.url().regex(/^https:\/\//), evidence: text });
const minion = z.strictObject({
  name: label, relationship: text, energy: bounded(0, 1000).int().default(0), hp: bounded(1, 500), radius: bounded(.2, .6), size: bounded(.6, 2),
  speed: bounded(.1, 4), range: bounded(1, 8), keepAway: bounded(0, 5), windup: bounded(.5, 2), recover: bounded(.3, 3),
  damage: bounded(1, 40), projectileSpeed: bounded(.5, 8),
  drop: material, evidenceQuest: quest.nullable(), clearQuest: quest.nullable(), sprite: spriteSchema,
});
const ground = z.strictObject({ type: z.literal('ground'), offsets: z.array(bounded(-4, 4)).min(1).max(7), phaseTwoOffsets: z.array(bounded(-4, 4)).min(1).max(7), centerShift: bounded(-2, 2), damage: bounded(1, 40), radius: bounded(.3, 1), magic: z.boolean() });
const fan = z.strictObject({ type: z.literal('fan'), offsets: z.array(bounded(-1.4, 1.4)).min(1).max(9), phaseTwoOffsets: z.array(bounded(-1.4, 1.4)).min(1).max(9), damage: bounded(1, 40), speed: bounded(.5, 8) });
const arena = z.strictObject({
  name: label, width: bounded(18,28).int(), height: bounded(20,32).int(), entry: point,
  background: file.nullable(), obstacles: z.array(point).max(20),
  objects: z.array(z.strictObject({id:z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),kind:z.enum(['chest','exit']),at:point,material:material.nullable(),amount:bounded(0,10).int()})).max(12),
  hazards: z.array(point).max(8),
});
const waveSchema=z.array(z.strictObject({at:bounded(2,300),batches:bounded(1,8).int(),batchInterval:bounded(0,10),enemies:z.strictObject({beast:bounded(0,96).int(),bug:bounded(0,32).int(),cultist:bounded(0,16).int(),guardian:bounded(0,1).int()})})).length(5);
export const dungeonSchema = z.strictObject({
  schemaVersion: z.literal(3), style: z.literal(STYLE_ID), id: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),
  status: z.enum(['prototype','ready']), name: label, zone: label, description: text,
  danger: bounded(1, 3).int(), recommendedHealth: bounded(20, 1000), recommendedDps: bounded(1, 1000),
  unlockShop: z.union([z.literal(1), z.literal(2)]),
  map: z.strictObject({ x: bounded(5, 95), y: bounded(5, 95), order: bounded(0, 1000).int(), region: z.string().regex(/^[a-z][a-z0-9_]*$/).default('nearshore'), requires: z.array(z.string().regex(/^[a-z][a-z0-9_]{2,63}$/)).default([]) }),
  lore: z.strictObject({ kind: z.enum(['original','adaptation']), entity: text, sources: z.array(source).max(10), interpretation: text, reviewed: z.boolean() }),
  art: z.strictObject({ portrait: file, card: file.nullable(), brief: text, reviewed: z.boolean() }),
  biome: z.strictObject({ floor: z.tuple([color,color]), wall: color, wash: color, floorArt: tileSchema, wallArt: tileSchema, obstacleArt: tileSchema }),
  effects: z.strictObject({projectile: file.nullable(), ground: file.nullable()}),
  boss: z.strictObject({ hp: bounded(20, 500), radius: bounded(.6, 1.5), size: bounded(3, 5), tint: color, phaseAt: bounded(.2, .8), armor: bounded(.05, 1), windup: z.tuple([bounded(.6, 2),bounded(.6, 2)]), recover: z.tuple([bounded(.6, 3),bounded(.6, 3)]), attacks: z.array(z.discriminatedUnion('type',[ground,fan])).min(2).max(4), rewards, sprite: spriteSchema }),
  minions: z.strictObject({ beast: minion, bug: minion, cultist: minion }),
  combat: z.strictObject({ warning: bounded(.6, 1.5), safeDistance: bounded(2.5, 4), waves: waveSchema, rogueWaves: waveSchema.optional(), rogueBossHealth: bounded(100,10000).int().optional() }),
  arena,
}).superRefine((pack, ctx) => {
  const fail = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  if (pack.lore.kind === 'adaptation' && !pack.lore.sources.length) fail('改编神话必须提供原著来源与描述依据', ['lore','sources']);
  for(const [key,waves] of [['waves',pack.combat.waves],['rogueWaves',pack.combat.rogueWaves]] as const){
  if(!waves)continue;let total=0;
  waves.forEach((wave,i)=>{
    const count=Object.values(wave.enemies).reduce((a,b)=>a+b,0);total+=count;
    if(i<4&&(wave.enemies.guardian!==0||count<1))fail('前四波必须为普通怪', ['combat',key,i]);
    if(i===4&&(wave.enemies.guardian!==1||count!==1))fail('第五波必须为唯一 Boss', ['combat',key,i]);
    if(wave.batches>count || (i===4&&wave.batches!==1))fail('分批数量必须与敌群预算匹配', ['combat',key,i,'batches']);
    if(wave.batches>1&&wave.batchInterval<3)fail('小批次至少间隔3秒', ['combat',key,i,'batchInterval']);
    if(i<4 && wave.at+(wave.batches-1)*wave.batchInterval>=waves[i+1].at)fail('批次必须在下一阶段前开始', ['combat',key,i]);
    if(i>0&&wave.at-waves[i-1].at<10)fail('相邻波次至少间隔10秒', ['combat',key,i,'at']);
  });
  if(total>(key==='rogueWaves'?401:161))fail('整局敌人预算超限', ['combat',key]);
  }
  const inside=(p:{x:number;y:number})=>p.x>=2&&p.x<=pack.arena.width-2&&p.y>=2&&p.y<=pack.arena.height-2;
  if(!inside(pack.arena.entry)||[...pack.arena.obstacles,...pack.arena.hazards,...pack.arena.objects.map(o=>o.at)].some(p=>!inside(p)))fail('场地坐标越界', ['arena']);
  if(!pack.arena.objects.some(o=>o.kind==='exit'))fail('场地必须保留撤离信标', ['arena','objects']);
  if(new Set(pack.arena.objects.map(o=>o.id)).size!==pack.arena.objects.length)fail('场地设施 id 必须唯一', ['arena','objects']);
  if(pack.arena.objects.some(o=>o.kind==='chest'&&(!o.material||o.amount<1)))fail('补给箱需要材料和数量', ['arena','objects']);
  const occupied=(p:{x:number;y:number})=>pack.arena.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<1);
  if(occupied(pack.arena.entry)||pack.arena.objects.some(o=>occupied(o.at)))fail('入口或设施与障碍重叠', ['arena']);
  if (pack.status === 'ready') {
    if (!pack.art.reviewed) fail('完整副本需要按基准图完成视觉审核', ['art','reviewed']);
    if (!pack.effects.projectile || !pack.effects.ground) fail('完整副本需要主题攻击特效', ['effects']);
    if (!pack.lore.reviewed) fail('完整副本需要神话与改编审核', ['lore','reviewed']);
    if (!pack.arena.background) fail('完整副本需要独立战区背景', ['arena','background']);
    if (!pack.art.card) fail('完整副本需要独立绘图卡', ['art','card']);
    if ([pack.boss.sprite,...Object.values(pack.minions).map(m=>m.sprite)].some(a=>a.type==='builtin')) fail('完整副本需要专用动作图集，不能引用历史共用战斗资产', ['boss','sprite']);
    if ([pack.biome.floorArt,pack.biome.wallArt,pack.biome.obstacleArt].some(a=>a.type==='builtin')) fail('完整副本需要主题场景美术', ['biome']);
  }
});
export type DungeonDefinition = z.infer<typeof dungeonSchema>;
export type SpriteDefinition = z.infer<typeof spriteSchema>;
export type EnemyRole = typeof roles[number];
export type EnemyMode = typeof modes[number];
export const colorNumber = (color: string) => Number.parseInt(color.slice(1),16);
