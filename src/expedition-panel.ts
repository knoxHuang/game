import { DUNGEONS } from './content/registry.ts';
import { DEFAULT_DUNGEON } from './content/schema.ts';
import type { DungeonDefinition } from './content/schema.ts';
import { WORLD_REGIONS, WORLD_SIZE, worldPoint, worldRegion } from './content/world-map.ts';
import { bossRisk, CAREERS, dungeonAccess, maxHealth, QUESTS } from './model.ts';
import type { BossId, GameState } from './model.ts';

type Options = { preview?: BossId; region?: string; icon: (key: string) => string };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function dossier(s: GameState, selected: DungeonDefinition, icon: Options['icon']) {
  const access = dungeonAccess(s, selected.id), risk = bossRisk(s, selected.id), quests = s.quests.filter(q => !q.ready);
  const requirements = access.reasons.length ? `<ul class="sea-requirements">${access.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="sea-available">航线开放，可重复调查。</p>';
  const rows = quests.length ? quests.map(q => `<li><img src="${icon(QUESTS[q.id].icon)}" alt=""><span><strong>${esc(QUESTS[q.id].title)}</strong><small>${q.progress}/${QUESTS[q.id].goal}${QUESTS[q.id].type === 'boss' || selected.id === DEFAULT_DUNGEON ? '' : ' · 本区域不推进此案件'}</small></span></li>`).join('') : '<li>未接取案件，也可自由调查。</li>';
  return `<h3>${esc(selected.name)}</h3><p>${esc(selected.description)}</p>${s.run?.boss === selected.id ? '<p class="sea-available">当前调查可以继续；以下条件用于新启程。</p>' : ''}${requirements}<dl class="sea-risk"><div><dt>角色评估</dt><dd>${risk.grade}</dd></div><div><dt>生命 / 建议</dt><dd>${maxHealth(s)} / ${selected.recommendedHealth}</dd></div><div><dt>每秒输出 / 建议</dt><dd>${risk.dps.toFixed(1)} / ${selected.recommendedDps}</dd></div></dl><p>五波围攻 · 第五波出现 Boss</p><h4>随行案件 · ${quests.length}/2</h4><ul class="sea-quests">${rows}</ul><h4>外勤整备</h4><p>${CAREERS[s.career].name} · 急救包 ${s.run?.player.potions ?? (s.extraPotion ? 2 : 1)} 个</p><div class="sea-preflight-tools"><button class="button button-secondary" data-action="panel:character" data-value="career">查看职业与装备</button><button class="button button-secondary" data-action="buy-potion"${s.extraPotion || s.gold < 10 || s.run ? ' disabled' : ''}>${s.extraPotion ? '急救包已备齐' : '补充急救包 · 10 冥币'}</button></div>`;
}

export function renderExpeditionPanel(s: GameState, options: Options): string {
  const requestedRegion = options.region ? worldRegion(options.region) : undefined;
  const next = DUNGEONS.find(d => { const a = dungeonAccess(s, d.id); return a.available && !a.reported; });
  const selected = requestedRegion ? DUNGEONS.find(d => d.map.region === requestedRegion.id) : DUNGEONS.find(d => d.id === options.preview) ?? DUNGEONS.find(d => d.id === s.run?.boss) ?? next ?? DUNGEONS.find(d => d.id === s.selectedBoss && dungeonAccess(s, d.id).available) ?? DUNGEONS[0];
  const region = requestedRegion ?? worldRegion(selected?.map.region ?? 'nearshore')!;
  const point = selected ? worldPoint(selected.map.x, selected.map.y) : worldPoint(region.x, region.y);
  const access = selected ? dungeonAccess(s, selected.id) : null, continuing = !!selected && s.run?.boss === selected.id;
  const tutorialMismatch = !!selected && s.quests.some(q => !q.ready && q.id === 'K0') && selected.id !== DEFAULT_DUNGEON;
  const blocked = !selected || (!continuing && (!!s.run || !access?.available || tutorialMismatch));
  const reason = !selected ? '海域尚未探明' : s.run && !continuing ? '请先结束当前调查' : tutorialMismatch ? '入门案件需前往近岸沉船区' : access?.reasons[0];
  const sites = DUNGEONS.map(d => {
    const a = dungeonAccess(s, d.id), active = d.id === selected?.id, sea = worldRegion(d.map.region)!;
    const src = options.icon(`boss-${d.id}`);
    return `<div class="world-site${active ? ' is-selected' : ''}${sea.charted ? '' : ' is-mysterious'}" style="--site-x:${d.map.x}%;top:${d.map.y}%"><button class="sea-location${active ? ' is-selected' : ''}${a.available ? '' : ' is-locked'}" data-map-location data-action="expedition-preview" data-value="${d.id}" aria-pressed="${active}" aria-label="${esc(d.zone)}，${esc(d.name)}，${a.available ? '可调查' : '未开放，可预览'}"><span class="sea-threat" aria-hidden="true"><span class="sea-wake"></span>${src ? `<img src="${src}" alt="" draggable="false">` : ''}</span><span class="sea-location-caption"><span class="sea-waypoint" aria-hidden="true">${a.reported ? '✓' : a.available ? '◎' : '◇'}</span><span class="sea-location-label"><strong>${esc(d.zone)}</strong><small>${s.run?.boss === d.id ? '调查进行中' : a.reported ? '报告已归档' : a.available ? '可调查' : sea.charted ? '内容制作中' : '远期异常'}</small></span></span></button></div>`;
  }).join('');
  const regions = WORLD_REGIONS.map(r => {
    const count = DUNGEONS.filter(d => d.map.region === r.id).length;
    return `<button class="world-region${r.id === region.id ? ' is-current' : ''}" style="--site-x:${r.x}%;top:${r.y}%" data-map-location data-action="expedition-region" data-value="${r.id}" aria-label="查看${r.name}"><b>${r.chapter}</b><strong>${r.name}</strong><small>${r.charted ? `${count} 处调查地点` : r.id === 'forbidden' ? '终章 · 未探明' : '未探明海域'}</small></button>`;
  }).join('');
  const routes = WORLD_REGIONS.slice(1).map((r, i) => {
    const a = worldPoint(WORLD_REGIONS[i].x, WORLD_REGIONS[i].y), b = worldPoint(r.x, r.y);
    return `<path d="M${a.x} ${a.y} C${a.x} ${b.y},${b.x} ${a.y},${b.x} ${b.y}"/>`;
  }).join('');
  // The active route joins the harbor to the actual destination, not the region label.
  const origin = worldPoint(78, 90);
  const activeRoute = selected ? `<path class="world-route-active${access?.available ? '' : ' is-locked'}" d="M${origin.x} ${origin.y} Q${point.x} ${origin.y} ${point.x} ${point.y}"/>` : '';
  const risk = selected ? bossRisk(s, selected.id) : null;
  const details = selected ? dossier(s, selected, options.icon) : `<h3>${region.name}</h3><p>${region.description}</p><p class="sea-requirements">${region.gate}</p><p>这里尚无可启程的副本。后续首领将分批加入，现有报告与装备进度会保留。</p>`;
  return `<div class="world-chart" data-reduced="${s.settings.reducedMotion}"><div class="world-viewport" data-selected="${selected?.id ?? ''}" role="group" aria-label="从下向上探索的世界海图，方向键或滚动查看，海域按钮可快速定位" tabindex="0" data-focus-x="${point.x}" data-focus-y="${point.y}" data-focus-dock="${selected && selected.map.y < 30 ? 'below' : 'above'}" data-focus-key="${options.region ? `region:${region.id}` : selected?.id ?? region.id}"><div class="world-plane"><img class="world-art" src="/assets/map/voyage-boss-biomes-v3-mobile.webp" alt="从下方雾港向上延伸，经过四片海域的纵向像素世界航图" draggable="false"><svg class="world-routes" viewBox="0 0 ${WORLD_SIZE.width} ${WORLD_SIZE.height}" aria-hidden="true">${routes}${activeRoute}</svg>${regions}${sites}<span class="world-origin"><i aria-hidden="true">⚓</i>雾港调查所</span></div></div><p class="world-help">沿海图上行 · 点选异常</p></div>
    <header class="sea-heading"><div><span data-visible-region>${region.chapter === '终章' ? '终章海域' : `第${region.chapter}海域`} · ${region.name}</span><h2>远海航图<span class="sea-chart-subtitle">异常海域调查</span></h2></div><button class="close-panel" data-action="back" aria-label="关闭海图">×</button></header>
    <nav class="world-tools" aria-label="快速定位海域">${WORLD_REGIONS.map(r => `<button data-action="expedition-region" data-value="${r.id}" aria-label="前往${r.name}" aria-pressed="${r.id === region.id}"><span>${r.chapter === '终章' ? '终' : r.chapter}</span>${r.id === 'nearshore' ? '近岸' : r.id === 'outer_ruins' ? '遗迹' : r.id === 'abyss' ? '深渊' : '禁忌'}</button>`).join('')}</nav>
    <footer class="sea-departure"><div class="sea-target" aria-live="polite" aria-atomic="true"><div><span>${selected ? `已选 · ${esc(selected.zone)}` : '未知航线'}</span><h3>${selected ? esc(selected.name) : region.name}</h3></div><div class="sea-assessment">${risk && !blocked ? `<span class="sea-risk-grade">危险评估 · ${esc(risk.grade)}</span>` : ''}<span class="sea-status${blocked ? ' is-locked' : ''}">${continuing ? '调查进行中' : blocked ? esc(reason ?? '暂未开放') : access?.reported ? '报告已归档' : '航线开放'}</span></div></div><div class="sea-departure-controls"><details class="sea-preflight"><summary>${selected ? '调查档案' : '海域档案'} <span aria-hidden="true">⌃</span></summary><section class="sea-preflight-content" aria-label="所选区域调查档案">${details}</section></details><button class="button button-primary sea-embark"${selected ? ` data-action="start-run" data-value="${selected.id}"` : ''}${blocked ? ' disabled' : ''}>${continuing ? '继续调查' : blocked ? selected ? '航线未开放' : '航线勘察中' : '启程调查'} <span aria-hidden="true">→</span></button></div></footer>`;
}
