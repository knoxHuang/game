import { DUNGEONS_BY_ID } from './content/registry.ts';
export type Material = 'crystal' | 'iron';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type CareerId = 'investigator' | 'occultist' | 'harpooner';
export type BossId = string;
export type QuestId = 'K0' | 'Q11' | 'Q12' | 'Q13' | 'K1';
export type Vec = { x: number; y: number };
export type Quest = { id: QuestId; progress: number; ready: boolean; instance: number };
export type Enemy = {
  id: string; kind: 'beast' | 'bug' | 'cultist' | 'guardian'; pos: Vec; home: Vec; hp: number;
  mode: 'idle' | 'chase' | 'windup' | 'attack' | 'recover'; timer: number;
  angle: number; turn: number; hit: boolean; flash: number; lost: number;
};
export type WorldObject = {
  id: string; kind: 'exit' | 'chest' | 'find' | 'survey' | 'seal'; pos: Vec;
  used: boolean; material?: Material; amount?: number; quest?: QuestId;
};
export type Drop = { id: string; pos: Vec; material?: Material; amount?: number; quest?: QuestId; taken: boolean };
export type Hazard = { id: string; pos: Vec; phase: number; hit: boolean; boss: boolean; magic?: boolean; damage?: number; radius?: number };
export type Projectile = {
  id: string; pos: Vec; angle: number; life: number; damage: number;
  owner: 'player' | 'enemy'; speed: number; splash: number; weakpoint: number;
  effect?: 'none' | 'stun' | 'seal' | 'anchor';
};
export type Room = {
  id: number; enemies: Enemy[]; objects: WorldObject[]; drops: Drop[];
  hazards: Hazard[]; projectiles: Projectile[]; visited: boolean; grace: number;
  encounter: 'pending' | 'active' | 'clear'; wave: number; waveDelay: number;
};
export type Player = {
  pos: Vec; facing: number; hp: number; potions: number;
  action: 'none' | 'attack' | 'dodge' | 'skill' | 'hurt'; timer: number;
  angle: number; dodgeCd: number; skillCd: number; fireCd: number; invincible: number;
  hits: string[];
};
export type SpawnWarning = { id: string; kind: Enemy['kind']; pos: Vec; remaining: number; side: 'north'|'east'|'south'|'west' };
export type BattleState = { version: 2 | 3; batches?: number[]; wave: number; won: boolean; pending: SpawnWarning[] };
export type Run = {
  id: number; room: number; boss: BossId; time: number; player: Player;
  battle?: BattleState; world?: Room;
  rooms: Room[]; materials: Record<Material, number>; progress: Partial<Record<QuestId, number>>;
  survey: number; harm: Record<string, number>; potionsUsed: number; tutorial: boolean;
};
export type Summary = {
  success: boolean; materials: Record<Material, number>; ready: QuestId[];
  progress: Partial<Record<QuestId, number>>; harm: Record<string, number>; potionsUsed: number;
};
export type GameState = {
  schema: 3; shop: 1 | 2; career: CareerId; selectedBoss: BossId; weapon: 0 | 1; armor: 0 | 1; armorEquipped?: boolean; skill: boolean;
  gold: number; materials: Record<Material, number>; tutorialDone: boolean;
  depth: 1 | 2; quests: Quest[]; sequence: number; extraPotion: boolean;
  settings: { music: boolean; sound: boolean; reducedMotion: boolean };
  run: Run | null; summary: Summary | null;
};
export type QuestDefinition = {
  id: QuestId; title: string; npc: 'ali' | 'lanzhou'; description: string;
  type: 'find' | 'clear' | 'survey' | 'boss'; goal: number; gold: number;
  reward: Record<Material, number>; icon: string;
};
export type CareerDefinition = {
  name: string; weaponName: string; description: string; attack: string; skill: string;
  damage: number; cooldown: number; speed: number; range: number; splash: number; weakpoint: number;
};

