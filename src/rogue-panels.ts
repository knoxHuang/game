import type { GameState } from './model.ts';
import { characterPaperdoll } from './character-art.ts';
import { CAREERS, maxHealth, careerStats } from './model.ts';
import { EQUIPMENT, EQUIPMENT_UPGRADES, SKILLS } from './roguelite.ts';
import type { EquipmentId, SkillId } from './roguelite.ts';
const equipmentImages: Partial<Record<EquipmentId, string>> = {
  diving_coat: '/assets/equipment/diving-coat-icon-mobile.webp',
  brass_revolver: '/assets/equipment/brass-revolver-icon-mobile.webp',
};
const btn=(action:string,label:string,value='',disabled=false)=>`<button class="button button-secondary" data-action="${action}" data-value="${value}"${disabled?' disabled':''}>${label}</button>`;
const art=(key:string,icon:(key:string)=>string)=>`<img src="${icon(key)}" alt="">`;
const choiceDetails:Record<SkillId,string>={revolver:'提高伤害与射速；3阶双发，5阶三发。',sigil:'提高伤害与爆炸范围；3阶双符，5阶三符。',harpoon:'提高伤害；第3、5阶增加贯穿。',lantern:'自动灼烧近身敌人，提高伤害与半径。',arc:'提高电弧伤害，增加跳跃目标。',tide:'生成持续伤害符阵，提高伤害与范围。',bell:'击退并打断普通敌群，升级扩大半径。',magazine:'全部伤害 +12%。',compass:'收集半径 +0.55，移速 +5%。',watch:'全部自动攻击间隔缩短 8%。',lining:'生命上限 +15，并恢复新增生命。',coil:'全部范围攻击半径 +12%。'};
export function renderSkillChoice(s:GameState,icon:(key:string)=>string){
  const r=s.run?.rogue;if(!r?.offers.length)return '';
  return `<div class="dialog-backdrop"><section class="dialog-card rogue-choices" role="dialog" aria-modal="true" aria-labelledby="rogue-choice-title" tabindex="-1"><p class="eyebrow">本局 Lv.${r.level} → ${r.level+1} · 战斗已暂停</p><h2 id="rogue-choice-title">选择一项强化</h2><p class="rogue-choice-hint">攻击 ${Object.keys(r.skills).filter(id=>SKILLS[id as SkillId].kind==='attack').length}/3 · 辅助 ${Object.keys(r.skills).filter(id=>SKILLS[id as SkillId].kind==='support').length}/3 · 本局有效</p><div class="rogue-choice-list">${r.offers.map(offer=>{
    const awake=offer.startsWith('awaken:'),id=(awake?offer.slice(7):offer) as SkillId,skill=SKILLS[id];
    const name=awake?`觉醒 · ${skill.name}`:skill?.name??(offer==='heal'?'急救补给':offer==='supply'?'急救药箱':'研究回收');
    const detail=awake?'改变主武器攻击形态，消耗一次精英觉醒机会。':choiceDetails[id]??(offer==='heal'?'恢复 30 点生命。':offer==='supply'?'获得一份急救包；携带已满则恢复 30 生命。':'本局研究能量 +10，结算后保留。');
    return `<button class="rogue-choice" data-action="choose-skill" data-value="${offer}"><span class="rogue-choice-icon">${art(skill?.icon??'medkit',icon)}</span><span><strong>${name}</strong><small>${awake?'主武器觉醒':skill?`${skill.kind==='attack'?'自动攻击':'辅助'} · ${(r.skills[id]??0)?`${r.skills[id]} → ${r.skills[id]!+1} 阶`:'新技能'}`:'补给'}</small><span>${detail}</span></span></button>`;
  }).join('')}</div><div class="dialog-actions">${btn('reroll-skills',`重选 · 剩余 ${r.rerolls} 次`,'',!r.rerolls)}</div></section></div>`;
}
export function renderResearch(s:GameState){
  if(!s.research)return `<section class="equipment-service"><h3>割草成长规则</h3><p>新规则：本局等级与技能在结算后清空。研究能量、冥币、装备与训练永久保留。</p><p>旧累计能量 ${s.energy??0} 将等额转为研究能量。原档案会保留一份转换前备份。</p>${btn('convert-rogue',s.run?'结束本次调查后可转换':'查看转换并确认','',!!s.run)}</section>`;
  const r=s.research;
  return `<section class="equipment-service"><h3>研究与训练</h3><p>研究能量 <b>${r.energy}</b> · 冥币 <b>${s.gold}</b></p><p>只训练永久属性。出发仍从本局 Lv.1 开始。</p>${(['power','vitality'] as const).map(id=>{const level=r.training[id];return `<div class="rogue-training"><strong>${id==='power'?'火力训练 · 每级伤害 +4%':'生存训练 · 每级生命 +4'} ${level}/5</strong><p>${level===5?'已完成全部训练':`研究能量 ${20+level*15} · 冥币 ${15+level*10}`}</p>${btn('train',level===5?'训练已满':id==='power'?'训练火力':'训练生存',id,level===5||!!s.run||r.energy<20+level*15||s.gold<15+level*10)}</div>`;}).join('')}<p>训练与装备合计：伤害最高 +35%，生命最高 +40。局内辅助另计。</p>${r.converted?btn('export-legacy-backup','导出转换前备份'):''}</section>`;
}
export function renderRogueEquipment(s:GameState,icon:(key:string)=>string){
  const r=s.research!,stats=careerStats(s);
  return `<div class="loadout-identity"><strong>林烬 · ${CAREERS[s.career].name}</strong><span>出发从 Lv.1 开始 · 自动攻击</span></div><div class="rogue-loadout-person">${characterPaperdoll(!!r.equipped.armor,r.equipped.armor==='diving_coat')}</div><dl class="loadout-stats"><div><dt>最大生命</dt><dd>${maxHealth(s)}</dd></div><div><dt>初始伤害</dt><dd>${stats.damage.toFixed(1)}</dd></div><div><dt>攻击间隔</dt><dd>${stats.cooldown.toFixed(2)}s</dd></div></dl><p class="loadout-hint">武器、护具、饰物：固定效果，可确定强化。</p>${(['weapon','armor','charm'] as const).map(slot=>`<section class="equipment-service"><h3>${{weapon:'武器',armor:'护具',charm:'饰物'}[slot]}</h3>${r.inventory.filter(id=>EQUIPMENT[id].slot===slot).map(id=>{const item=EQUIPMENT[id],selected=r.equipped[slot]===id;return `<div class="rogue-equipment"><span class="rogue-choice-icon">${equipmentImages[id]?`<img src="${equipmentImages[id]}" alt="">`:art(slot==='weapon'?'weapon':slot==='armor'?'armor':'compass',icon)}</span><strong>${item.name}</strong><p>${item.detail}</p>${btn('equip-rogue',selected?'已装备':'装备',id,selected||!!s.run)}${EQUIPMENT_UPGRADES[id]&&!r.inventory.includes(EQUIPMENT_UPGRADES[id]!)?`<p>强化：35 冥币 / 25 研究能量 / 2 零件</p>${btn('improve-equipment','强化装备',id,!!s.run||s.gold<35||r.energy<25||s.materials.iron<2)}`:''}</div>`;}).join('')||'<p>撑过第一波可获得袖珍罗盘，结算后入库。</p>'}</section>`).join('')}${renderResearch(s)}`;
}
