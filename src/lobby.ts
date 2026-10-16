import './lobby.css';
import { MATERIAL_NAMES, QUESTS } from './model.ts';
import type { GameState } from './model.ts';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hotspot = (key: string, action: string, label: string, hint: string, value = '', marker = '') =>
  `<button type="button" class="lobby-hotspot spot-${key}" data-lobby-zone="${key}" data-action="${action}" ${value ? `data-value="${value}"` : ''} aria-label="${escapeHtml(hint)}"><span class="lobby-plaque">${label}</span>${marker ? `<span class="lobby-marker">${marker}</span>` : ''}</button>`;

// Sprite bounds belong to the four illustrated frames, not CSS button chrome.
const tools = [
  { id: 'quests', label: '案件', action: 'panel:quests', box: [110,116,565,567] },
  { id: 'character', label: '职业', action: 'panel:character', box: [686,116,1143,566] },
  { id: 'settings', label: '设置', action: 'panel:settings', box: [110,690,565,1136] },
  { id: 'warehouse', label: '档案', action: 'panel:warehouse', box: [686,690,1143,1136] },
];
export type LobbyToolId = typeof tools[number]['id'];
export function lobbyToolIcon(id: LobbyToolId): string {
  const { box: [x,y,right,bottom] } = tools.find(tool => tool.id === id)!;
  const width=right-x, height=bottom-y;
  return `<span class="lobby-tool-art lobby-tool-art-inline" aria-hidden="true"><img src="/assets/lobby/brass-tools-mobile.webp" alt="" style="width:${1254/width*100}%;height:${1254/height*100}%;left:${-x/width*100}%;top:${-y/height*100}%"></span>`;
}
const illustratedTools = (ready: number) => tools.map(({ id, label, action }) => {
  return `<button type="button" class="lobby-game-tool" data-action="${action}" aria-label="${label}">${lobbyToolIcon(id)}<small>${label}</small>${label==='案件'&&ready?`<i class="lobby-tool-badge">${ready}</i>`:''}</button>`;
}).join('');

export function renderLobby(s: GameState): string {
  const ready = s.quests.filter(q => q.ready);
  const aliReady = ready.some(q => QUESTS[q.id].npc === 'ali');
  const questHint = aliReady ? '祝苇 · 提交案件' : '祝苇 · 接取委托';
  const lamps = [[39,12,0],[33,35,0.8],[59,35,1.7],[5,57,0.4],[37,65,1.2],[39,81,2.1],[85,84,0.6]];
  return `<div class="lobby-scene" data-focus="" data-reduced="${s.settings.reducedMotion}" aria-label="多层雾港调查所">
    <div class="lobby-stage">
      <img class="lobby-background" src="/assets/lobby/cutaway-harbor-mobile.webp" alt="雨夜中的多层调查所：楼上望远镜与空白木牌，中层委托和档案，下层整备和扩建" decoding="async" fetchpriority="high">
      <div class="lobby-weather" aria-hidden="true"><i class="lobby-rain"></i><i class="lobby-fog"></i></div>
      <div class="lobby-sea" aria-hidden="true"></div>
      ${lamps.map(([x,y,delay]) => `<i class="lobby-lamp" style="left:${x}%;top:${y}%;--delay:-${delay}s" aria-hidden="true"><i></i></i>`).join('')}
      <span class="lobby-hero-shadow" aria-hidden="true"></span>
      <span class="lobby-hero" aria-label="外勤调查员待机"><img src="/assets/lobby/investigator-cutaway-mobile.webp" alt="" decoding="async"></span>
      <div class="lobby-dust" aria-hidden="true">${[12,24,42,55,67,81].map((x,i)=>`<i style="left:${x}%;--delay:-${i*1.8}s"></i>`).join('')}</div>
      ${hotspot('quests','npc','委托',questHint,'ali',aliReady ? '✓' : '!')}
      ${hotspot('archives','panel:warehouse','档案','查看证物与材料档案')}
      ${hotspot('gear','panel:character','整备','职业、武器与防护整备')}
      ${hotspot('upgrade','panel:upgrade','升级',s.research?'研究训练与调查所扩建':s.shop===2 ? '调查所已扩建 · 查看设施' : '扩建调查所，开放研究与高级委托','',s.shop===2 ? 'II' : '')}
      ${s.shop===2 ? '<button type="button" class="lobby-keeper" data-action="npc" data-value="lanzhou" aria-label="顾檀 · 高级委托">顾檀 <span>◆</span></button>' : ''}
      <div class="lobby-footer">
        <nav class="lobby-game-tools" aria-label="调查所快捷操作">${illustratedTools(ready.length)}</nav>
        <button type="button" class="lobby-departure" data-action="panel:prepare" aria-label="出发 · 选择 Boss 副本">
          <span class="lobby-lantern-art" aria-hidden="true"><img src="/assets/lobby/departure-lantern-mobile.webp" alt=""></span>
          <i class="lobby-lantern-glow" aria-hidden="true"></i><i class="lobby-lantern-flame" aria-hidden="true"></i>
          <strong class="lobby-departure-label">出发</strong>
        </button>
      </div>
    </div>
    <div class="lobby-loading" role="status"><span>正在载入调查所图像…</span><button type="button" data-lobby-retry hidden>重试图像</button></div>
    <header class="lobby-hud"><div class="lobby-title"><small>雾港</small><strong>调查所</strong><b>${s.shop===2?'II':'I'}</b></div><div class="lobby-resources"><span aria-label="冥币 ${s.gold}"><i class="lobby-resource-art resource-gold" aria-hidden="true"></i><b>${s.gold}</b></span><span title="${MATERIAL_NAMES.crystal}" aria-label="${MATERIAL_NAMES.crystal} ${s.materials.crystal}"><i class="lobby-resource-art resource-sample" aria-hidden="true"></i><b>${s.materials.crystal}</b></span><span title="${MATERIAL_NAMES.iron}" aria-label="${MATERIAL_NAMES.iron} ${s.materials.iron}"><i class="lobby-resource-art resource-parts" aria-hidden="true"></i><b>${s.materials.iron}</b></span></div></header>
  </div>`;
}

