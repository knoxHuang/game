import { renderSkillChoice, renderResearch } from './rogue-panels.ts';
import { SKILLS, EQUIPMENT } from './roguelite.ts';
import type { SkillId } from './roguelite.ts';
import { aliveEnemies, battleWorld, combatWaves } from './battle.ts';
import { renderExpeditionPanel } from './expedition-panel.ts';
import { WorldMap } from './world-map.ts';
import { worldRegion } from './content/world-map.ts';
import { renderCharacterPanel } from './character-panel.ts';
import type { CharacterTab, EquipmentSlot } from './character-panel.ts';
import { availableQuests, BOSSES, CAREERS, maxHealth, experience, MATERIAL_NAMES, QUESTS, UPGRADES } from './model.ts';
import type { CareerId, GameState, QuestId } from './model.ts';
import { nearbyInteraction } from './engine.ts';
import { LobbyInteractions, lobbyToolIcon, renderLobby } from './lobby.ts';
import type { LobbyToolId } from './lobby.ts';

export type AppPage = 'home' | 'shop' | 'run' | 'result';
export type ViewOptions = {
  state: () => GameState | null;
  page: () => AppPage;
  paused: () => boolean;
  pending: () => boolean;
  savingError: () => string | null;
  startupError?: () => string | null;
  audio: () => { music: boolean; sound: boolean; reducedMotion: boolean };
  renderer: () => { icon: (key: string) => string } | null;
  action: (name: string, value?: string) => void;
};
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const img = (key: string, label: string, src: (key: string) => string, cls = '') => {
  const url = src(key);
  return `<span class="pixel-icon ${cls}">${url ? `<img src="${url}" alt="${esc(label)}">` : `<b aria-hidden="true">${esc(label.slice(0, 1))}</b>`}</span>`;
};
const interactionCaption = (label: string | undefined, locked: string | undefined) => {
  if (!locked) return label ?? '交互';
  if (locked.includes('封锁')) return '清敌解锁';
  if (locked.includes('清理')) return '清理敌人';
  if (locked.includes('案件')) return '查看案件';
  return '未开放';
};
const button = (action: string, label: string, cls = '', disabled = false, value = '') => `<button class="button ${cls}" data-action="${action}"${value ? ` data-value="${esc(value)}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
type Panel = { kind: string; id?: string; origin?: string };

