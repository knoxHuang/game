import { tickAutoSkills } from './combat-skills.ts';
import { addLocalXp, pickupRadius, skillLevel, mainSkill } from './roguelite.ts';
import { aliveEnemies, battleWorld, ensureBattle, updateBattle, winBattle, bossHealth } from './battle.ts';
import { battleCamera } from './battle-camera.ts';
import { bossAttack, dungeon, enemyDefinition } from './content/registry.ts';
import { BOSSES, careerStats, gainEnergy, experience, MATERIAL_NAMES, QUESTS } from './model.ts';
import type { Enemy, GameState, Projectile, Vec, WorldObject } from './model.ts';
import { direction, distance, isFree, lineClear, moveBody, pathDirection } from './geometry.ts';

export type InputState = { move: Vec; dodge: boolean; skill: boolean; interact: boolean; viewport?: {width:number;height:number} };
export const DODGE_COOLDOWN = 1.2;
export const emptyInput = (): InputState => ({ move: { x: 0, y: 0 }, dodge: false, skill: false, interact: false });
export type GameEvent = { kind: 'attack' | 'hit' | 'hurt' | 'dodge' | 'loot' | 'task' | 'room' | 'ability'; ability?:'arc'|'bell'|'sigil'; from?:Vec; radius?:number; text?: string; pos?: Vec; damage?: number; energy?: number };
export type Interaction = { id: string; label: string; object?: WorldObject; locked?: string };
export const enemyRadius = (e: Enemy, dungeonId: string) => enemyDefinition(dungeonId,e.kind).radius;

export function nearbyInteraction(s: GameState): Interaction | null {
  const run = s.run;
  if (!run) return null;
  const room = battleWorld(run);
  const objects = room.objects.filter(o => !o.used && distance(o.pos, run.player.pos) <= 0.8 && lineClear(run.boss, run.player.pos, o.pos)).sort((a, b) => distance(a.pos, run.player.pos) - distance(b.pos, run.player.pos));
  const o = objects[0];
  if (o) {
    const label = o.kind === 'exit' ? '撤离' : o.kind === 'chest' ? '打开补给箱' : o.kind === 'survey' ? '校准' : o.kind === 'seal' ? '采集样本' : '回收';
    const bossQuest = s.quests.some(q => q.id === 'K1' && !q.ready);
    const bossAlive = aliveEnemies(run).some(e => e.kind === 'guardian');
    const locked = o.kind === 'exit' && bossQuest && (!run.progress.K1 || bossAlive)
      ? '先击败选定的 Boss，并拾取组织样本'
      : run.tutorial && o.kind === 'find' && room.enemies.some(e=>e.hp>0) ? '先清理当前遭遇' : undefined;
    return { id: o.id, object: o, label, locked };
  }
  return null;
}

export function targetableEnemy(s: GameState, range = careerStats(s).range, viewport = {width:360,height:640}): Enemy | null {
  const run = s.run;
  if (!run) return null;
  const p = run.player;
  const view = battleCamera(viewport.width,viewport.height,p.pos,dungeon(run.boss).arena,aliveEnemies(run).some(e=>e.kind==='guardian'));
  return battleWorld(run).enemies
    .filter(e => e.hp > 0 && e.pos.x >= view.minX-.5 && e.pos.x <= view.maxX+.5 && e.pos.y >= view.minY-.5 && e.pos.y <= view.maxY+.5 && distance(p.pos, e.pos) <= range + enemyRadius(e,run.boss) && lineClear(run.boss, p.pos, e.pos))
    .sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos))[0] ?? null;
}