export const CAREERS: Record<CareerId, CareerDefinition> = {
  investigator: { name: '异闻枪手', weaponName: '黄铜左轮', description: '射速稳定，射程均衡，适合初次调查。', attack: '照明弹', skill: '照明弹标记', damage: 10, cooldown: 0.42, speed: 8, range: 7.5, splash: 0, weakpoint: 1.8 },
  occultist: { name: '秘仪师', weaponName: '仪式符弹', description: '符弹较慢，命中后扩散，对群体更有效。', attack: '符弹', skill: '封印阵', damage: 13, cooldown: 0.72, speed: 6, range: 6.8, splash: 0.48, weakpoint: 1.6 },
  harpooner: { name: '鱼叉猎手', weaponName: '鱼叉枪', description: '装填较慢，单发强力，Boss 弱点伤害更高。', attack: '鱼叉', skill: '锚索', damage: 21, cooldown: 1.02, speed: 10, range: 9, splash: 0, weakpoint: 2.6 },
};
export const BOSSES = DUNGEONS_BY_ID;
export type BossRisk = { health: number; dps: number; grade: '优势' | '均衡' | '高危'; healthOk: boolean; dpsOk: boolean };
export function bossRisk(s: GameState, id: BossId): BossRisk {
  const boss = BOSSES[id], stats = careerStats(s), health = maxHealth(s), dps = stats.damage / stats.cooldown;
  const healthRatio = health / boss.recommendedHealth, dpsRatio = dps / boss.recommendedDps;
  const minRatio = Math.min(healthRatio, dpsRatio);
  const grade = minRatio >= 1.15 ? '优势' : minRatio >= 0.8 ? '均衡' : '高危';
  return { health, dps, grade, healthOk: healthRatio >= 0.8, dpsOk: dpsRatio >= 0.8 };
}