export class GameView {
  private lobby: LobbyInteractions;
  private worldMap = new WorldMap();
  private releaseControls: () => void = () => {};
  private screen: HTMLElement;
  private hud: HTMLElement;
  private controls: HTMLElement;
  private overlay: HTMLElement;
  private toast: HTMLElement;
  private orientation: HTMLElement;
  private panel: Panel | null = null;
  private npc: 'ali' | 'lanzhou' = 'ali';
  private characterTab: CharacterTab = 'equipment';
  private careerPreview: CareerId | null = null;
  private equipmentSlot: EquipmentSlot | null = null;
  private signature = '';
  private hudSignature = '';
  private lastToast = 0;
  constructor(private options: ViewOptions) {
    this.screen = document.querySelector<HTMLElement>('#screen')!;
    this.lobby = new LobbyInteractions(this.screen);
    this.hud = document.querySelector<HTMLElement>('#hud')!;
    this.controls = document.querySelector<HTMLElement>('#controls')!;
    this.overlay = document.querySelector<HTMLElement>('#overlay')!;
    this.toast = document.querySelector<HTMLElement>('#toast')!;
    this.orientation = document.querySelector<HTMLElement>('#orientation')!;
    this.screen.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action]');
      if (!target || target.hasAttribute('disabled')) return;
      this.handle(target.dataset.action ?? '', target.dataset.value);
    });
    this.screen.addEventListener('keydown', event => {
      if (this.panel?.kind === 'prepare' && event.key === 'Escape') {
        const dossier = this.screen.querySelector('details[open]');
        if (dossier) { event.preventDefault(); event.stopPropagation(); dossier.removeAttribute('open'); dossier.querySelector<HTMLElement>('summary')?.focus(); }
        return;
      }
      if (this.panel?.kind !== 'character') return;
      const target = event.target as HTMLElement;
      if (target.matches('.character-tab') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        this.selectCharacterTab(event.key === 'Home' ? 'equipment' : event.key === 'End' ? 'career' : this.characterTab === 'equipment' ? 'career' : 'equipment', true);
      } else if (this.equipmentSlot && event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); this.closeEquipment();
      } else if (this.equipmentSlot && event.key === 'Tab') {
        const controls = Array.from(this.screen.querySelectorAll<HTMLElement>('.equipment-sheet button:not(:disabled)'));
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && target === first && last) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && target === last && first) { event.preventDefault(); first.focus(); }
      }
    });
    const settingChanged = (event: Event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.dataset.setting) this.options.action('setting', input.dataset.setting + ':' + input.checked);
    };
    this.screen.addEventListener('change', settingChanged);
    this.overlay.addEventListener('change', settingChanged);
    const importSelected = async (event: Event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.dataset.file === 'import' && input.files?.[0]) this.options.action('import-file', await input.files[0].text());
    };
    this.overlay.addEventListener('change', importSelected);
    this.hud.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action]');
      if (target) this.handle(target.dataset.action ?? '', target.dataset.value);
    });
    this.overlay.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action]');
      if (target) this.handle(target.dataset.action ?? '', target.dataset.value);
    });
    this.toast.addEventListener('click', () => this.toast.classList.remove('is-visible'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.options.page() === 'run') this.options.action(this.options.paused() ? 'resume' : 'pause');
    });
    const mq = matchMedia('(orientation: landscape) and (pointer: coarse)');
    const orientation = () => {
      this.orientation.classList.toggle('is-visible', mq.matches && this.options.page() === 'run');
      if (mq.matches && this.options.page() === 'run') this.options.action('pause');
    };
    mq.addEventListener('change', orientation);
  }
  private handle(action: string, value?: string) {
    if (action === 'expedition-region' && value && worldRegion(value)) {
      const selector = `[data-action="expedition-region"][data-value="${value}"]`;
      const keyboardFocus = this.screen.querySelector(selector)?.matches(':focus-visible');
      this.panel = { kind: 'prepare', id: `region:${value}` }; this.refresh(true);
      if (keyboardFocus) this.screen.querySelector<HTMLElement>(`.world-tools ${selector}`)?.focus({ preventScroll: true });
      return;
    }
    if (action === 'expedition-preview' && value && Object.hasOwn(BOSSES, value)) {
      const selector = `[data-action="expedition-preview"][data-value="${value}"]`;
      const keyboardFocus = this.screen.querySelector(selector)?.matches(':focus-visible');
      this.panel = { kind: 'prepare', id: value }; this.refresh(true);
      if (keyboardFocus) this.screen.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
      return;
    }
    if (action === 'character-tab') { this.selectCharacterTab(value === 'career' ? 'career' : 'equipment', true); return; }
    if (action === 'equipment-slot' && ['weapon', 'armor', 'charm', 'artifact'].includes(value ?? '')) {
      this.equipmentSlot = value as EquipmentSlot; this.refresh(true);
      this.screen.querySelector<HTMLElement>('.equipment-sheet .close-panel')?.focus();
      return;
    }
    if (action === 'career-preview' && value && Object.hasOwn(CAREERS, value)) {
      this.careerPreview = value as CareerId; this.refresh(true);
      this.screen.querySelector<HTMLElement>(`[data-action="career-preview"][data-value="${value}"]`)?.focus();
      return;
    }
    if (action === 'equipment-close') { this.closeEquipment(); return; }
    if (action === 'npc') { this.npc = value === 'lanzhou' ? 'lanzhou' : 'ali'; this.panel = { kind: 'quests' }; this.refresh(true); return; }
    if (action === 'quest-detail') { this.panel = { kind: 'quest-detail', id: value, origin: this.npc }; this.refresh(true); return; }
    if (action === 'back') {
      if (this.panel?.kind === 'character' && this.equipmentSlot) { this.closeEquipment(); return; }
      if (this.options.page() === 'run' && this.panel?.kind === 'pause') { this.options.action('resume'); return; }
      if (this.options.page() === 'run' && this.panel?.kind.startsWith('run-')) { this.panel = { kind: 'pause' }; this.refresh(true); return; }
      if (this.panel?.kind === 'confirm') { this.panel = this.panel.origin ? { kind: this.panel.origin } : null; this.options.action('cancel'); }
      else if (this.panel?.kind === 'quest-detail') this.panel = { kind: 'quests' };
      else if (this.panel?.kind === 'confirm') this.panel = this.panel.origin ? { kind: this.panel.origin } : null;
      else if (this.panel) this.panel = null;
      else if (this.options.page() === 'run') this.options.action('resume');
      this.refresh(true); return;
    }
    if (action.startsWith('panel:')) {
      const kind = action.slice(6);
      if (kind === 'pause') { this.options.action('pause'); return; }
      if (this.options.page() === 'run' && kind.startsWith('run-')) this.options.action('pause');
      this.openPanel(kind, value); return;
    }
    if (action === 'confirm') { this.panel = null; this.options.action('confirm:' + this.confirmAction, this.confirmValue); this.refresh(true); return; }
    if (action === 'cancel') { this.panel = null; this.options.action('cancel'); this.refresh(true); return; }
    this.options.action(action, value);
  }
  openConfirmation(title: string, description: string, action = 'confirm', value = '', origin?: string) {
    this.panel = { kind: 'confirm', id: `${title}|${description}|${action}|${value}`, origin };
    this.confirmAction = action; this.confirmValue = value; this.refresh(true);
  }
  private confirmAction = 'confirm';
  private confirmValue = '';
  private selectCharacterTab(tab: CharacterTab, focus = false) {
    this.characterTab = tab; this.equipmentSlot = null; this.refresh(true);
    if (focus) this.screen.querySelector<HTMLElement>(`#character-tab-${tab}`)?.focus();
  }
  private closeEquipment() {
    const slot = this.equipmentSlot; this.equipmentSlot = null; this.refresh(true);
    this.screen.querySelector<HTMLElement>(`[data-action="equipment-slot"][data-value="${slot}"]`)?.focus();
  }
  openPanel(kind: string, id?: string, origin?: string) {
    if (kind === 'character') { this.characterTab = id === 'career' ? 'career' : 'equipment'; this.equipmentSlot = null; this.careerPreview = null; }
    this.panel = { kind, id, origin }; this.refresh(true);
  }
  closePanel() { this.panel = null; this.refresh(true); }
  refreshAssets() {
    this.releaseControls();
    this.controls.replaceChildren();
    this.controls.dataset.active='';
    this.hudSignature='';
    this.refresh(true);
  }
  refresh(force = false) {
    const state = this.options.state(), page = this.options.page();
    const signature = state ? [page, this.options.paused(), this.options.pending(), this.options.savingError(), state.shop, state.career, state.selectedBoss, state.gold, state.energy, JSON.stringify(state.research), JSON.stringify(state.run?.rogue&&[state.run.rogue.xp,state.run.rogue.level,state.run.rogue.skills,state.run.rogue.offers,state.run.rogue.rerolls,state.run.rogue.gold,state.run.rogue.research]), state.materials.crystal, state.materials.iron, state.weapon, state.armor, state.armorEquipped, state.bossReports?.join(','), state.skill, state.depth, state.quests.map(q => `${q.id}${q.progress}${q.ready}`).join(','), state.run?.room, Math.floor(state.run?.player.pos.x??0), Math.floor(state.run?.player.pos.y ?? 0), state.run?.player.hp, state.run?.player.potions, JSON.stringify(state.run?.progress), Object.values(state.run?.materials ?? {}).join(','), state.run?.battle?.wave, state.run?.battle?.won, Math.floor(state.run?.time??0), state.run?.battle?.pending.length, state.run?battleWorld(state.run).enemies.map(e => `${e.id}:${e.hp > 0 ? 1 : 0}`).join(','):undefined, state.summary?.success, this.npc, this.panel?.kind, this.panel?.id, this.characterTab, this.equipmentSlot, this.careerPreview].join('|') : page;
    if (force || signature !== this.signature) { this.signature = signature; this.renderScreen(state, page); this.renderOverlay(); this.renderControls(state, page); }
    this.renderHud(state, page);
  }
  private icon(key: string) {
    return this.options.renderer()?.icon(key === 'player' ? 'weapon' : key) ?? '';
  }
  private panelScene(kind: string, s: GameState): string {
    const scenes: Record<string, [string,string,string]> = {
      quests: ['scroll',this.npc === 'ali' ? '祝苇的委托柜台' : '顾檀的调查记录','接取委托 · 带回证据 · 回所提交'],
      warehouse: ['bag','证物已归档','带回的样本与零件，存放于调查所'],
      settings: ['radio','调查所通讯台','声音、动态效果与本机调查记录'],
      upgrade: ['building',s.research?'外勤研究与设施整备':s.shop === 1 ? '扩建研究与整备区' : '研究与整备区已开放',s.research?'训练、整备，迎接下一次出发':'旧设施焕新，迎接更危险的调查'],
      'run-bag': ['bag','外勤证物袋',s.research?'材料结算保留 · 证据需撤离':'本次拾取 · 安全撤离后入档'],
      'run-tasks': ['scroll','随行案卷','核对目标，带回委托人需要的证据'],
      help: ['compass','外勤手册','看清危险，保持距离，寻找输出窗口'],
    };
    const item=scenes[kind];
    return item ? `<figure class="panel-scene scene-${kind}"><span class="scene-object">${img(item[0],item[1],k=>this.icon(k))}</span><figcaption><strong>${item[1]}</strong><span>${item[2]}</span></figcaption></figure>` : '';
  }
  private decoratePanel(s: GameState): void {
    const kind=this.panel?.kind ?? '';
    this.screen.querySelector('.panel-scroll')?.insertAdjacentHTML('afterbegin',this.panelScene(kind,s));
  }
  private renderScreen(s: GameState | null, page: AppPage) {
    this.screen.dataset.page = page;
    this.screen.dataset.panel = s ? this.panel?.kind ?? '' : '';
    this.screen.dataset.lobby = 'false';
    this.worldMap.detach();
    this.screen.replaceChildren();
    if (s && this.panel && !['confirm', 'confirm-new', 'settings-import', 'none'].includes(this.panel.kind)) {
      this.screen.innerHTML = this.panelContent(s);
      this.decoratePanel(s);
      if (this.panel.kind === 'prepare') this.worldMap.attach(this.screen);
      if (this.panel.kind === 'character' && this.equipmentSlot) this.screen.querySelector<HTMLElement>('.equipment-sheet .close-panel')?.focus();
      return;
    }
    if (page === 'home') { this.screen.innerHTML = this.home(s); return; }
    if (page === 'result' && s?.summary) { this.screen.innerHTML = this.result(s); return; }
    if (page === 'shop' && s) { this.screen.dataset.lobby = 'true'; this.screen.innerHTML = this.shop(s); this.lobby.fit(); return; }
    if (page === 'run' && s?.run) { this.screen.innerHTML = this.runScreen(s); return; }
    this.screen.innerHTML = '<div class="screen-fallback"></div>';
  }
  private panelContent(s: GameState): string {
    const kind = this.panel?.kind;
    if (kind === 'quests') return this.quests(s);
    if (kind === 'quest-detail') return this.questDetail(s, this.panel?.id);
    if (kind === 'character') return this.character(s);
    if (kind === 'upgrade') return this.upgrade(s);
    if (kind === 'prepare') return this.prepare(s);
    if (kind === 'warehouse') return this.warehouse(s);
    if (kind === 'settings') return this.settings();
    if (kind === 'pause') return this.pausePanel(s);
    if (kind === 'run-map' || kind === 'run-bag' || kind === 'run-tasks') return this.runPanel(s, kind);
    if (kind === 'help') return this.helpPanel();
    return this.options.page() === 'run' ? this.pausePanel(s) : '';
  }
  private pausePanel(s: GameState): string {
    const r = s.run!;
    const link=(action:string,label:string,icon:LobbyToolId)=>`<button class="button pause-link" data-action="${action}">${lobbyToolIcon(icon)}<span>${label}</span></button>`;
    return '<div class="run-drawer pause-drawer"><div class="drawer-heading"><span class="eyebrow">调查暂停 · ' + esc(BOSSES[r.boss].arena.name) + '</span>' + button('resume', '继续', 'button-secondary button-small') + '</div><div class="pause-title"><span class="pause-sigil">' + img('lamp','外勤提灯',k=>this.icon(k)) + '</span><h2>确认战区与补给。</h2><p>区域围攻已暂停。Lv.' + experience(s).level + (r.rogue?' · 本局经验 ':' · 累计能量 ') + experience(s).total + (r.rogue?'，结算后重置。研究能量、金币与装备结算保留。':'，失败后保留。') + '</p>' + (r.rogue?'<p>'+Object.entries(r.rogue.skills).map(([id,n])=>SKILLS[id as SkillId].name+' '+n+'阶').join(' · ')+'</p>':'') + '</div><div class="pause-links">' + link('panel:run-map','战区地图','quests') + link('panel:run-bag','证据与补给','character') + link('panel:run-tasks','本次案件','warehouse') + link('panel:help','操作帮助','settings') + '</div><div class="pause-recovery"><span>生命 <strong>' + Math.floor(r.player.hp) + ' / ' + maxHealth(s) + '</strong></span><span>补给 <strong>' + r.player.potions + '</strong></span></div><div class="pause-actions">' + button('use-potion', '使用急救包 · +40', 'button-secondary', !r.player.potions || r.player.hp >= maxHealth(s)) + button('resume', '继续调查', 'button-primary') + button('abandon-run', '结束本次调查', 'button-danger quiet-danger') + '</div></div>';
  }
  private runPanel(s: GameState, kind: string): string {
    const r = s.run!;
    if (kind === 'run-map') {
      const arena=BOSSES[r.boss].arena,world=battleWorld(r);
      const position=(p:{x:number;y:number})=>`left:${(p.x-.5)/arena.width*100}%;top:${(p.y-.5)/arena.height*100}%`;
      const obstacles=arena.obstacles.map(p=>`<span class="arena-map-obstacle" style="${position(p)}">${img('rock','掩体',k=>this.icon(k))}</span>`).join('');
      const objects=world.objects.filter(o=>!o.used).map(o=>`<span class="arena-map-object" style="${position(o.pos)}">${img(o.kind==='exit'?'device':'chest',o.kind==='exit'?'撤离信标':'补给箱',k=>this.icon(k))}</span>`).join('');
      return `<div class="run-drawer inset-drawer">${this.panelHeader('战区地图',arena.name)}<div class="panel-scroll map-content"><div class="arena-overview" role="img" aria-label="${esc(arena.name)}，显示掩体、补给、撤离信标和当前位置" style="aspect-ratio:${arena.width}/${arena.height};background-image:linear-gradient(#06101922,#06101922),url('${arena.background??'/assets/game/pier-ground.png'}')">${obstacles}${objects}<i class="arena-map-player" style="${position(r.player.pos)}" title="你的位置"></i></div><p class="map-tip">金点为当前位置。可上下左右移动，绕过掩体处理围攻。敌群分批出现，第五波 Boss 就近显现；地图不提供传送。</p></div><div class="panel-actions">${button('panel:pause','返回暂停','button-primary')}</div></div>`;
    }

    if (kind === 'run-bag') {
      const rows = (['crystal', 'iron'] as const).map(key => { const name = MATERIAL_NAMES[key]; return '<div class="material-row">' + img(key, name, k => this.icon(k)) + '<span><strong>' + name + '</strong><small>本次调查取得</small></span><b>' + r.materials[key] + '</b></div>'; }).join('');
      const empty = !r.materials.crystal && !r.materials.iron ? '<div class="empty-illustration"><strong>还没有收集物资</strong><p>靠近掉落即可自动收集。证据没有携带上限。</p></div>' : '';
      return '<div class="run-drawer inset-drawer">' + this.panelHeader('证据与物资', r.rogue?'材料结算保留；案件证据需要安全撤离。':'携带量不限，成功撤离后带回调查所。') + '<div class="panel-scroll material-list run-materials">' + empty + rows + '<div class="supply-stock">' + img('medkit', '急救包', k => this.icon(k)) + '<span>急救包</span><strong>' + r.player.potions + ' 个</strong>' + button('use-potion', '使用 · 恢复 40', 'button-small button-secondary', !r.player.potions || r.player.hp >= maxHealth(s)) + '</div><p class="map-tip">'+(r.rogue?'本局研究能量 '+r.rogue.research+' · 冥币 '+r.rogue.gold+'。失败仍可保留，案件证据除外。':'调查失败会失去本次新取得的物资。')+'</p></div><div class="panel-actions">' + button('panel:pause', '返回暂停', 'button-primary') + '</div></div>';
    }
    const tasks = s.quests.map(q => '<article class="run-task ' + (q.ready ? 'task-ready' : '') + '">' + img(QUESTS[q.id].icon, QUESTS[q.id].title, k => this.icon(k)) + '<span><strong>' + esc(QUESTS[q.id].title) + '</strong><small>' + (q.ready ? '目标已达成，撤离后可提交' : '案件进度 ' + q.progress + '/' + QUESTS[q.id].goal + ' · 本次 +' + (r.progress[q.id] ?? 0)) + '</small></span><b>' + (q.ready ? '✓' : '↗') + '</b></article>').join('');
    return '<div class="run-drawer inset-drawer">' + this.panelHeader('本次案件', '目标进度会在安全撤离后记录。') + '<div class="panel-scroll run-task-list">' + (tasks || '<div class="empty-illustration"><strong>自由调查</strong><p>本次没有接取案件。物资仍可带回调查所。</p></div>') + '</div><div class="panel-actions">' + button('panel:pause', '返回暂停', 'button-primary') + '</div></div>';
  }
  private helpPanel(): string {
    const items = [['01','左手移动','左下区域拖动摇杆。松开停止；撞上障碍后沿边缘滑动。'],['02','自动射击','进入战斗后会自动锁定最近的可见怪物射击，不用对准，也不用按攻击键。'],['03','看清预警再躲开','怪物出现攻击预警或地面法术标记时，移动或闪避离开危险区。'],['04','靠近目标再交互','靠近补给箱、案件证物或撤离信标后，点击交互按钮。'],['05','应对四周敌群','全副本共五波，波内分批增援。可向各方向走位，残敌继续追击，第五波 Boss 在附近显现。'],['06','查看战区和案件','暂停时查看战区地图、证物、案件和补给；调查时间不会推进。']];
    const content=items.map(item => '<div class="help-step"><span class="step-no">' + item[0] + '</span><div><strong>' + item[1] + '</strong><p>' + item[2] + '</p></div></div>').join('');
    return '<div class="run-drawer inset-drawer">' + this.panelHeader('调查操作', '左手移动 · 右手闪避与交互') + '<div class="panel-scroll help-content">' + content + '<div class="help-footnote">自动射击不受角色朝向限制。新成长规则中，拾取青色能量升级并三选一；所有技能自动释放。本局等级与技能在结算后重置。</div></div><div class="panel-actions">' + button('panel:pause', '回到暂停', 'button-primary') + '</div></div>';
  }
  private home(s: GameState | null) {
    const resume = s?.run ? '调查中 · 回到已保存的位置' : s?.summary ? '雾港沉船区 · 调查已完成' : s ? '雾港调查所 · 沉船区开放' : '案件 · 远程战斗 · 调查所成长';
    return `<div class="cover-wrap"><div class="cover-mark"><span class="cover-emblem">${img('compass','调查所徽记',k=>this.icon(k))}</span><span>雾港异闻调查所</span></div><div class="cover-title"><p class="eyebrow">克苏鲁风格 · 竖屏动作冒险</p><h1>雾港<br><span>调查所</span></h1><p class="cover-lead">接下失联船员的案件，<br>带上职业武器，深入沉船区。</p><p class="cover-note">${resume}</p></div><div class="cover-actions">${s ? button('continue', '继续调查', 'button-primary') : ''}${button('new-game', s ? '重新开始' : '开始调查', s ? 'button-secondary' : 'button-primary')}${button('panel:settings', '设置与存档', 'button-quiet')}<p class="cover-note">提灯照亮归途，案卷记录真相。</p></div><div class="cover-index">01 <i></i> 03&nbsp;&nbsp; 异常区域档案</div></div>`;
  }
  private shop(s: GameState) { return renderLobby(s); }
  private runScreen(s: GameState) {
    const xp=experience(s);
    const r=s.run!,hp=Math.round(r.player.hp),max=maxHealth(s),wave=r.battle?.wave??0;
    const waves=combatWaves(r),next=waves[wave],count=aliveEnemies(r).length;
    const active=waves[wave-1],batch=r.battle?.batches?.[wave-1]??0;
    const nextBatch=active&&batch<active.batches?active.at+batch*active.batchInterval:null;
    const heading=r.battle?.won?'调查胜利':wave===0?'入场准备':wave===5?'第 5 / 5 波 · Boss 战':`第 ${wave} / 5 波`;
    const detail=r.battle?.won?'战利品已汇集 · 可撤离':r.battle?.pending.some(p=>!p.queued)?'四周显现 · 注意标记':nextBatch!==null?`${Math.max(0,Math.ceil(nextBatch-r.time))}秒后 · 敌群增援`:next?`${Math.max(0,Math.ceil(next.at-r.time))}秒后 · 第${wave+1}波`:`残敌 ${count}`;
    return `<header class="topbar battle-top"><div class="health-pack"><span class="health-caption">生命</span><span class="health-track"><i class="health-fill" style="width:${Math.max(0,hp/max*100)}%"></i></span><strong>${hp}<small>/${max}</small></strong></div><div class="energy-pack"><span>Lv.${xp.level}</span><span class="energy-track" role="progressbar" aria-label="克苏鲁能量经验" aria-valuemin="0" aria-valuemax="${xp.required}" aria-valuenow="${xp.capped?xp.required:Math.min(xp.current,xp.required)}"><i style="width:${xp.capped?100:Math.min(100,xp.current/xp.required*100)}%"></i></span><span>${xp.capped?'满级':`${xp.current}/${xp.required}`}</span></div><div class="wave-bar"><strong>${heading}</strong><span>${detail}</span></div><button class="button pause-button" data-action="pause" aria-label="暂停调查，查看案件与补给">Ⅱ</button></header><div class="battle-bottom-note"><span>残敌 ${count}</span><span>急救 ${r.player.potions}</span></div>`;
  }
  private result(s: GameState) {
    const sum=s.summary!, losses=!sum.success;
    const rows=Object.entries(sum.materials).filter(([,n])=>n>0).map(([id,n])=>{const name=id==='crystal'?MATERIAL_NAMES.crystal:MATERIAL_NAMES.iron;return `<div class="result-row">${img(id,name,k=>this.icon(k))}<span>${name}</span><strong>+${n}</strong></div>`;}).join('')||'<div class="empty-state compact-empty">没有带回物资</div>';
    const finished=sum.ready.map(id=>`<span class="badge is-ready">${QUESTS[id].title} · 可交付</span>`).join('');
    const progress=s.quests.filter(q=>!q.ready).map(q=>`<div class="settle-quest"><span>${QUESTS[q.id].title}</span><strong>${q.progress}/${QUESTS[q.id].goal}</strong></div>`).join('');
    const mainDamage=Object.entries(sum.harm).sort((a,b)=>b[1]-a[1])[0];
    return `<div class="result-screen ${losses?'result-fail':''}"><div class="result-topline"><span>${losses?'调查记录 · 失败':'调查记录 · 已撤离'}</span><span>雾港沉船区</span></div><div class="result-heading"><span class="result-seal">${img(losses?'medkit':'seal',losses?'重生救护记录':'调查封印',k=>this.icon(k))}</span><p class="eyebrow">${losses?'调查员已返回调查所':'安全抵达 · 资料已入档'}</p><h1>${losses?'调查失败 · 已重生':'成功撤离'}</h1><p>${losses?(sum.rogue?'研究能量、冥币、装备与材料已入库。本局等级和技能已重置，证据需要重新调查。':'角色已在调查所重整。本次未撤离的物资与案件进度已丢失，永久成长保留。'):'物资已经安全入库。回所提交案件并选择成长方向。'}</p></div><section class="result-card"><div class="section-title-row"><span>本次物资</span><small>${losses&&!sum.rogue?'未能带回':'已经入库'}</small></div><p class="result-footnote">${sum.rogue?`本局 Lv.${sum.rogue.level} · 已重置<br>研究能量 +${sum.rogue.research} · 冥币 +${sum.rogue.gold} · 已保留`:`Lv.${experience(s).level} · 本次能量 +${sum.energyGained??0} · 已保留`}</p>${sum.rogue?.equipment.map(id=>`<div class="result-row">${img(EQUIPMENT[id].slot==='weapon'?'weapon':EQUIPMENT[id].slot==='armor'?'armor':'compass',EQUIPMENT[id].name,k=>this.icon(k))}<span>${EQUIPMENT[id].name}</span><strong>已入库</strong></div>`).join('')??''}${rows}${finished}<div class="result-divider"></div>${progress||'<p class="muted small">本次没有新增案件进度</p>'}${mainDamage?`<p class="result-footnote">主要受伤来源：${esc(mainDamage[0])} · ${mainDamage[1]}</p>`:''}<p class="result-footnote">急救包使用 ${sum.potionsUsed} 个 · ${losses?'案件进度保留在上次成功撤离时':'案件奖励回所提交后领取'}</p></section><div class="result-actions">${button('return-shop','返回调查所','button-primary')}${losses?button('retry-run','再次出发','button-secondary'):''}</div></div>`;
  }
  private quests(s: GameState) {
    const npc=this.npc==='ali'?'ali':'lanzhou', name=npc==='ali'?'祝苇':'顾檀';
    const available=availableQuests(s).filter(id=>QUESTS[id].npc===npc);
    const current=s.quests.filter(q=>QUESTS[q.id].npc===npc);
    const locked=npc==='lanzhou'&&s.shop<2;
    const task=(id:QuestId,cur?:typeof s.quests[number])=>{const d=QUESTS[id];return `<button class="task-card ${cur?.ready?'task-ready':''} ${cur?'task-active':''}" data-action="quest-detail" data-value="${id}"><span class="task-art">${this.icon(d.icon)?`<img src="${this.icon(d.icon)}" alt="">`:`<span>${d.type==='clear'?'⚔':d.type==='survey'?'⌕':'◆'}</span>`}</span><span class="task-copy"><strong>${esc(d.title)}</strong><small>${cur?cur.ready?'完成 · 待提交':`进行中 · ${cur.progress}/${d.goal}`:`沉船区 · ${d.type==='boss'?'区域 Boss':'普通案件'}`}</small></span><span class="task-reward"><b>${cur?.ready?'提交':d.type==='boss'?'Boss':'↗'}</b><small>${cur?.ready?'已达成':`${d.gold} 冥币`}</small></span><span class="task-arrow">›</span></button>`;};
    const cards=[...current.map(q=>task(q.id,q)),...available.filter(id=>!s.quests.some(q=>q.id===id)).map(id=>task(id))];
    const other=s.shop>=2?`<button class="npc-lock-card" data-action="quest-detail" data-value="depth-locked" ${s.depth>=2?'disabled':''}><span class="lock-ring">${s.depth>=2?'✓':'Ⅱ'}</span><span><strong>${s.depth>=2?'后续调查区已记录':'后续调查区筹备中'}</strong><small>${s.depth>=2?'沉没修道院内容将在后续阶段开放。':'击败潮汐巨像并提交组织样本。'}</small></span></button>`:'';
    return `${this.panelHeader('案件档案',`${name} · ${s.quests.filter(q=>!q.ready).length}/2 项进行中`)}${this.npcTabs(s)}<div class="panel-scroll quest-list">${locked?`<div class="empty-illustration locked-empty"><span class="empty-symbol">◈</span><strong>扩建后守夜人会来访</strong><p>升级调查所后，顾檀会提供潮汐巨像案件。</p>${button('panel:upgrade','查看设施升级','button-small button-secondary')}</div>`:cards.length?`<div class="task-section-label">${current.length?'已接取与可提交':'可接案件'}</div>${cards.join('')}${other}`:`<div class="empty-illustration"><span class="empty-symbol">◈</span><strong>暂时没有新案件</strong><p>先完成当前目标，再回所查看其他案件。</p></div>`}</div><div class="panel-actions">${button('back','回到调查所','button-secondary')}</div>`;
  }
  private questDetail(s:GameState,id?:string){
    if(!id||id==='depth-locked'){
      const unlocked=s.depth>=2;
      const title=unlocked?'后续区域状态':'下一处调查区';
      const description=unlocked?'潮汐巨像案件已提交。沉没修道院的内容将在后续阶段制作；当前可以继续沉船区案件和角色成长。':'升级调查所，接取并完成潮汐巨像案件。后续调查区会在下一阶段开放。';
      return `${this.panelHeader(title,unlocked?'主线线索已归档':'沉没修道院筹备中')}${this.npcTabs(s)}<div class="panel-scroll"><div class="locked-detail"><span class="empty-symbol">Ⅱ</span><h3>${unlocked?'沉没修道院':'下一处异常区域'}</h3><p>${description}</p>${button('back','查看案件列表','button-primary')}</div></div>`;
    }
    const key=id as QuestId,d=QUESTS[key],current=s.quests.find(q=>q.id===key),locked=!availableQuests(s).includes(key)&&!current;
    const action=current?.ready?'deliver':current?'abandon':'accept';
    const label=locked?'尚未开放':current?.ready?'提交并领取':current?'放弃案件':'接取案件';
    const can=locked||(!current&&s.quests.length>=(s.tutorialDone?2:1));
    const mainAction=action==='deliver'?'deliver':action==='abandon'?'abandon':'accept';
    return `${this.panelHeader('案件详情',d.npc==='ali'?'发布者 · 祝苇':'发布者 · 顾檀')}<div class="panel-scroll quest-detail"><div class="quest-detail-banner">${img(d.icon,d.title,k=>this.icon(k),'detail-icon')}<div><span class="eyebrow">${key==='K0'?'初始案件':d.type==='boss'?'区域 Boss 案件':'沉船区案件'}</span><h3>${esc(d.title)}</h3></div></div><div class="detail-block"><span class="detail-label">调查目标</span><p>${esc(d.description)}</p><div class="task-scene-hint">${d.type==='find'?'◆ 击败指定怪物并拾取案件物品，随后安全撤离。':d.type==='survey'?'⌕ 靠近信标控制台，持续交互两秒。':d.type==='clear'?'⚔ 击败目标异常生物，撤离后保留计数。':'◆ 击败所选 Boss，拾取组织样本并使用撤离信标。'}</div></div><div class="reward-card"><span class="detail-label">提交案件奖励</span><div class="reward-value"><strong>${d.gold}</strong><span>冥币</span></div><div class="reward-mats">${d.reward.crystal?`<span>${img('crystal',MATERIAL_NAMES.crystal,k=>this.icon(k))} ${MATERIAL_NAMES.crystal} ×${d.reward.crystal}</span>`:''}${d.reward.iron?`<span>${img('iron',MATERIAL_NAMES.iron,k=>this.icon(k))} ${MATERIAL_NAMES.iron} ×${d.reward.iron}</span>`:''}</div><small>奖励在调查所提交时领取，完成目标不会自动发放。</small></div>${current?`<div class="progress-card"><span>当前进度</span><strong>${current.progress}/${d.goal}${current.ready?' · 已达成，等待提交':''}</strong></div>`:can?'':`<p class="inline-warning">同时最多接取${s.tutorialDone?'两':'一'}项案件，请先提交或放弃当前案件。</p>`}</div><div class="panel-actions dual-action">${button('back','返回列表','button-secondary')}${button(mainAction,label,'button-primary',can, key)}</div>`;
  }
  private prepare(s:GameState){
    return renderExpeditionPanel(s, { preview: this.panel?.id, region: this.panel?.id?.startsWith('region:') ? this.panel.id.slice(7) : undefined, icon: key => this.icon(key) });
  }
  private character(s:GameState){
    return this.panelHeader('整备室', '角色穿戴与职业档案') + renderCharacterPanel(s, {
      tab: this.characterTab, slot: this.equipmentSlot, preview: this.careerPreview, icon: key => this.icon(key),
    });
  }
  private upgrade(s:GameState){
    const fee=s.shop===1?UPGRADES.shop:null;
    const insufficient=!!fee&&(s.gold<fee.gold||s.materials.crystal<fee.crystal||s.materials.iron<fee.iron);
    const title=s.research?'研究与扩建':'调查所升级';
    const description=s.research?'研究训练始终开放，扩建后增加高级委托。':'扩建设施会吸引新的案件发布者。';
    const nextDescription=s.research?'新联系人 · 巨像案件':'新联系人 · 职业能力 · 巨像案件';
    const unlocks=s.research?'<p>灯塔守夜人顾檀到访，发布巨像调查案件。</p><p>研究训练和装备强化无需等待扩建。</p>':'<p>武器校准、防水护具和职业强化能力。</p><p>灯塔守夜人顾檀到访，发布潮汐巨像案件。</p>';
    const expansion=fee?`<div class="shop-level-compare"><div class="level-picture"><small>当前设施</small><span class="level-mark">01</span><strong>联络站</strong><p>案件柜台 · 基础整备</p></div><span class="level-arrow">→</span><div class="level-picture next-level"><small>扩建目标</small><span class="level-mark">02</span><strong>研究与整备所</strong><p>${nextDescription}</p></div></div><div class="facility-unlocks"><div class="section-title-row"><strong>扩建后开放</strong></div>${unlocks}</div><div class="upgrade-cost-card"><div class="section-title-row"><strong>扩建费用</strong><span>${insufficient?'物资尚未备齐':'物资已备齐'}</span></div><p>${this.cost('冥币',s.gold,fee.gold)}${this.cost(MATERIAL_NAMES.crystal,s.materials.crystal,fee.crystal)}${this.cost(MATERIAL_NAMES.iron,s.materials.iron,fee.iron)}</p></div>`:'<div class="complete-note">研究与整备所已扩建，顾檀的巨像案件已经开放。外海地区继续按海图档案中的条件开放。</div>';
    return `${this.panelHeader(title,description)}<div class="panel-scroll upgrade-panel">${renderResearch(s)}${expansion}</div><div class="panel-actions dual-action">${button('back','返回调查所','button-secondary')}${fee?button('upgrade',insufficient?'查看所缺物资':'扩建调查所','button-primary',false,'shop'):''}</div>`;
  }
  private cost(name:string,have:number,need:number){return `<span>${esc(name)} <b class="${have<need?'cost-missing':''}">${have}/${need}</b></span>`;}
  private settings(){const a=this.options.audio();return `${this.panelHeader('设置与存档','新版进度保存在当前浏览器。')}<div class="panel-scroll settings-list"><label class="setting-row"><span><strong>背景音乐</strong><small>调查所与沉船区氛围</small></span><input type="checkbox" data-setting="music" ${a.music?'checked':''}></label><label class="setting-row"><span><strong>音效</strong><small>射击、受击、拾取与案件反馈</small></span><input type="checkbox" data-setting="sound" ${a.sound?'checked':''}></label><label class="setting-row"><span><strong>减少动态效果</strong><small>关闭场景循环动画，减少画面动态</small></span><input type="checkbox" data-setting="reducedMotion" ${a.reducedMotion?'checked':''}></label><div class="settings-divider"></div><div class="section-title-row"><strong>存档管理</strong><small>单机 · 本地保存</small></div><p class="settings-note">新版进度保存在此设备和网站地址。旧版矿洞存档保留在独立数据库中。</p>${button('export-save','导出新版存档','button-secondary')}${button('import-save','导入新版存档','button-secondary')}<p class="settings-note">曾转换成长规则时，可导出转换前备份。</p>${button('export-legacy-backup','导出成长转换前备份','button-secondary')}${button('new-game','重新开始','button-danger quiet-danger')}</div><div class="panel-actions">${button('back','返回调查所','button-primary')}</div>`;}
  private warehouse(s:GameState){return `${this.panelHeader('档案与物资','调查带回的样本与零件，用于装备和设施成长。')}<div class="panel-scroll warehouse-panel"><div class="warehouse-summary"><span>本地档案 · 已保存</span><strong>∞<small> 无携带上限</small></strong></div><div class="material-list">${this.materialRow('crystal',s.materials.crystal)}${this.materialRow('iron',s.materials.iron)}</div><div class="warehouse-use"><div class="section-title-row"><strong>物资用途</strong><small>外勤装备与设施</small></div><p>异变样本用于研究职业弹药和设施扩建。</p><p>铜合金零件用于校准武器和加固防护。</p><p>物资没有背包容量限制。</p></div></div><div class="panel-actions">${button('back','返回调查所','button-primary')}</div>`;}
  private materialRow(id:'crystal'|'iron',amount:number){const n=MATERIAL_NAMES[id];return `<div class="material-row">${img(id,n,k=>this.icon(k))}<span><strong>${n}</strong><small>${id==='crystal'?'异常组织样本 · 研究与扩建':'船体铜件 · 武器与防护'}</small></span><b>${amount}</b></div>`;}
  private modal(){
    const startup=this.options.startupError?.();
    if(startup)return `<div class="dialog-backdrop"><section class="dialog-card" role="alertdialog" aria-modal="true"><span class="dialog-mark is-danger">${img('radio','通讯警报',k=>this.icon(k))}</span><p class="eyebrow">本机存档读取失败</p><h2>事务所尚未打开</h2><p>${esc(startup)}</p><p>原存档仍保留。可以重试、导出原数据，或确认重置后重新开始。</p><div class="dialog-actions">${button('retry-start','重试','button-secondary')}${button('export-save','导出原数据','button-secondary')}${button('reset-save','确认重置','button-danger')}</div></section></div>`;
    if(this.options.savingError())return `<div class="dialog-backdrop"><section class="dialog-card" role="alertdialog" aria-modal="true"><span class="dialog-mark is-danger">${img('radio','通讯警报',k=>this.icon(k))}</span><p class="eyebrow">存档未写入</p><h2>进度已经暂停</h2><p>${esc(this.options.savingError())}</p><p>当前操作保留在内存中。重试保存成功后即可继续；也可以先导出当前内存进度。</p><div class="dialog-actions">${button('retry-save','重试保存','button-primary')}${button('export-unsaved','导出当前进度','button-secondary')}</div></section></div>`;
    if(this.panel?.kind==='confirm'&&this.panel.id){const parts=this.panel.id.split('|');return `<div class="dialog-backdrop"><section class="dialog-card" role="alertdialog" aria-modal="true"><span class="dialog-mark">${img('seal','确认操作',k=>this.icon(k))}</span><p class="eyebrow">请确认操作</p><h2>${esc(parts[0])}</h2><p>${esc(parts[1])}</p><div class="dialog-actions">${button('cancel','再想想','button-secondary')}${button('confirm','确认继续','button-danger')}</div></section></div>`;}
    if(this.panel?.kind==='confirm-new')return `<div class="dialog-backdrop"><section class="dialog-card" role="alertdialog" aria-modal="true"><span class="dialog-mark is-danger">${img('scroll','重新建档',k=>this.icon(k))}</span><p class="eyebrow">替换新版存档</p><h2>重新开始调查？</h2><p>当前版本的调查所、物资和案件进度会被新游戏替换。旧版矿洞存档仍留在独立数据库中。</p><div class="dialog-actions">${button('cancel','返回','button-secondary')}${button('confirm-new','重新开始','button-danger')}</div></section></div>`;
    if(this.panel?.kind==='settings'&&this.panel.id==='import')return `<div class="dialog-backdrop"><section class="dialog-card import-card" role="dialog" aria-modal="true"><span class="dialog-mark">${img('scroll','导入案卷',k=>this.icon(k))}</span><p class="eyebrow">新版本机存档</p><h2>导入进度</h2><p>导入会替换当前版本的调查所。选择新版导出的 JSON 文件后，先核对案件和职业进度。</p><input type="file" accept="application/json,.json" data-file="import"><div class="dialog-actions">${button('cancel','取消','button-secondary')}</div></section></div>`;
    const state=this.options.state();
    if(this.options.page()==='run'&&state?.run?.rogue?.offers.length)return renderSkillChoice(state,k=>this.icon(k));
    return '';
  }
  private overlayLock='';
  private renderOverlay(){const modal=this.modal();if(modal===this.overlayLock)return;this.overlayLock=modal;this.overlay.innerHTML=modal;this.overlay.classList.toggle('is-visible',!!modal);this.overlay.querySelector<HTMLElement>('[role="alertdialog"], [role="dialog"]')?.focus();}
  private renderControls(s:GameState|null,page:AppPage){
    if(page!=='run'||!s?.run){if(this.controls.dataset.active==='battle'){this.releaseControls();this.controls.replaceChildren();this.controls.dataset.active='';}return;}
    if(this.controls.dataset.active==='battle')return;
    this.controls.dataset.active='battle';this.controls.innerHTML=`<div class="controls-well"><div class="stick-zone" data-stick aria-label="左侧移动摇杆"><span class="stick-base"><i class="stick-knob"></i></span></div><div class="action-cluster"><button class="battle-action skill-action" data-touch="skill" aria-label="职业能力"><span class="action-icon">${img('seal','职业能力',k=>this.icon(k))}</span><small>能力</small><i class="cooldown-mask"></i></button><button class="battle-action interact-action is-hidden" data-touch="interact" aria-label="交互"><span class="action-icon">${img('bag','交互',k=>this.icon(k))}</span><small>交互</small></button><button class="battle-action dodge-action" data-touch="dodge" aria-label="闪避"><span class="action-icon">${img('compass','闪避',k=>this.icon(k))}</span><small>闪避</small><i class="cooldown-mask"></i></button><div class="auto-fire-indicator" aria-label="自动射击已开启"><span>${img('weapon','自动射击',k=>this.icon(k))}</span><small>自动</small></div></div></div>`;
    if(s.run.rogue)this.controls.querySelector<HTMLElement>('.skill-action')!.hidden=true;
    const area=this.controls.querySelector<HTMLElement>('[data-stick]')!;
    const knob=area.querySelector<HTMLElement>('.stick-knob')!;
    let stickId:number|null=null;
    const update=(event:PointerEvent)=>{
      const rect=area.getBoundingClientRect(), cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      let dx=(event.clientX-cx)/(rect.width*0.5),dy=(event.clientY-cy)/(rect.height*0.5),mag=Math.hypot(dx,dy);
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){this.options.action('move','0,0');knob.style.transform='translate(0,0)';return;}
      if(mag>1){dx/=mag;dy/=mag;mag=1;}if(mag<0.12){dx=0;dy=0;}
      knob.style.transform=`translate(${dx*37}px,${dy*37}px)`;this.options.action('move',`${dx.toFixed(3)},${dy.toFixed(3)}`);
    };
    area.addEventListener('pointerdown',event=>{if(stickId!==null)return;event.preventDefault();stickId=event.pointerId;area.setPointerCapture(event.pointerId);update(event);});
    area.addEventListener('pointermove',event=>{if(event.pointerId===stickId)update(event);});
    const stopStick=(event:PointerEvent)=>{if(event.pointerId!==stickId)return;stickId=null;knob.style.transform='translate(0,0)';this.options.action('move','0,0');};
    area.addEventListener('pointerup',stopStick);area.addEventListener('pointercancel',stopStick);area.addEventListener('lostpointercapture',stopStick);
    let actionPointer:number|null=null,held='';
    const controls=this.controls.querySelector<HTMLElement>('.action-cluster')!;
    const applyTarget=(element:Element|null)=>{
      const target=element?.closest<HTMLElement>('[data-touch]');
      const next=target?.dataset.touch??'';
      const pulse=(kind:string)=>this.options.action(`pulse:${kind}`);
      if(next===held)return;
      if(held==='interact')this.options.action('hold-interact','0');
      if(next==='interact'){held=next;this.options.action('hold-interact','1');this.options.action('pulse:interact');}
      else if(next==='dodge'||next==='skill'){
        if(next==='skill'&&target?.classList.contains('is-locked')){this.toastMessage('扩建调查所后可解锁职业能力。');held='';return;}
        held=next;pulse(next);
      }
      else held='';
    };
    controls.addEventListener('pointerdown',event=>{
      const target=(event.target as Element).closest<HTMLElement>('[data-touch]');if(!target||actionPointer!==null)return;
      event.preventDefault();actionPointer=event.pointerId;controls.setPointerCapture(event.pointerId);applyTarget(target);
    });
    controls.addEventListener('pointermove',event=>{if(event.pointerId===actionPointer)applyTarget(document.elementFromPoint(event.clientX,event.clientY));});
    const stopAction=(event:PointerEvent)=>{if(event.pointerId!==actionPointer)return;actionPointer=null;if(held==='interact')this.options.action('hold-interact','0');held='';};
    controls.addEventListener('pointerup',stopAction);controls.addEventListener('pointercancel',stopAction);controls.addEventListener('lostpointercapture',stopAction);
    this.releaseControls=()=>{
      if(stickId!==null){const id=stickId;stickId=null;knob.style.transform='translate(0,0)';this.options.action('move','0,0');if(area.hasPointerCapture(id))area.releasePointerCapture(id);}
      if(actionPointer!==null){const id=actionPointer;actionPointer=null;if(held==='interact')this.options.action('hold-interact','0');held='';if(controls.hasPointerCapture(id))controls.releasePointerCapture(id);}
    };
  }
  private renderHud(s:GameState|null,page:AppPage){
    const mode=this.options.paused(),run=s?.run,near=run?nearbyInteraction(s!):null;
    const signature=[page,mode,run?.room,run?.player.hp,run?.player.potions,run?.player.dodgeCd.toFixed(1),run?.player.skillCd.toFixed(1),run?.survey.toFixed(1),near?.id,near?.locked,s?.shop,s?.gold,s?.materials.crystal,s?.materials.iron,s?.quests.map(q=>`${q.id}${q.progress}${q.ready}`).join(','),this.options.pending()].join('|');
    if(signature===this.hudSignature)return;this.hudSignature=signature;
    const skill=this.controls.querySelector<HTMLElement>('[data-touch="skill"]'),dodge=this.controls.querySelector<HTMLElement>('[data-touch="dodge"]');
    skill?.classList.toggle('is-hidden',!s?.skill);skill?.classList.toggle('is-cooldown',(run?.player.skillCd??0)>0);if(skill){skill.querySelector('small')!.textContent=run?.player.skillCd?run.player.skillCd.toFixed(1):s?CAREERS[s.career].skill.replace('标记',''):'能力';skill.setAttribute('aria-label',s?CAREERS[s.career].skill:'职业能力');}
    dodge?.classList.toggle('is-cooldown',(run?.player.dodgeCd??0)>0);if(dodge)dodge.querySelector('small')!.textContent=run?.player.dodgeCd?run.player.dodgeCd.toFixed(1):'闪避';
    const interact=this.controls.querySelector<HTMLElement>('[data-touch="interact"]');if(interact){const caption=interactionCaption(near?.label,near?.locked);interact.classList.toggle('is-hidden',!near);interact.classList.toggle('is-locked',!!near?.locked);interact.querySelector('small')!.textContent=caption;interact.setAttribute('aria-label',near?.locked??near?.label??'交互');interact.title=near?.locked??near?.label??'';}
    this.controls.classList.toggle('is-paused',page==='run'&&mode);
    const orientation=matchMedia('(orientation: landscape) and (pointer: coarse)').matches;
    this.orientation.classList.toggle('is-visible',orientation&&page==='run');
  }
  resetControls(){this.releaseControls();}
  private npcTabs(s:GameState){return `<div class="npc-tabs" role="tablist">${[['ali','祝苇',true],['lanzhou','顾檀',s.shop>=2]].map(([id,n,enabled])=>`<button class="npc-tab ${this.npc===id?'is-selected':''}" role="tab" aria-selected="${this.npc===id}" data-action="npc" data-value="${id}" ${enabled?'':'disabled'}>${n}${id==='ali'&&s.quests.some(q=>q.id!=='K1'&&q.ready)?'<i class="npc-ready"></i>':''}</button>`).join('')}</div>`;}
  private panelHeader(title:string,sub=''){return `<header class="panel-heading"><div><span class="eyebrow">雾港调查所 / 案件与整备</span><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div><button class="close-panel" data-action="back" aria-label="关闭面板">×</button></header>`;}
  toastMessage(message:string){const now=performance.now();if(now-this.lastToast<650)return;this.lastToast=now;this.toast.textContent=message;this.toast.classList.add('is-visible');this.toast.setAttribute('aria-live','polite');window.setTimeout(()=>this.toast.classList.remove('is-visible'),2200);}
  showCritical(kind:string){this.hud.dataset.event=kind;window.setTimeout(()=>{this.hud.dataset.event='';},220);}
}
