import { attackDamage, careerStats, CAREERS, MATERIAL_NAMES, maxHealth, UPGRADES, upgradeStatus, wearingArmor } from './model.ts';
import type { CareerId, GameState, UpgradeId } from './model.ts';

export type CharacterTab = 'equipment' | 'career';
export type EquipmentSlot = 'weapon' | 'armor' | 'charm' | 'artifact';
type Options = { tab: CharacterTab; slot: EquipmentSlot | null; preview: CareerId | null; icon: (key: string) => string };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const weaponIcon = (career: CareerId) => career === 'occultist' ? 'ritual' : career === 'harpooner' ? 'harpoon' : 'weapon';
const art = (key: string, icon: Options['icon']) => {
  const src = icon(key);
  return src ? `<img src="${src}" alt="">` : '<span class="equipment-art-pending" aria-hidden="true">◇</span>';
};
const paperdoll = (s: GameState) => `<span class="character-paperdoll" role="img" aria-label="${wearingArmor(s) ? '穿黄色雨衣' : '穿普通内搭'}的林烬正面形象"><img class="character-body" src="/assets/character/linjin-base.png" alt="">${wearingArmor(s) ? '<img class="character-coat" src="/assets/character/raincoat-layer.png" alt="">' : ''}</span>`;
const action = (name: string, label: string, value = '', disabled = false) => `<button class="button button-secondary" data-action="${name}"${value ? ` data-value="${value}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;

function upgrade(s: GameState, id: UpgradeId): string {
  const definition = UPGRADES[id], reason = upgradeStatus(s, id), owned = reason === '已完成';
  return `<section class="equipment-service" aria-label="${definition.title}">
    <div class="equipment-service-heading"><strong>${definition.title}</strong><span>${owned ? '已完成' : '调查所整备'}</span></div>
    <p>${escape(definition.description)}</p>
    ${owned ? '' : `<p class="equipment-cost">${definition.gold} 冥币${definition.crystal ? ` · ${definition.crystal} ${MATERIAL_NAMES.crystal}` : ''}${definition.iron ? ` · ${definition.iron} ${MATERIAL_NAMES.iron}` : ''}</p>`}
    ${!owned && reason ? `<p class="equipment-requirement">${escape(reason)}</p>` : ''}
    ${owned ? '<span class="equipment-complete">✓ 已应用于当前整备</span>' : action('upgrade', reason ? '暂不可强化' : `强化${id === 'skill' ? '职业能力' : id === 'weapon' ? '武器' : '防护'}`, id, !!reason)}
  </section>`;
}

function equipment(s: GameState, options: Options): string {
  const career = CAREERS[s.career], stats = careerStats(s);
  const slot = (id: EquipmentSlot, label: string, icon: string, state: string) => `<button class="loadout-slot loadout-${id}${options.slot === id ? ' is-selected' : ''}" data-action="equipment-slot" data-value="${id}" aria-label="${label}：${state}，查看详情" aria-pressed="${options.slot === id}">
    <span class="loadout-slot-label">${label}</span><span class="loadout-slot-art">${art(icon, options.icon)}</span><span class="loadout-slot-state">${state}</span>
  </button>`;
  return `<div class="loadout-identity"><strong>林烬</strong><span>雾港外勤调查员 · ${career.name}</span></div>
    <section class="loadout-stage" aria-label="角色与当前穿戴">
      ${slot('weapon', '武器', weaponIcon(s.career), s.weapon ? '已校准' : '基础武器')}
      ${slot('armor', '护具', 'armor', wearingArmor(s) ? (s.armor ? '已加固' : '黄色雨衣') : '未穿戴')}
      <div class="loadout-person"><span class="loadout-investigator">${paperdoll(s)}</span><span class="loadout-plaque">${escape(career.weaponName)}</span></div>
      ${slot('charm', '饰物', 'compass', '尚未开放')}
      ${slot('artifact', '神器', 'lamp', '尚未开放')}
    </section>
    <dl class="loadout-stats" aria-label="当前角色属性"><div><dt>最大生命</dt><dd>${maxHealth(s)}</dd></div><div><dt>单发伤害</dt><dd>${attackDamage(s)}</dd></div><div><dt>每秒输出</dt><dd>${(stats.damage / stats.cooldown).toFixed(1)}</dd></div></dl>
    <p class="loadout-hint">轻触装备槽，查看当前装备与强化条件。</p>
    <div class="loadout-resources" aria-label="当前整备物资"><span>冥币 <b>${s.gold}</b></span><span>${MATERIAL_NAMES.crystal} <b>${s.materials.crystal}</b></span><span>${MATERIAL_NAMES.iron} <b>${s.materials.iron}</b></span></div>`;
}