export function interact(s: GameState): { events: GameEvent[]; exit: boolean } {
  const run = s.run;
  const target = nearbyInteraction(s);
  if (!run || !target || target.locked) return { events: target?.locked ? [{ kind: 'task', text: target.locked }] : [], exit: false };
  const o = target.object!;
  if (o.kind === 'exit') return { events: [], exit: true };
  if (o.kind === 'survey') return { events: [], exit: false };
  o.used = true;
  if (o.kind === 'chest' && o.material) battleWorld(run).drops.push({ id: `${o.id}-drop`, pos: { ...o.pos }, material: o.material, amount: o.amount ?? 1, taken: false });
  if (o.quest) {
    run.progress[o.quest] = 1;
    return { events: [{ kind: 'task', text: o.quest === 'K1' ? '巨像样本已采集，找到撤离信标带回调查所。' : '证物已回收，安全撤离后提交。' }], exit: false };
  }
  return { events: [{ kind: 'loot', text: '补给已打开。靠近物资即可自动收集。' }], exit: false };
}

function spawnPlayerProjectile(s: GameState, skill: boolean, events: GameEvent[], viewport?: {width:number;height:number}) {
  const run = s.run!, p = run.player, stats = careerStats(s);
  const target = targetableEnemy(s, stats.range, viewport);
  p.angle = target ? direction(p.pos, target.pos) : p.facing;
  const damage = skill
    ? s.career === 'occultist' ? 24 : s.career === 'harpooner' ? 26 : 18
    : stats.damage;
  const splash = skill && s.career === 'occultist' ? 1.25 : stats.splash;
  const effect = !skill ? 'none' : s.career === 'investigator' ? 'stun' : s.career === 'occultist' ? 'seal' : 'anchor';
  const rogue=run.rogue,level=skillLevel(s,mainSkill(s.career))||1,awake=rogue?.awakenings.includes(mainSkill(s.career));
  const angles=awake?(s.career==='investigator'?[0,Math.PI/2,Math.PI,-Math.PI/2]:s.career==='harpooner'?[-.18,0,.18]:[0]):[0];
  for(const offset of angles)battleWorld(run).projectiles.push({
    id: `player-${run.id}-${run.time}-${Math.random()}`,
    pos: { x: p.pos.x + Math.cos(p.angle) * 0.3, y: p.pos.y + Math.sin(p.angle) * 0.3 },
    ...(rogue?{blastChain:!!awake&&s.career==='occultist',pierce:s.career==='harpooner'?1+Math.floor(level/2):awake?2:0,hits:[]}:{}), angle: Math.atan2(Math.sin(p.angle+offset),Math.cos(p.angle+offset)), life: Math.max(0,stats.range-.3) / stats.speed, damage, owner: 'player', speed: stats.speed,
    splash:awake&&s.career==='occultist'?Math.min(2,splash*1.5):splash, weakpoint: skill && s.career === 'harpooner' ? 3.2 : stats.weakpoint, effect,
  });
  p.action = skill ? 'skill' : 'attack'; p.timer = 0; p.fireCd = stats.cooldown;
  events.push({ kind: 'attack' });
}