export class LobbyInteractions {
  private active: HTMLElement | null = null;
  constructor(private screen: HTMLElement) {
    screen.addEventListener('load', () => this.updateImageStatus(), true);
    screen.addEventListener('error', () => this.updateImageStatus(), true);
    screen.addEventListener('click', event => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-lobby-retry]')) return;
      const retry = String(Date.now());
      for (const image of screen.querySelectorAll<HTMLImageElement>('.lobby-scene img')) {
        if (image.complete && !image.naturalWidth) {
          const url = new URL(image.src); url.searchParams.set('retry', retry); image.src = url.href;
        }
      }
      this.updateImageStatus();
    });
    new ResizeObserver(() => this.fit()).observe(screen);
    const target = (event: Event) => event.target instanceof Element ? event.target.closest<HTMLElement>('[data-lobby-zone]') : null;
    screen.addEventListener('pointerover', event => this.highlight(target(event)));
    screen.addEventListener('pointerout', event => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest<HTMLElement>('[data-lobby-zone]') : null;
      if (!next) this.highlight(null);
    });
    screen.addEventListener('focusin', event => this.highlight(target(event)));
    screen.addEventListener('focusout', event => {
      if (!(event.relatedTarget instanceof Element) || !event.relatedTarget.closest('[data-lobby-zone]')) this.highlight(null);
    });
    screen.addEventListener('pointerdown', event => this.highlight(target(event)));
    screen.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') this.highlight(null); });
    screen.addEventListener('pointercancel', () => this.highlight(null));
    window.addEventListener('blur', () => this.highlight(null));
  }
  private updateImageStatus() {
    const status = this.screen.querySelector<HTMLElement>('.lobby-loading');
    if (!status) return;
    const images = [...this.screen.querySelectorAll<HTMLImageElement>('.lobby-scene img')];
    const sources = new Map(images.map(image => [image.src, image]));
    const loaded = [...sources.values()].filter(image => image.complete && image.naturalWidth > 0).length;
    const failed = [...sources.values()].some(image => image.complete && !image.naturalWidth);
    status.hidden = loaded === sources.size;
    status.querySelector('span')!.textContent = failed ? '部分调查所图像未能载入。' : `正在载入调查所图像（${loaded}/${sources.size}）…`;
    status.querySelector<HTMLButtonElement>('button')!.hidden = !failed;
  }
  private highlight(element: HTMLElement | null) {
    this.active?.classList.remove('is-lit');
    this.active = element;
    element?.classList.add('is-lit');
    const scene = this.screen.querySelector<HTMLElement>('.lobby-scene');
    if (!scene) return;
    scene.dataset.focus = element?.dataset.lobbyZone ?? '';
  }
  fit() {
    this.updateImageStatus();
    const stage = this.screen.querySelector<HTMLElement>('.lobby-stage');
    if (!stage) return;
    const scale = Math.min(this.screen.clientWidth / 941, this.screen.clientHeight / 1672);
    stage.style.width = `${941 * scale}px`;
    stage.style.height = `${1672 * scale}px`;
    this.highlight(this.active?.isConnected ? this.active : null);
  }
}