function careers(s: GameState, options: Options): string {
  const id = options.preview ?? s.career, career = CAREERS[id];
  const traits = {
    investigator: ['稳定连射', '均衡射程', '照明标记'],
    occultist: ['符弹扩散', '群体压制', '封印控制'],
    harpooner: ['强力单发', '远距猎杀', '弱点爆发'],
  }[id];
  const selectors = (Object.entries(CAREERS) as [CareerId, typeof career][]).map(([key, item]) => `<button class="profession-selector${key === id ? ' is-selected' : ''}" data-action="career-preview" data-value="${key}" aria-pressed="${key === id}" aria-label="预览${item.name}"><span>${art(weaponIcon(key), options.icon)}</span><strong>${item.name}</strong>${key === s.career ? '<small>当前</small>' : ''}</button>`).join('');
  return `<p class="profession-instruction">轻触武器，查看职业档案。</p><div class="profession-selectors" role="group" aria-label="职业预览">${selectors}</div>
    <section class="profession-showcase" aria-label="${career.name}职业展示" data-career="${id}">
      <div class="profession-portrait">${paperdoll(s)}<span class="profession-showcase-weapon">${art(weaponIcon(id), options.icon)}</span></div>
      <div class="profession-caption"><span>林烬 · 职业档案</span><h3>${career.name}</h3><p>${career.weaponName}</p><div class="profession-traits">${traits.map(trait => `<span>${trait}</span>`).join('')}</div></div>
    </section>
    <div class="profession-details"><p>${career.description}</p><dl><div><dt>基础单发</dt><dd>${career.damage}</dd></div><div><dt>攻击间隔</dt><dd>${career.cooldown} 秒</dd></div><div><dt>射程</dt><dd>${career.range}</dd></div></dl><p class="profession-skill"><strong>${career.skill}</strong><span>职业能力 · 冷却 6 秒${s.skill ? '' : ' · 尚未解锁'}</span></p></div>
    ${s.run ? '<p class="equipment-requirement">调查进行中，返回调查所后才能更换职业。</p>' : ''}
    <div class="profession-confirm">${action('career', id === s.career ? '当前已选用' : `选用${career.name}`, id, id === s.career || !!s.run)}</div>
    <section class="profession-ability"><h3>职业能力整备</h3><p class="profession-instruction">整备当前职业：${CAREERS[s.career].name}</p>${upgrade(s, 'skill')}</section>`;
}

function inspection(s: GameState, options: Options): string {
  const id = options.slot;
  if (!id) return '';
  const title = { weapon: '武器整备', armor: '防护整备', charm: '饰物', artifact: '神器' }[id];
  const icon = id === 'weapon' ? weaponIcon(s.career) : id === 'armor' ? 'armor' : id === 'charm' ? 'compass' : 'lamp';
  const name = id === 'weapon' ? CAREERS[s.career].weaponName : id === 'armor' ? (s.armor ? '加固防水护具' : '外勤雨衣') : title;
  const detail = id === 'weapon' || id === 'armor'
    ? `${id === 'weapon' ? `<p class="equipment-current-stat">当前单发伤害 <strong>${attackDamage(s)}</strong> · ${s.weapon ? '已校准' : '基础武器'}</p>` : `<p class="equipment-current-stat">当前最大生命 <strong>${maxHealth(s)}</strong></p>`}${id === 'armor' ? `<p class="equipment-unavailable">${wearingArmor(s) ? '当前已穿戴黄色雨衣。卸下后显示普通内搭，加固生命加成暂停生效。' : '当前为普通内搭。穿上雨衣后恢复外勤外观与已有加固效果。'}</p>${action('armor-equip', wearingArmor(s) ? '卸下护具' : '穿上黄色雨衣', wearingArmor(s) ? 'off' : 'on', !!s.run)}` : ''}${upgrade(s, id)}`
    : '<p class="equipment-unavailable">此装备类型尚未开放。开放后可在这个槽位查看和更换装备。</p>';
  return `<div class="equipment-inspector"><button class="equipment-scrim" data-action="equipment-close" aria-label="关闭装备详情"></button><section class="equipment-sheet" role="dialog" aria-modal="true" aria-labelledby="equipment-sheet-title"><header><div><span>整备台 · ${title}</span><h3 id="equipment-sheet-title">${name}</h3></div><button class="close-panel" data-action="equipment-close" aria-label="关闭装备详情">×</button></header><div class="equipment-sheet-content"><span class="equipment-detail-art">${art(icon, options.icon)}</span>${detail}</div></section></div>`;
}

export function renderCharacterPanel(s: GameState, options: Options): string {
  return `<div class="character-tabs" role="tablist" aria-label="整备分类">${(['equipment', 'career'] as const).map((id, index) => `<button class="character-tab${options.tab === id ? ' is-active' : ''}" role="tab" id="character-tab-${id}" aria-selected="${options.tab === id}" aria-controls="character-tabpanel" tabindex="${options.tab === id ? '0' : '-1'}" data-action="character-tab" data-value="${id}">${index === 0 ? '角色' : '职业'}</button>`).join('')}</div>
    <div class="panel-scroll character-scroll" id="character-tabpanel" role="tabpanel" aria-labelledby="character-tab-${options.tab}">${options.tab === 'equipment' ? equipment(s, options) : careers(s, options)}</div>
    <div class="panel-actions character-actions">${action('back', '返回调查所')}</div>${inspection(s, options)}`;
}