function resolveEnemyHit(s: GameState, e: Enemy, damage: number, pos: Vec, weakpoint: number, effect: Projectile['effect'], events: GameEvent[], critical: { value: boolean }) {
  const run = s.run!, room = battleWorld(run), definition = dungeon(run.boss), bossConfig = definition.boss;
  const open = e.kind === 'guardian' && e.mode === 'recover';
  const crossedBossPhase = e.kind === 'guardian' && e.hp > bossHealth(run) * bossConfig.phaseAt;
  const applied = e.kind === 'guardian' ? damage * (open ? weakpoint : bossConfig.armor) : damage;
  const rounded = Math.max(1, Math.round(applied));
  e.hp = Math.max(0, e.hp - Math.max(1, applied)); e.flash = 0.08;
  const feedback = open ? '弱点命中' : effect === 'stun' ? '照明弹打断' : effect === 'seal' ? '封印生效' : effect === 'anchor' ? '锚索牵制' : undefined;
  events.push({ kind: 'hit', pos: { ...pos }, damage: rounded, text: feedback });
  critical.value = true;
  if (crossedBossPhase && e.hp > 0 && e.hp <= bossHealth(run) * bossConfig.phaseAt) events.push({ kind: 'task', text: `${definition.name}进入第二阶段，注意攻击预警。` });
  if (e.hp === 0) {
    if(!run.rogue)events.push({ kind: 'loot', energy: e.kind === 'guardian' ? bossConfig.rewards.energy : definition.minions[e.kind].energy });
    else {run.rogue.research+=e.kind==='guardian'?40:1;if(e.elite){run.rogue.awakeTokens++;events.push({kind:'task',text:'精英已击败 · 获得一次觉醒机会'});}}
    e.timer = 0;
    if (e.kind === 'guardian') {
      const bossName = BOSSES[run.boss].name;
      const quest = s.quests.some(q => q.id === 'K1' && !q.ready) && (run.progress.K1 ?? 0) < 1 ? 'K1' : undefined;

      room.drops.push({ id: `${e.id}-sample-drop`, pos: { x: e.pos.x - 0.45, y: e.pos.y }, material: 'crystal', amount: bossConfig.rewards.crystal, taken: false }, { id: `${e.id}-parts-drop`, pos: { x: e.pos.x + 0.45, y: e.pos.y }, material: 'iron', amount: bossConfig.rewards.iron, taken: false });
      if (quest) room.drops.push({ id: `${e.id}-quest-drop`, pos: { x: e.pos.x, y: e.pos.y + 0.7 }, quest, taken: false });
      winBattle(run);
      events.push({ kind: 'task', text: `${bossName}已被击败，残敌退散。战利品已汇集，可安全撤离。` });
    } else {
      if (e.kind === 'cultist') room.hazards = room.hazards.filter(h => !h.id.startsWith('spell-' + e.id + '-'));
      const minion = definition.minions[e.kind];
      const quest = s.quests.find(q => !q.ready && q.id === minion.evidenceQuest && (run.progress[q.id] ?? 0) < QUESTS[q.id].goal)?.id;
      room.drops.push({ id: `${e.id}-drop`, pos: { ...e.pos }, ...(run.rogue?{xp:minion.energy,...(quest||run.rogue.research%5===0?{material:minion.drop,amount:1}:{})}:{material:minion.drop,amount:1}), quest, taken: false });
      const clearQuest = minion.clearQuest;
      if (clearQuest && s.quests.some(q => q.id === clearQuest && !q.ready)) run.progress[clearQuest] = Math.min(QUESTS[clearQuest].goal, (run.progress[clearQuest] ?? 0) + 1);
    }
  } else if (e.kind !== 'guardian' && e.mode !== 'attack' && (effect === 'stun' || effect === 'seal' || effect === 'anchor')) {
    if (effect === 'stun' || effect === 'seal') room.hazards = room.hazards.filter(h => !h.id.startsWith('spell-' + e.id + '-'));
    if (effect === 'anchor') {
      const pull = direction(e.pos, run.player.pos);
      moveBody(run.boss, e.pos, { x: Math.cos(pull) * 0.85, y: Math.sin(pull) * 0.85 }, enemyRadius(e,run.boss));
    }
    e.mode = 'recover'; e.timer = -0.4;
  }
}