export const QUESTS: Record<QuestId, QuestDefinition> = {
  K0: { id: 'K0', title: '回收失联船员的无线电', npc: 'ali', description: '击败沉船区的潮蛰兽，回收它吞下的防水无线电，再安全撤离。', type: 'find', goal: 1, gold: 80, reward: { crystal: 2, iron: 2 }, icon: 'radio' },
  Q11: { id: 'Q11', title: '采集黑潮样本', npc: 'ali', description: '击败附蛰虫并拾取其携带的异常组织样本，带回调查所。', type: 'find', goal: 1, gold: 60, reward: { crystal: 2, iron: 0 }, icon: 'sample' },
  Q12: { id: 'Q12', title: '清除潮蛰兽', npc: 'ali', description: '清除六只在船坞游荡的潮蛰兽。成功撤离后保留已完成的数量。', type: 'clear', goal: 6, gold: 80, reward: { crystal: 0, iron: 3 }, icon: 'beast' },
  Q13: { id: 'Q13', title: '回收秘仪符片', npc: 'ali', description: '击败沉船区的溺亡秘仪师，拾取一片刻有异常符号的符片。', type: 'find', goal: 1, gold: 70, reward: { crystal: 0, iron: 3 }, icon: 'device' },
  K1: { id: 'K1', title: '挑战选定的区域 Boss', npc: 'lanzhou', description: '出发前选择一处调查副本，击败对应的巨型克苏鲁生物并带回组织样本。', type: 'boss', goal: 1, gold: 160, reward: { crystal: 5, iron: 5 }, icon: 'seal' },
};
export const MATERIAL_NAMES: Record<Material, string> = { crystal: '异变样本', iron: '铜合金零件' };
export const emptyMaterials = (): Record<Material, number> => ({ crystal: 0, iron: 0 });
export const wearingArmor = (s: GameState) => s.armorEquipped !== false;
export const maxHealth = (s: GameState) => s.armor && wearingArmor(s) ? 120 : 100;
export function setArmorEquipped(s: GameState, equipped: boolean): string | null {
  if (s.run) return '调查进行中，返回调查所后才能更换护具。';
  s.armorEquipped = equipped;
  return null;
}
export const careerStats = (s: GameState) => {
  const career = CAREERS[s.career] ?? CAREERS.investigator;
  return { ...career, damage: career.damage * (s.weapon ? 1.25 : 1) };
};
export const attackDamage = (s: GameState) => Math.round(careerStats(s).damage);
export const availableQuests = (s: GameState): QuestId[] => !s.tutorialDone ? ['K0'] : s.shop === 2 && s.depth === 1 ? ['K1', 'Q11', 'Q12', 'Q13'] : ['Q11', 'Q12', 'Q13'];
export function freshState(): GameState {
  return { schema: 3, shop: 1, career: 'investigator', selectedBoss: 'tide_colossus', weapon: 0, armor: 0, armorEquipped: true, skill: false, gold: 0, materials: emptyMaterials(), tutorialDone: false, depth: 1, quests: [], sequence: 0, extraPotion: false, settings: { music: true, sound: true, reducedMotion: false }, run: null, summary: null };
}
export function acceptQuest(s: GameState, id: QuestId): string | null {
  if (s.run) return '回到调查所后才能接取案件。';
  if (!availableQuests(s).includes(id)) return '这项案件尚未开放。';
  if (s.quests.some(q => q.id === id)) return '已经接取这项案件。';
  if (s.quests.length >= (s.tutorialDone ? 2 : 1)) return '请先提交或放弃当前案件。';
  s.quests.push({ id, progress: 0, ready: false, instance: ++s.sequence });
  return null;
}
export function abandonQuest(s: GameState, id: QuestId): string | null {
  if (s.run) return '调查中不能放弃案件。';
  s.quests = s.quests.filter(q => q.id !== id);
  return null;
}
export function deliverQuest(s: GameState, id: QuestId): string | null {
  if (s.run) return '成功撤离后再提交。';
  const q = s.quests.find(q => q.id === id);
  if (!q?.ready) return '这项案件还没有完成。';
  const def = QUESTS[id];
  s.gold += def.gold;
  s.materials.crystal += def.reward.crystal;
  s.materials.iron += def.reward.iron;
  s.quests = s.quests.filter(q => q.id !== id);
  if (id === 'K0') s.tutorialDone = true;
  if (id === 'K1') s.depth = 2;
  return null;
}
export type UpgradeId = 'weapon' | 'armor' | 'skill' | 'shop';
export const UPGRADES: Record<UpgradeId, { title: string; gold: number; crystal: number; iron: number; description: string }> = {
  weapon: { title: '武器校准', gold: 50, crystal: 2, iron: 1, description: '远程伤害提高 25% · 为职业武器调整枪机和瞄具' },
  armor: { title: '防水护具', gold: 50, crystal: 0, iron: 3, description: '生命 100 → 120 · 加固外勤防护服' },
  skill: { title: '职业能力', gold: 90, crystal: 4, iron: 2, description: '解锁当前职业的强化弹药 · 冷却 6 秒' },
  shop: { title: '扩建调查所', gold: 180, crystal: 8, iron: 8, description: '建立研究与整备区 · 守夜人顾檀到访并开放巨像案件' },
};
export function upgradeStatus(s: GameState, id: UpgradeId): string | null {
  if (s.run) return '撤回调查所后再整备。';
  if ((id === 'weapon' && s.weapon) || (id === 'armor' && s.armor) || (id === 'skill' && s.skill) || (id === 'shop' && s.shop === 2)) return '已完成';
  if (id === 'skill' && s.shop < 2) return '扩建调查所后开放';
  const u = UPGRADES[id];
  const missing: string[] = [];
  if (s.gold < u.gold) missing.push(`冥币 ${u.gold - s.gold}`);
  if (s.materials.crystal < u.crystal) missing.push(`${MATERIAL_NAMES.crystal} ${u.crystal - s.materials.crystal}`);
  if (s.materials.iron < u.iron) missing.push(`${MATERIAL_NAMES.iron} ${u.iron - s.materials.iron}`);
  return missing.length ? `还需 ${missing.join('、')}` : null;
}
export function buyUpgrade(s: GameState, id: UpgradeId): string | null {
  const error = upgradeStatus(s, id);
  if (error) return error;
  const u = UPGRADES[id];
  s.gold -= u.gold; s.materials.crystal -= u.crystal; s.materials.iron -= u.iron;
  if (id === 'weapon') s.weapon = 1;
  if (id === 'armor') s.armor = 1;
  if (id === 'skill') s.skill = true;
  if (id === 'shop') s.shop = 2;
  return null;
}
export function finishRun(s: GameState, success: boolean): Summary | null {
  const run = s.run;
  if (!run) return null;
  const ready: QuestId[] = [];
  if (success) {
    s.materials.crystal += run.materials.crystal;
    s.materials.iron += run.materials.iron;
    for (const q of s.quests) {
      q.progress = Math.min(QUESTS[q.id].goal, q.progress + (run.progress[q.id] ?? 0));
      q.ready = q.progress >= QUESTS[q.id].goal;
      if (q.ready) ready.push(q.id);
    }
  }
  const summary: Summary = { success, materials: { ...run.materials }, ready, progress: { ...run.progress }, harm: { ...run.harm }, potionsUsed: run.potionsUsed };
  s.summary = summary; s.run = null;
  return summary;
}
export function usePotion(s: GameState): string | null {
  const p = s.run?.player;
  if (!p) return '请先进入调查区。';
  if (p.potions === 0) return '补给已用完。';
  if (p.hp >= maxHealth(s)) return '生命已满。';
  p.potions--; p.hp = Math.min(maxHealth(s), p.hp + 40);
  s.run!.potionsUsed++;
  return null;
}
