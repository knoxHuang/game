import { SKILLS, EQUIPMENT, mainSkill, eligibleOffers } from './roguelite.ts';
import type { RogueRun, SkillId } from './roguelite.ts';
import { dungeon, isDungeonId } from './content/registry.ts';
import { ensureBattle, combatWaves, bossHealth } from './battle.ts';
import type { GameState } from './model.ts';
import { QUESTS, maxHealth } from './model.ts';

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = 0, max = 1e9) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const bool = (v: unknown) => typeof v === 'boolean';
const str = (v: unknown) => typeof v === 'string' && v.length < 160;
const materials = (v: unknown) => record(v) && num(v.crystal) && num(v.iron);
const progress = (v: unknown) => record(v) && Object.entries(v).every(([k, n]) => Object.hasOwn(QUESTS, k) && num(n, 0, 6));
const harm = (v: unknown) => record(v) && Object.entries(v).every(([k, n]) => k.length < 50 && num(n));
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);

const integer=(v:unknown,min=0,max=1e9)=>num(v,min,max)&&Number.isInteger(v);
const equipmentId=(v:unknown)=>typeof v==='string'&&Object.hasOwn(EQUIPMENT,v);
function validResearch(v:unknown):boolean{
  if(!record(v)||!integer(v.energy)||!record(v.training)||!integer(v.training.power,0,5)||!integer(v.training.vitality,0,5)||!Array.isArray(v.inventory)||v.inventory.length>6||!v.inventory.every(equipmentId)||new Set(v.inventory).size!==v.inventory.length||!record(v.equipped)||!Array.isArray(v.careers)||!v.careers.length||v.careers.length>3||!v.careers.every(c=>oneOf(c,['investigator','occultist','harpooner']))||new Set(v.careers).size!==v.careers.length||(v.converted!==undefined&&!bool(v.converted)))return false;
  return Object.entries(v.equipped).every(([slot,id])=>equipmentId(id)&&EQUIPMENT[id as keyof typeof EQUIPMENT].slot===slot&&(v.inventory as unknown[]).includes(id));
}
function validRogue(v:unknown,career:GameState['career'],arena:{width:number;height:number}):boolean{
  if(!record(v)||!integer(v.xp)||!integer(v.level,1,1000)||v.picks!==Number(v.level)-1||!integer(v.seed,0,4294967295)||!integer(v.rerolls,0,1)||!integer(v.awakeTokens,0,2)||!integer(v.gold)||!integer(v.research)||!integer(v.wavePaid,0,5)||!record(v.skills)||!record(v.cooldowns)||!Array.isArray(v.offers)||v.offers.length>3||new Set(v.offers).size!==v.offers.length||!Array.isArray(v.awakenings)||v.awakenings.length>1||!v.awakenings.every(id=>id===mainSkill(career))||!Array.isArray(v.equipment)||v.equipment.length>6||!v.equipment.every(equipmentId)||!Array.isArray(v.fields)||v.fields.length>8)return false;
  const entries=Object.entries(v.skills);
  if(!entries.every(([id,n])=>Object.hasOwn(SKILLS,id)&&integer(n,1,SKILLS[id as SkillId].max))||!v.skills[mainSkill(career)]||entries.filter(([id])=>['revolver','sigil','harpoon'].includes(id)).length!==1||entries.filter(([id])=>SKILLS[id as SkillId].kind==='attack').length>3||entries.filter(([id])=>SKILLS[id as SkillId].kind==='support').length>3)return false;
  const pool=eligibleOffers(v as unknown as RogueRun);
  return v.offers.every(id=>oneOf(id,[...pool,'heal','salvage','supply']))&&Object.entries(v.cooldowns).every(([id,n])=>Object.hasOwn(SKILLS,id)&&num(n,0,10))&&v.fields.every(f=>record(f)&&record(f.pos)&&num(f.pos.x,0,arena.width)&&num(f.pos.y,0,arena.height)&&num(f.life,0,3)&&num(f.pulse,-.05,.65)&&integer(f.level,1,5));
}
export function validState(v: unknown): v is GameState {
  if (!record(v) || v.schema !== 3 || !oneOf(v.career, ['investigator', 'occultist', 'harpooner']) || !isDungeonId(v.selectedBoss) || !oneOf(v.shop, [1, 2]) || !oneOf(v.weapon, [0, 1]) || !oneOf(v.armor, [0, 1]) || !oneOf(v.depth, [1, 2]) || !bool(v.skill) || !bool(v.tutorialDone) || !bool(v.extraPotion) || !num(v.gold) || !num(v.sequence) || !materials(v.materials)) return false;
  if(v.research!==undefined&&(!validResearch(v.research)||!(v.research as Record<string,unknown[]>).careers.includes(v.career)))return false;
  if (v.energy !== undefined && (!num(v.energy) || !Number.isInteger(v.energy))) return false;
  if (v.bossReports !== undefined && (!Array.isArray(v.bossReports) || !v.bossReports.every(isDungeonId) || new Set(v.bossReports).size !== v.bossReports.length)) return false;
  if (v.armorEquipped !== undefined && !bool(v.armorEquipped)) return false;
  if (!record(v.settings) || !bool(v.settings.music) || !bool(v.settings.sound) || !bool(v.settings.reducedMotion)) return false;
  if (!Array.isArray(v.quests) || v.quests.length > 2 || !v.quests.every(q => record(q) && str(q.id) && Object.hasOwn(QUESTS, String(q.id)) && num(q.progress, 0, 6) && bool(q.ready) && num(q.instance))) return false;
  if (v.run !== null) {
    const r = v.run;
    if (!record(r) || !num(r.id) || !Number.isInteger(r.room) || !num(r.room, 0, 6) || !isDungeonId(r.boss) || !num(r.time) || !materials(r.materials) || !progress(r.progress) || !harm(r.harm) || !num(r.survey, 0, 2.1) || !num(r.potionsUsed, 0, 2) || !bool(r.tutorial)) return false;
    if (r.energyGained !== undefined && (!num(r.energyGained) || !Number.isInteger(r.energyGained))) return false;
    const arenaRun=record(r.battle)&&r.battle.version===3,arena=dungeon(String(r.boss)).arena;
    const vec=(v:unknown)=>record(v)&&num(v.x,0,arenaRun?arena.width:13)&&num(v.y,0,arenaRun?arena.height:112);
    if(r.rogue!==undefined&&(!v.research||!validRogue(r.rogue,v.career as GameState['career'],arena)))return false;
    if(v.research&&!r.rogue)return false;
    const p = r.player;
    if (!record(p) || !vec(p.pos) || !num(p.hp, 0, maxHealth(v as unknown as GameState)) || !num(p.potions, 0, 2) || !num(p.facing, -Math.PI, Math.PI) || !num(p.angle, -Math.PI, Math.PI) || !oneOf(p.action, ['none', 'attack', 'dodge', 'skill', 'hurt']) || !num(p.timer, 0, 1) || !num(p.dodgeCd, 0, 1.2) || !num(p.skillCd, 0, 6) || !num(p.fireCd, 0, 2) || !num(p.invincible, 0, 0.8) || !Array.isArray(p.hits) || !p.hits.every(str)) return false;
    if (!Array.isArray(r.rooms) || r.rooms.length !== (arenaRun?1:7) || (arenaRun&&r.room!==0)) return false;
    if((r.battle===undefined)!==(r.world===undefined))return false;
    if(arenaRun){const b=r.battle;if(!record(b)||!Array.isArray(b.batches)||b.batches.length!==5||!b.batches.every((n,i)=>num(n,0,combatWaves(r as unknown as GameState['run'] & {})[i].batches)&&Number.isInteger(n)))return false;}
    if(r.battle!==undefined){const b=r.battle;if(!record(b)||!oneOf(b.version,[2,3])||!num(b.wave,0,5)||!Number.isInteger(b.wave)||!bool(b.won)||!Array.isArray(b.pending)||b.pending.length>(r.rogue?401:161)||!b.pending.every(p=>record(p)&&str(p.id)&&(p.queued===undefined||bool(p.queued))&&(p.elite===undefined||bool(p.elite))&&oneOf(p.kind,['beast','bug','cultist','guardian'])&&vec(p.pos)&&num(p.remaining,0,1.5)&&oneOf(p.side,['north','east','south','west'])))return false;}
    for (const room of [...r.rooms,...(r.world===undefined?[]:[r.world])]) {
      const global=room===r.world;
      if (!record(room) || !num(room.id, 0, 6) || !bool(room.visited) || !num(room.grace, 0, 0.8) || !oneOf(room.encounter, ['pending', 'active', 'clear']) || !num(room.wave, 0, 10) || !num(room.waveDelay, 0, 2)) return false;
      if (!Array.isArray(room.enemies) || room.enemies.length > (global?176:8) || !room.enemies.every(e => record(e) && str(e.id) && oneOf(e.kind, ['beast', 'bug', 'cultist', 'guardian']) && vec(e.pos) && vec(e.home) && num(e.hp, 0, r.rogue?(e.kind==='guardian'?bossHealth(r as unknown as GameState['run'] & {}):1000):500) && (e.elite===undefined||bool(e.elite)) && oneOf(e.mode, ['idle', 'chase', 'windup', 'attack', 'recover']) && num(e.timer, -1, 1e9) && num(e.angle, -Math.PI, Math.PI) && num(e.turn) && bool(e.hit) && num(e.flash, 0, 0.08) && num(e.lost))) return false;
      if (!Array.isArray(room.objects) || room.objects.length > (global?96:10) || !room.objects.every(o => record(o) && str(o.id) && oneOf(o.kind, ['exit', 'chest', 'find', 'survey', 'seal']) && vec(o.pos) && bool(o.used) && (o.material === undefined || oneOf(o.material, ['crystal', 'iron'])) && (o.amount === undefined || num(o.amount, 0, 10)) && (o.quest === undefined || (str(o.quest) && Object.hasOwn(QUESTS, String(o.quest)))))) return false;
      if (!Array.isArray(room.drops) || room.drops.length > (global?512:64) || !room.drops.every(d => record(d) && str(d.id) && vec(d.pos) && (d.material === undefined || oneOf(d.material, ['crystal', 'iron'])) && (d.amount === undefined || num(d.amount, 0, 10)) && (d.quest === undefined || (str(d.quest) && Object.hasOwn(QUESTS, String(d.quest)))) && (d.xp===undefined||integer(d.xp,0,1000)) && bool(d.taken))) return false;
      if (!Array.isArray(room.hazards) || room.hazards.length > (global?512:64) || !room.hazards.every(h => record(h) && str(h.id) && vec(h.pos) && num(h.phase, -0.3, 4) && bool(h.hit) && bool(h.boss) && (h.magic === undefined || bool(h.magic)) && (h.damage === undefined || num(h.damage,1,40)) && (h.radius === undefined || num(h.radius,.3,1)))) return false;
      if (!Array.isArray(room.projectiles) || room.projectiles.length > (global?1024:128) || !room.projectiles.every(b => record(b) && str(b.id) && vec(b.pos) && num(b.angle, -Math.PI, Math.PI) && num(b.life, 0, 3) && num(b.damage, 0, 500) && oneOf(b.owner, ['player', 'enemy']) && num(b.speed, 0, 20) && num(b.splash, 0, 2) && (b.blastChain===undefined||bool(b.blastChain)) && (b.pierce===undefined||integer(b.pierce,0,8)) && (b.hits===undefined||(Array.isArray(b.hits)&&b.hits.length<=8&&b.hits.every(str))) && num(b.weakpoint, 1, 4) && (b.effect === undefined || oneOf(b.effect, ['none', 'stun', 'seal', 'anchor'])))) return false;
    }
  }
  if (v.summary !== null) {
    const s = v.summary;
    if(record(s)&&s.rogue!==undefined){const r=s.rogue;if(!record(r)||!integer(r.level,1,1000)||!integer(r.gold)||!integer(r.research)||!Array.isArray(r.equipment)||!r.equipment.every(equipmentId))return false;}
    if (record(s) && s.energyGained !== undefined && (!num(s.energyGained) || !Number.isInteger(s.energyGained))) return false;
    if (!record(s) || !bool(s.success) || !materials(s.materials) || !progress(s.progress) || !harm(s.harm) || !num(s.potionsUsed, 0, 2) || !Array.isArray(s.ready) || !s.ready.every(id => str(id) && Object.hasOwn(QUESTS, String(id)))) return false;
  }
  return true;
}
export function parseSave(text: string): GameState {
  const value: unknown = JSON.parse(text);
  if (!validState(value)) throw new Error('存档格式或数据不符合当前版本。');
  if(value.run)ensureBattle(value.run);
  if(!validState(value))throw new Error('旧调查无法转换为当前战区。');
  return value;
}
export class SaveStore {
  private db: IDBDatabase | null = null;
  private queue: Promise<void> = Promise.resolve();
  async open(): Promise<void> {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('fog-harbor-investigator-v3', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('save');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('无法打开本机存档。'));
      request.onblocked = () => reject(new Error('请关闭其他游戏标签页后重试。'));
    });
    this.db.onversionchange = () => { this.db?.close(); this.db = null; };
  }
  async raw(key='profile'): Promise<string | null> {
    const db = this.db;
    if (!db) throw new Error('本机存储不可用。');
    return new Promise((resolve, reject) => {
      const tx = db.transaction('save', 'readonly');
      const req = tx.objectStore('save').get(key);
      let result: unknown;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(typeof result === 'string' ? result : null);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async load(): Promise<GameState | null> { const text = await this.raw(); return text === null ? null : parseSave(text); }
  save(s: GameState, backup?: GameState): Promise<void> {
    if (!validState(s)) return Promise.reject(new Error('当前游戏状态无效，保存已暂停。'));
    const text = JSON.stringify(s), backupText=backup?JSON.stringify(backup):undefined;
    const write = async () => {
      const db = this.db;
      if (!db) throw new Error('本机存储不可用。');
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('save', 'readwrite');
        const objects=tx.objectStore('save');
        if(backupText!==undefined){const previous=objects.get('legacy-before-roguelite');previous.onsuccess=()=>{if(previous.result===undefined)objects.put(backupText,'legacy-before-roguelite');};}
        objects.put(text, 'profile');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('无法保存进度。'));
        tx.onabort = () => reject(tx.error ?? new Error('存档写入已中断。'));
      });
    };
    this.queue = this.queue.catch(() => {}).then(write);
    return this.queue;
  }
}