export function tick(s: GameState, input: InputState, delta: number): { events: GameEvent[]; dead: boolean; critical: boolean } {
  const run = s.run;
  if (!run) return { events: [], dead: false, critical: false };
  if(run.rogue?.offers.length)return {events:[],dead:false,critical:false};
  const definition = dungeon(run.boss), bossConfig = definition.boss;
  ensureBattle(run);
  if(run.player.hp<=0)return {events:[],dead:true,critical:false};
  const dt = Math.min(0.05, Math.max(0, delta));
  const events: GameEvent[] = [];
  const critical = { value: false };
  let room = battleWorld(run);
  const p = run.player;
  if(!run.battle!.won)run.time += dt;
  const waveUpdate=updateBattle(run,dt,input.viewport);
  critical.value=waveUpdate.changed;
  if(run.rogue){
    const r=run.rogue,paid=Math.min(4,Math.max(0,run.battle!.wave-1));
    while(r.wavePaid<paid){r.gold+=[5,10,15,25][r.wavePaid++];if(r.wavePaid===1&&!s.research!.inventory.includes('pocket_compass')&&!r.equipment.includes('pocket_compass'))r.equipment.push('pocket_compass');}
  }
  for(const text of waveUpdate.messages)events.push({kind:'room',text});
  for (const enemy of room.enemies) if (enemy.hp===0) enemy.timer+=dt;
  room.grace = Math.max(0, room.grace - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt); p.skillCd = Math.max(0, p.skillCd - dt); p.fireCd = Math.max(0, p.fireCd - dt); p.invincible = Math.max(0, p.invincible - dt);
  const strength = Math.min(1, Math.hypot(input.move.x, input.move.y));
  if (strength > 0.05) p.facing = Math.atan2(input.move.y, input.move.x);
  let usedSkill = false;
  if (input.dodge && p.dodgeCd === 0 && p.action !== 'dodge') {
    p.action = 'dodge'; p.timer = 0; p.angle = p.facing; p.dodgeCd = DODGE_COOLDOWN; p.invincible = Math.max(p.invincible, 0.28);
    events.push({ kind: 'dodge' });
  } else if (!run.rogue && input.skill && s.skill && p.skillCd === 0) {
    spawnPlayerProjectile(s, true, events, input.viewport); p.skillCd = 6; usedSkill = true;
  }
  input.dodge = false; input.skill = false;
  if (p.action !== 'none') p.timer += dt;
  else p.timer = 0;
  const actionTime = p.action === 'dodge' ? 0.25 : p.action === 'hurt' ? 0.12 : 0.13;
  if (p.action !== 'none' && p.timer >= actionTime) { p.action = 'none'; p.timer = 0; }

  const beforeMove = { ...p.pos };
  if (p.action === 'dodge') moveBody(run.boss, p.pos, { x: Math.cos(p.angle) * 6.5 * dt, y: Math.sin(p.angle) * 6.5 * dt }, 0.22);
  else if (p.action !== 'hurt') moveBody(run.boss, p.pos, { x: input.move.x * 3.2 * (1+skillLevel(s,'compass')*.05) * dt, y: input.move.y * 3.2 * (1+skillLevel(s,'compass')*.05) * dt }, 0.22);
  for (const e of room.enemies.filter(e => e.hp > 0)) {
    if (p.action === 'dodge' && e.kind !== 'guardian') continue;
    if (distance(p.pos, e.pos) < 0.22 + enemyRadius(e,run.boss) && distance(p.pos,e.pos)<distance(beforeMove,e.pos)) p.pos = { ...beforeMove };
  }
  if (!usedSkill && p.action !== 'dodge' && p.action !== 'hurt' && p.fireCd === 0 && targetableEnemy(s, careerStats(s).range, input.viewport)) {
    spawnPlayerProjectile(s, false, events, input.viewport);
  }

  if(!run.battle!.won)tickAutoSkills(s,dt,(enemy,damage)=>{if(enemy.hp>0&&!run.battle!.won)resolveEnemyHit(s,enemy,damage,enemy.pos,1.8,'none',events,critical);},event=>events.push(event),input.viewport);

  const damageToPlayer: { damage: number; name: string; pos: Vec }[] = [];
  let meleeBusy = room.enemies.filter(e => e.hp > 0 && e.kind === 'beast' && (e.mode === 'windup' || e.mode === 'attack')).length;
  let magicBusy = room.hazards.filter(h=>h.magic&&!h.boss&&h.phase<1.2).length;
  const view=battleCamera(input.viewport?.width??360,input.viewport?.height??640,p.pos,definition.arena,aliveEnemies(run).some(e=>e.kind==='guardian'));
  for (const e of room.enemies.filter(e => e.hp > 0)) {
    const stats = e.kind==='guardian' ? null : definition.minions[e.kind];
    const pattern = bossAttack(run.boss,e.turn);
    const phase = e.hp <= bossHealth(run) * bossConfig.phaseAt ? 1 : 0;
    e.flash = Math.max(0, e.flash - dt);
    if (room.grace > 0) continue;
    const inView=e.pos.x>=view.minX&&e.pos.x<=view.maxX&&e.pos.y>=view.minY&&e.pos.y<=view.maxY;
    const d = distance(e.pos, p.pos), sight = inView && d <= 9 && lineClear(run.boss, e.pos, p.pos);
    if (sight) e.lost = 0; else e.lost += dt;
    e.timer += dt;
    if (e.mode === 'idle') { e.mode='chase';e.timer=0; }
    else if (e.mode === 'chase') {
      const bossRange=e.turn===0&&e.timer<4?4.5:9;
      if (sight && ((e.kind !== 'guardian' && d <= stats!.range && (e.kind !== 'beast' || meleeBusy<2) && (e.kind !== 'cultist' || magicBusy<2)) || (e.kind === 'guardian' && d <= bossRange))) {
        e.mode = 'windup'; e.timer = 0; e.angle = direction(e.pos, p.pos); e.hit = false;
        if (e.kind === 'beast') meleeBusy++;
        if (e.kind === 'cultist') { magicBusy++; room.hazards.push({ id: 'spell-' + e.id + '-' + run.time, pos: { x: Math.max(view.minX,Math.min(view.maxX,p.pos.x)), y: Math.max(view.minY,Math.min(view.maxY,p.pos.y)) }, phase: -0.2, hit: false, boss: false, magic: true, damage: stats!.damage }); }
        if (e.kind === 'guardian' && pattern.type === 'ground') {
          const offsets = phase ? pattern.phaseTwoOffsets : pattern.offsets;
          for (const offset of offsets) room.hazards.push({ id: `boss-${e.turn}-${offset}`, pos: { x: Math.max(view.minX, Math.min(view.maxX, p.pos.x + offset)), y: Math.max(view.minY, Math.min(view.maxY, p.pos.y + (offset === 0 ? pattern.centerShift : 0))) }, phase: -0.2, hit: false, boss: true, magic: pattern.magic, damage: pattern.damage, radius: pattern.radius });
        }
      } else if (e.kind === 'guardian') {
        const a=pathDirection(run.boss,e.pos,p.pos,enemyRadius(e,run.boss));
        if(a!==null&&(!sight||d>bossRange))moveBody(run.boss,e.pos,{x:Math.cos(a)*dt,y:Math.sin(a)*dt},enemyRadius(e,run.boss));
      } else {
        const ranged = e.kind === 'bug' || e.kind === 'cultist';
        const speed = stats!.speed;
        const keepAway = stats!.keepAway;
        const target = ranged && sight && d < keepAway ? { x: e.pos.x - Math.cos(direction(e.pos, p.pos)), y: e.pos.y - Math.sin(direction(e.pos, p.pos)) } : p.pos;
        const a = pathDirection(run.boss, e.pos, target,enemyRadius(e,run.boss));
        if (a !== null && (!ranged || !sight || d < keepAway || d > stats!.range)) moveBody(run.boss, e.pos, { x: Math.cos(a) * speed * dt, y: Math.sin(a) * speed * dt }, enemyRadius(e,run.boss));
      }
    } else if (e.mode === 'windup') {
      const wait = e.kind === 'guardian' ? bossConfig.windup[phase] : stats!.windup;
      if (e.timer >= wait) {
        e.mode = 'attack'; e.timer = 0;
        if (e.kind === 'bug') room.projectiles.push({ id: `${e.id}-${run.time}`, pos: { ...e.pos }, angle: e.angle, life: 2.2, damage: stats!.damage, owner: 'enemy', speed: stats!.projectileSpeed, splash: 0, weakpoint: 1, effect: 'none' });
        if (e.kind === 'guardian' && pattern.type === 'fan') {
          const offsets = phase ? pattern.phaseTwoOffsets : pattern.offsets;
          for (const offset of offsets) room.projectiles.push({ id: `${e.id}-${run.time}-${offset}`, pos: { x: e.pos.x, y: e.pos.y + 0.6 }, angle: Math.atan2(Math.sin(e.angle+offset),Math.cos(e.angle+offset)), life: 2.4, damage: pattern.damage, owner: 'enemy', speed: pattern.speed, splash: 0, weakpoint: 1, effect: 'none' });
        }
      }
    } else if (e.mode === 'attack') {
      if (e.kind === 'beast') {
        const moved = moveBody(run.boss, e.pos, { x: Math.cos(e.angle) * 5 * dt, y: Math.sin(e.angle) * 5 * dt }, enemyRadius(e,run.boss));
        if (!e.hit && distance(e.pos, p.pos) <= enemyRadius(e,run.boss) + 0.22) { damageToPlayer.push({ damage: stats!.damage, name: `${stats!.name}扑击`, pos: { ...e.pos } }); e.hit = true; }
        if (!moved || e.timer >= 0.34) { e.mode = 'recover'; e.timer = 0; e.turn++; }
      } else if (e.timer >= 0.22) { e.mode = 'recover'; e.timer = 0; e.turn++; }
    } else if (e.mode === 'recover' && e.timer >= (e.kind === 'guardian' ? bossConfig.recover[phase] : stats!.recover)) { e.mode = 'chase'; e.timer = 0; }
  }

  for (const bullet of room.projectiles) {
    if (bullet.life <= 0) continue;
    const travel = Math.min(dt, bullet.life);
    // Check along the flight path so fast, thin shots cannot skip a target or cover.
    const steps = Math.max(1, Math.ceil(bullet.speed * travel / .12));
    for (let step = 0; step < steps; step++) {
      bullet.pos.x += Math.cos(bullet.angle) * bullet.speed * travel / steps;
      bullet.pos.y += Math.sin(bullet.angle) * bullet.speed * travel / steps;
      if (!isFree(run.boss, bullet.pos, bullet.owner === 'player' ? .08 : .12)) { bullet.life = 0; break; }
      if (bullet.owner === 'player') {
        const target = room.enemies.find(e => e.hp > 0 && !(bullet.hits??[]).includes(e.id) && distance(bullet.pos, e.pos) <= enemyRadius(e,run.boss) + .1);
        if (target) {
          resolveEnemyHit(s, target, bullet.damage, target.pos, bullet.weakpoint, bullet.effect, events, critical);
          if (bullet.splash > 0) {
            for (const other of room.enemies.filter(e => e.hp > 0 && e.id !== target.id && distance(e.pos, target.pos) <= bullet.splash + enemyRadius(e,run.boss) && lineClear(run.boss,target.pos,e.pos,.08)))
              resolveEnemyHit(s, other, bullet.damage * .6, other.pos, bullet.weakpoint, bullet.effect, events, critical);
          }
          if(bullet.blastChain){
            const next=room.enemies.filter(e=>e.hp>0&&e.id!==target.id&&distance(e.pos,target.pos)<=3&&lineClear(run.boss,target.pos,e.pos)).sort((a,b)=>distance(a.pos,target.pos)-distance(b.pos,target.pos))[0];
            if(next){
              events.push({kind:'ability',ability:'sigil',pos:{...next.pos},from:{...target.pos},radius:1.1});
              resolveEnemyHit(s,next,bullet.damage*.7,next.pos,bullet.weakpoint,'seal',events,critical);
              for(const other of room.enemies.filter(e=>e.hp>0&&e.id!==target.id&&e.id!==next.id&&distance(e.pos,next.pos)<=1.1+enemyRadius(e,run.boss)&&lineClear(run.boss,next.pos,e.pos)))resolveEnemyHit(s,other,bullet.damage*.35,other.pos,bullet.weakpoint,'seal',events,critical);
            }
          }
          if((bullet.pierce??0)>0){bullet.pierce!--;(bullet.hits??=[]).push(target.id);}else {bullet.life=0;break;}
        }
      } else if (distance(bullet.pos, p.pos) <= .36) {
        const source = room.enemies.some(e => e.kind === 'guardian' && e.hp > 0) ? BOSSES[run.boss].name : '异常生物弹幕';
        damageToPlayer.push({ damage: bullet.damage, name: source, pos: { ...bullet.pos } }); bullet.life = 0; break;
      }
    }
    bullet.life = Math.max(0, bullet.life - travel);
  }
  room.projectiles = room.projectiles.filter(b => b.life > 0);

  for (const hazard of room.hazards) {
    hazard.phase += dt;
    const magic = hazard.magic === true;
    if (hazard.phase >= 1 && hazard.phase < 1.15 && !hazard.hit && distance(hazard.pos, p.pos) <= (hazard.radius ?? (hazard.boss ? 0.7 : magic ? 0.85 : 0.5)) + 0.22) {
      damageToPlayer.push({ damage: hazard.damage ?? (hazard.boss ? 16 : magic ? 14 : 12), name: hazard.boss ? `${BOSSES[run.boss].name}攻击` : magic ? '秘仪爆裂' : '涨潮危险区', pos: hazard.pos }); hazard.hit = true;
    }
    if (!hazard.boss && hazard.phase >= 3.15) { hazard.phase = 0; hazard.hit = false; }
  }
  room.hazards = room.hazards.filter(h => h.magic ? h.phase < 1.2 : !h.boss || h.phase < 1.1);
  if (!run.battle!.won && damageToPlayer.length && p.invincible <= 0) {
    const hit = damageToPlayer.sort((a, b) => b.damage - a.damage)[0];
    p.hp = Math.max(0, p.hp - hit.damage); p.invincible = 0.65; p.action = 'hurt'; p.timer = 0;
    run.survey = 0; run.harm[hit.name] = (run.harm[hit.name] ?? 0) + hit.damage;
    const a = direction(hit.pos, p.pos);
    moveBody(run.boss, p.pos, { x: Math.cos(a) * 0.4, y: Math.sin(a) * 0.4 }, 0.22);
    events.push({ kind: 'hurt', damage: hit.damage }); critical.value = true;
  }
  for (const drop of room.drops) {
    if (drop.taken || distance(p.pos, drop.pos) > (run.rogue?pickupRadius(s):.65) || (run.rogue&&!lineClear(run.boss,p.pos,drop.pos))) continue;
    drop.taken = true;
    if(run.rogue&&drop.xp&&p.hp>0&&!run.battle!.won)addLocalXp(run.rogue,drop.xp);
    if (drop.material && drop.amount) run.materials[drop.material] += drop.amount;
    if (drop.quest && s.quests.some(q => q.id === drop.quest && !q.ready) && (run.progress[drop.quest] ?? 0) < QUESTS[drop.quest].goal) {
      run.progress[drop.quest] = Math.min(QUESTS[drop.quest].goal, (run.progress[drop.quest] ?? 0) + 1);
      events.push({ kind: 'task', text: `${QUESTS[drop.quest].title}证物已回收，撤离后生效。` });
    }
    if (drop.material && drop.amount) events.push({ kind: 'loot', text: `${MATERIAL_NAMES[drop.material]} +${drop.amount}` });
    critical.value = true;
  }
  const target = nearbyInteraction(s);
  if (input.interact && target?.object?.kind === 'survey' && p.action !== 'hurt') {
    run.survey += dt;
    if (run.survey >= 2) { target.object.used = true; run.progress.Q13 = 1; run.survey = 0; events.push({ kind: 'task', text: '灯标坐标已记录，撤离后可提交。' }); critical.value = true; }
  } else run.survey = 0;
  const energy = events.reduce((sum, event) => sum + (event.energy ?? 0), 0);
  if (energy > 0) {
    const levels = gainEnergy(s, energy);
    if (levels > 0 && p.hp > 0) events.push({ kind: 'task', text: `升至 Lv.${experience(s).level} · 生命上限与伤害提升` });
    critical.value = true;
  }
  if(run.rogue&&run.battle!.won&&run.rogue.wavePaid<5){run.rogue.gold+=45;run.rogue.wavePaid=5;run.rogue.fields=[];run.rogue.offers=[];critical.value=true;}
  room.drops=room.drops.filter(d=>!d.taken);
  room.enemies=room.enemies.filter(e=>e.hp>0||e.timer<.45);
  return { events, dead: p.hp <= 0, critical: critical.value };
}
