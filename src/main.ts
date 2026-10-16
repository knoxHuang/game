import { chooseSkill, rerollSkills, train, equip, improveEquipment, unlockCareer, convertLegacy } from './roguelite.ts';
import { isDungeonId } from './content/registry.ts';
import './styles.css';
import './game-ui.css';
import './expedition.css';
import './character-panel.css';
import { AudioManager } from './audio.ts';
import { emptyInput, interact, nearbyInteraction, tick } from './engine.ts';
import type { InputState } from './engine.ts';
import { Renderer } from './renderer.ts';
import type { RenderMode } from './renderer.ts';
import { abandonQuest, acceptQuest, buyUpgrade, deliverQuest, finishRun, freshState, QUESTS, setArmorEquipped, UPGRADES, upgradeStatus, usePotion } from './model.ts';
import type { BossId, CareerId, GameState, QuestId, UpgradeId } from './model.ts';
import { parseSave, SaveStore } from './storage.ts';
import { GameView } from './view.ts';
import type { AppPage } from './view.ts';
import { startRun } from './maps.ts';

const store = new SaveStore();
const audio = new AudioManager();
let state: GameState | null = null;
let page: AppPage = 'home';
let renderer: Renderer | null = null;
let view: GameView;
let input: InputState = emptyInput();
let paused = false;
let busy = false;
let savingError: string | null = null;
let startupError: string | null = null;
let startup = false;
let nextSave = 0;
const keys = new Set<string>();
let pendingImport: GameState | null = null;
let currentOperation: (() => Promise<void>) | null = null;
let nextAutoSave: Promise<void> | null = null;
let autoSaveDirty = false;
let touchMove = { x: 0, y: 0 };
let touchInteract = false;
let keyboardInteract = false;
let interactPulse = false;
let gameMode: RenderMode = 'home';

function resolveMode(): RenderMode {
  if (page === 'run' && state?.run) return 'run';
  if (page === 'shop' || page === 'result') return 'shop';
  return 'home';
}
function writeFailure(error: unknown): string {
  return error instanceof Error ? error.message : '无法写入本机存档。请检查浏览器的存储设置后重试。';
}
function uiOptions() {
  return {
    state: () => state,
    page: () => page,
    paused: () => paused,
    pending: () => busy,
    savingError: () => savingError,
    startupError: () => startupError,
    audio: () => state?.settings ?? { music: true, sound: true, reducedMotion: false },
    renderer: () => renderer,
    action: route,
  };
}
view = new GameView(uiOptions());

function refresh(force = false) {
  if (renderer) {
    const nextMode = resolveMode();
    if (nextMode !== gameMode) { gameMode = nextMode; audio.setMode(page === 'run' && !paused ? 'dungeon' : page === 'shop' ? 'shop' : 'silent'); }
  }
  view.refresh(force);
}
function clearInputs() {
  view.resetControls(); input=emptyInput(); touchMove={x:0,y:0};
  touchInteract=false; keyboardInteract=false; interactPulse=false; keys.clear();
}

async function commit(mutator: (next: GameState) => string | null, after?: (next: GameState) => void) {
  if (busy || !storeOpened) return;
  busy = true; paused = page === 'run'; refresh();
  const next = state ? structuredClone(state) : freshState();
  const validationError = mutator(next);
  if (validationError) { busy = false; if (page === 'run') paused = true; view.toastMessage(validationError); refresh(true); return; }
  const retry = async () => { await commit(mutator, after); };
  try {
    await store.save(next, state&&!state.research&&next.research?state:undefined);
    state = next; busy = false; savingError = null; currentOperation = null;
    after?.(next);
    refresh(true);
  } catch (error) {
    busy = false; savingError = writeFailure(error); paused = true; currentOperation = retry;
    view.refresh(true);
  }
}
let storeOpened = false;

function recordAutosave() {
  if (!state || !storeOpened || busy) return;
  if(nextAutoSave){autoSaveDirty=true;return;}
  const snapshot = structuredClone(state);
  const task=store.save(snapshot);
  nextAutoSave = task.catch(error => {
    savingError = writeFailure(error); paused = true;
    view.toastMessage('存档没有写入，冒险已经暂停。请先重试保存。');
    view.refresh(true);
  }).finally(() => {
    if(nextAutoSave===task||nextAutoSave===tracked)nextAutoSave=null;
  });
  const tracked=nextAutoSave;
  void tracked.then(()=>{if(autoSaveDirty&&!savingError){autoSaveDirty=false;nextAutoSave=null;recordAutosave();}});
}

function replaceProfile(target:GameState,source:GameState){
  for(const key of Object.keys(target))Reflect.deleteProperty(target,key);
  Object.assign(target,source);
}

function startNewGame() {
  if (busy) return;
  void commit(next => { replaceProfile(next,freshState()); return null; }, () => { page = 'shop'; paused = false; view.closePanel(); audio.unlock(); });
}

function setRunPage() {
  if (!state) return;
  page = state.run ? 'run' : state.summary ? 'result' : 'shop';
  paused = page === 'run';
  refresh(true);
  if (page === 'run') view.openPanel('pause');
}

function startAdventure(target?: BossId) {
  if (!state || busy) return;
  if (state.run && target && target !== state.run.boss) { view.toastMessage('请先结束当前调查。'); return; }
  if (state.run) { page = 'run'; paused = false; audio.unlock(); view.closePanel(); refresh(true); return; }
  audio.unlock();
  void commit(next => {
    if (target && isDungeonId(target)) next.selectedBoss = target;
    return startRun(next);
  }, next => {
    page = 'run'; paused = false;
    audio.setMode('dungeon');
    view.closePanel();
    if (next.run?.tutorial) {
      const seen = sessionStorage.getItem('fog-harbor-tutorial-seen');
      if (!seen) { sessionStorage.setItem('fog-harbor-tutorial-seen', '1'); paused = true; view.openPanel('help'); }
    }
  });
}

function finaliseRun(success: boolean) {
  if (!state || !state.run || busy) return;
  autoSaveDirty=false;
  clearInputs();
  void commit(next => { finishRun(next, success); return null; }, () => {
    page = 'result'; paused = false; view.closePanel(); audio.setMode('shop');
  });
}

function chooseQuestId(value?: string): QuestId | null {
  return value === 'K0' || value === 'K1' || value === 'Q11' || value === 'Q12' || value === 'Q13' ? value : null;
}
function route(action: string, value?: string) {
  if (action.startsWith('pulse:')) {
    const kind = action.slice(6);
    if(kind==='potion'){
      if(!state?.run||paused||busy||savingError||startupError||state.run.rogue?.offers.length)return;
      const error=usePotion(state);
      if(error){view.toastMessage(error);return;}
      audio.play('task');view.toastMessage('急救生效，恢复生命。');recordAutosave();refresh(true);return;
    }
    if (kind === 'dodge') input.dodge = true;
    if (kind === 'skill') input.skill = true;
    if (kind === 'interact') interactPulse = true;
    return;
  }
  if (action === 'move') {
    const [x, y] = (value ?? '0,0').split(',').map(Number);
    touchMove = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : { x: 0, y: 0 }; return;
  }
  if (action === 'hold-interact') { touchInteract = value === '1'; return; }
  if (action === 'continue') { if (state) setRunPage(); return; }
  if (action === 'career') {
    if (!state || state.run) { view.toastMessage('调查进行中时不能更换职业。'); return; }
    const id = value as CareerId;
    if (id !== 'investigator' && id !== 'occultist' && id !== 'harpooner') return;
    void commit(next => { if(next.research)return unlockCareer(next,id);next.career = id; return null; }, () => { audio.play('ui'); view.toastMessage('职业已切换。'); view.openPanel('character', 'career'); });
    return;
  }
  if(action==='choose-skill'||action==='reroll-skills'){
    clearInputs();void commit(next=>action==='choose-skill'?chooseSkill(next,value??''):rerollSkills(next),()=>{paused=false;view.closePanel();audio.play('upgrade');audio.setMode(state?.run?.rogue?.offers.length?'silent':'dungeon');});return;
  }
  if(action==='train'||action==='equip-rogue'||action==='improve-equipment'){
    void commit(next=>action==='train'?train(next,value??''):action==='equip-rogue'?equip(next,value??''):improveEquipment(next,value??''),()=>view.toastMessage('整备已保存。'));return;
  }
  if(action==='convert-rogue'&&state&&!state.research){
    view.openConfirmation('转换为割草成长规则？',`旧累计能量 ${state.energy??0} 将等额转换为可消费的研究能量。之后每局从 Lv.1 开始，保留案件、冥币与职业，旧武器和护具转为对应新装备。旧职业能力返还 90 冥币、4 样本和 2 零件。旧等级属性结束生效，转换前档案会单独备份。`,'convert-rogue');return;
  }
  if(action==='confirm:convert-rogue'){void commit(convertLegacy,()=>{view.closePanel();view.openPanel('upgrade');view.toastMessage('成长规则已转换。原档案已备份，可在研究台导出。');});return;}
  if(action==='export-legacy-backup'){void exportSave('legacy-before-roguelite');return;}
  if (action === 'new-game') {
    audio.unlock();
    if (state) view.openConfirmation('重新开始调查？', '当前版本的调查所、物资和案件进度会被新游戏替换。需要保留的话，请先导出新版存档。', 'new-game');
    else startNewGame();
    return;
  }
  if (action === 'confirm:new-game') { startNewGame(); return; }
  if (action === 'confirm:deliver') { const id = chooseQuestId(value); if (id) void commit(next => deliverQuest(next, id), () => { audio.play('task'); view.toastMessage('案件资料已提交，奖励已入档。'); }); return; }
  if (action === 'confirm:abandon') { const id = chooseQuestId(value); if (id) void commit(next => abandonQuest(next, id), () => view.toastMessage('案件已放弃。')); return; }
  if (action === 'confirm:exit') { finaliseRun(true); return; }
  if (action === 'confirm:abandon-run') { finaliseRun(false); return; }
  if (action === 'abandon-run') { view.openConfirmation('放弃本次调查？', state?.run?.rogue?'尚未击败 Boss，本次将按失败结束。本局等级与技能清空，已收集资源保留，案件进度不增加。':'本次未撤离的证据和物资会丢失，案件进度不会增加。', 'abandon-run'); return; }
  if (action === 'confirm:import-save' && pendingImport) {
    const saved = pendingImport; pendingImport = null;
    void commit(next => { replaceProfile(next,saved); if(next.run?.battle?.won&&next.run.player.hp>0)finishRun(next,true); return null; }, next => { page = next.run ? 'run' : next.summary ? 'result' : 'shop'; paused = page === 'run'; view.closePanel(); if(paused)view.openPanel('pause'); });
    return;
  }
  if (action === 'cancel') { pendingImport = null; if (page === 'run') { paused = true; view.openPanel('pause'); } refresh(true); return; }
  if (action === 'panel:pause'||action === 'pause') { if (page === 'run') { clearInputs(); paused = true; audio.setMode('silent'); view.openPanel('pause'); } return; }
  if (action === 'resume') { if (savingError) { view.toastMessage('请先恢复本机存档，再继续冒险。'); return; } clearInputs(); paused = false; audio.unlock(); audio.setMode('dungeon'); view.closePanel(); refresh(true); return; }
  if (action === 'start-run') { startAdventure(value && isDungeonId(value) ? value : undefined); return; }
  if (action === 'return-shop') {
    void commit(next => { next.summary = null; return null; }, () => {
      page = 'shop'; paused = false; view.closePanel(); audio.setMode('shop');
    });
    return;
  }
  if (action === 'retry-run') { page = 'shop'; paused = false; view.closePanel(); refresh(true); startAdventure(); return; }
  if (action === 'retry-save') {
    const retry = currentOperation;
    if (retry) void retry();
    else if (state) { busy = true; const snapshot = structuredClone(state); void store.save(snapshot).then(() => { savingError = null; busy = false; refresh(true); }).catch(error => { savingError = writeFailure(error); busy = false; refresh(true); }); }
    return;
  }
  if (action === 'cancel-save') { view.toastMessage('存档还没有写入。请重试，或导出当前数据。'); return; }
  if (action === 'confirm:reset-save' || action === 'reset-save') {
    if (action === 'reset-save') { view.openConfirmation('重置损坏存档？', '当前版本存档会被新的调查所替换。重置前可以导出原始存档文件。', 'reset-save'); return; }
    startNewGame(); return;
  }
  if (action === 'retry-start') { void openStoredGame(); return; }
  if (action === 'export-save') { void exportSave(); return; }
  if (action === 'export-unsaved') { void exportCurrentMemory(); return; }
  if (action === 'import-save') { view.openPanel('settings', 'import'); document.querySelector<HTMLInputElement>('[data-file=\"import\"]')?.click(); view.refresh(true); return; }
  if (action === 'import-file') {
    try {
      pendingImport = parseSave(value ?? '');
      view.openConfirmation('导入本机存档？', '将切换到 ' + (pendingImport.shop === 1 ? '基础联络站' : '扩建调查所') + '。成长规则：'+(pendingImport.research?'割草构筑':'旧档永久经验')+'。现有新版进度会被替换。', 'import-save');
    } catch (error) { view.toastMessage(error instanceof Error ? error.message : '存档文件无法读取。'); }
    return;
  }
  if (action === 'use-potion') {
    if (!state?.run) return;
    void commit(next => { const error = usePotion(next); return error; }, () => { audio.play('task'); view.toastMessage('恢复药生效，生命恢复 40。'); });
    return;
  }
  if (action === 'buy-potion') {
    void commit(next => { if (next.extraPotion) return '本次已经准备了额外药品。'; if (next.gold < 10) return '冥币不足 10。'; next.gold -= 10; next.extraPotion = true; return null; }, () => view.toastMessage('额外恢复药已备好，下次出发时携带。'));
    return;
  }
  if (action === 'accept') {
    const id = chooseQuestId(value); if (!id) return;
    void commit(next => acceptQuest(next, id), () => { audio.play('task'); view.openPanel('quests'); view.toastMessage('案件已接取。'); });
    return;
  }
  if (action === 'deliver' || action === 'abandon') {
    const id = chooseQuestId(value); if (!id || !state) return;
    view.openConfirmation(action === 'deliver' ? '提交案件？' : '放弃这项案件？', action === 'deliver' ? '将领取 ' + QUESTS[id].gold + ' 冥币与物资奖励。此操作只发放一次。' : '放弃后会失去安全进度与未领取奖励。关键案件之后可以重新接取。', action, id, 'quest-detail');
    return;
  }
  if (action === 'armor-equip' && (value === 'on' || value === 'off')) {
    void commit(next => setArmorEquipped(next, value === 'on'), () => view.refresh(true));
    return;
  }
  if (action === 'upgrade') {
    if (value === 'shop') {
      if (state && !upgradeStatus(state,'shop')) view.openConfirmation('扩建调查所？', '消耗 ' + UPGRADES.shop.gold + ' 冥币、' + UPGRADES.shop.crystal + ' 个异变样本和 ' + UPGRADES.shop.iron + ' 件铜合金零件。顾檀会到访，并开放潮汐巨像案件。', 'upgrade', 'shop');
      else view.toastMessage(state ? upgradeStatus(state,'shop')! : '调查所状态暂不可用。');
      return;
    }
    const id=value as UpgradeId;
    if (state) { const err=upgradeStatus(state,id); if (err) { view.toastMessage(err); return; } }
    view.openConfirmation('确认整备？', UPGRADES[id].title + '：' + UPGRADES[id].description + '。确认后物资会立即消耗。', 'upgrade', id, 'character');
    return;
  }
  if (action === 'confirm:upgrade') {
    if (value === 'shop') void commit(next => buyUpgrade(next,'shop'), () => { audio.play('upgrade'); view.openPanel('upgrade'); view.toastMessage('研究与整备区已开放，顾檀带来了巨像案件。'); });
    else if (value === 'weapon' || value === 'armor' || value === 'skill') void commit(next => buyUpgrade(next,value), () => { audio.play('upgrade'); view.openPanel('character', value === 'skill' ? 'career' : 'equipment'); });
    return;
  }
  if (action === 'depth') { if (value === '2') view.toastMessage('沉没修道院会在后续阶段开放。'); return; }
  if (action === 'setting') {
    const [key,settingValue]=String(value??'').split(':');
    if (key !== 'music' && key !== 'sound' && key !== 'reducedMotion') return;
    void commit(next => { next.settings[key]=settingValue==='true'; return null; }, next => { audio.settings.music=next.settings.music; audio.settings.sound=next.settings.sound; if(!next.settings.music)audio.setMode('silent'); else if(page==='shop')audio.setMode('shop'); view.refresh(true); });
    return;
  }
  if (action === 'interact') {
    if (!state?.run || paused || busy) return;
    const answer=interact(state);
    if (answer.exit) { paused=true; view.openConfirmation('现在撤离？','本次证据与物资会安全带回。未完成的案件目标不会计入。','exit'); return; }
    for (const event of answer.events) { if (event.text) view.toastMessage(event.text); if(event.kind==='loot') audio.play('loot'); }
    if (answer.events.length && state.run) recordAutosave();
    return;
  }
}

async function exportSave(key='profile') {
  try {
    const raw = await store.raw(key);
    if (raw === null) { view.toastMessage(key==='profile'?'当前没有可导出的存档。':'尚未生成成长转换前备份。'); return; }
    const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=key==='profile'?'雾港调查所-本地存档.json':'雾港调查所-成长转换前备份.json';link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    view.toastMessage('存档文件已导出。');
  } catch (error) { view.toastMessage(error instanceof Error?error.message:'无法导出本机存档。'); }
}
function exportCurrentMemory() {
  if (!state) { view.toastMessage('当前没有可导出的进度。'); return; }
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'}));link.download='雾港调查所-当前进度.json';link.click();
  window.setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  view.toastMessage('当前内存进度已导出。游戏仍保持暂停。');
}

async function openStoredGame() {
  if (busy || startup) return;
  startup=true;view.refresh(true);
  try {
    await store.open();storeOpened=true;
    let loaded=await store.load();
    if(loaded?.run?.battle?.won&&loaded.run.player.hp>0){
      const completed=structuredClone(loaded);finishRun(completed,true);
      await store.save(completed);loaded=completed;
    }
    startupError=null;state=loaded;
    if (loaded) page=loaded.run?'run':loaded.summary?'result':'shop';
    else page='home';
    if (loaded?.run) { paused=true;view.openPanel('pause'); }
    else if (loaded?.summary) page='result';
    audio.settings={...(loaded?.settings??{music:true,sound:true,reducedMotion:false})};
    audio.setMode(page==='shop'?'shop':'silent');
  } catch (error) { startupError=error instanceof Error?error.message:'无法读取本机存档。';state=null;page='home'; }
  finally {startup=false;view.refresh(true);}
}

function frame(delta:number) {
  if(!state||page!=='run'||!state.run||paused||busy||savingError||startupError)return;
  if(state.run.rogue?.offers.length)return;
  const keyboardX=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
  const keyboardY=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
  input.move={x:touchMove.x+keyboardX,y:touchMove.y+keyboardY};
  const magnitude=Math.hypot(input.move.x,input.move.y);if(magnitude>1)input.move={x:input.move.x/magnitude,y:input.move.y/magnitude};
  input.interact=touchInteract||keyboardInteract||interactPulse;
  interactPulse=false;
  const target=nearbyInteraction(state);
  if(input.interact&&target?.object?.kind!=='survey'){
    const answer=interact(state);
    input.interact=false;
    if(answer.exit){clearInputs();paused=true;audio.setMode('silent');view.openConfirmation('现在撤离？','本次证据与物资会安全带回。未完成的案件目标不会计入。','exit');return;}
    for(const event of answer.events){if(event.text)view.toastMessage(event.text);if(event.kind==='loot')audio.play('loot');}
    if(answer.events.some(event=>event.kind==='loot'||event.kind==='task'))recordAutosave();
  }
  const oldRoom=state.run.room;
  const oldHp=state.run.player.hp;
  const surface=document.querySelector<HTMLElement>('#scene')!;
  input.viewport={width:surface.clientWidth,height:surface.clientHeight};
  const result=tick(state,input,delta);
  for(const event of result.events){
    if(event.kind==='attack')audio.play('attack');else if(event.kind==='hit')audio.play('hit');else if(event.kind==='hurt')audio.play('hurt');else if(event.kind==='dodge')audio.play('dodge');else if(event.kind==='loot')audio.play('loot');else if(event.kind==='task')audio.play('task');
    if(event.damage!==undefined||event.kind==='ability')renderer?.event(event);
    if(event.text)view.toastMessage(event.text);
  }
  const now=performance.now();
  if(state.run.room!==oldRoom){if(oldRoom>=0)recordAutosave();}
  if(result.critical||state.run.player.hp!==oldHp||now>nextSave){nextSave=now+1000;recordAutosave();}
  if(state.run.rogue?.offers.length){clearInputs();audio.setMode('silent');}
  if(state.run.battle?.won&&state.run.player.hp>0){paused=true;audio.setMode('silent');finaliseRun(true);return;}
  if(result.dead){paused=true;audio.setMode('silent');finaliseRun(false);}
  view.refresh();
}

async function bootstrap() {
  const loading = document.querySelector<HTMLElement>('#startup-loading')!;
  const progress = loading.querySelector<HTMLProgressElement>('progress')!;
  const message = loading.querySelector<HTMLElement>('[data-startup-message]')!;
  const retry = loading.querySelector<HTMLButtonElement>('button')!;
  retry.addEventListener('click', () => {
    retry.hidden = true;
    renderer?.retryAssets();
  });
  await new Promise<void>(resolve => {
    renderer=new Renderer(document.querySelector<HTMLElement>('#scene')!,()=>state,()=>resolveRenderMode(),frame,()=>{
      view.refreshAssets();
      message.textContent = '图像已就绪，正在读取调查记录…';
      resolve();
    },(loaded,total,failed)=>{
      progress.max = total;
      progress.value = loaded;
      message.textContent = failed ? `${failed} 项资源加载失败。请检查网络后重试。` : loaded === total ? '资源已载入，正在整理场景…' : `正在载入图像资源 ${loaded} / ${total}（${Math.floor(loaded / total * 100)}%）`;
      retry.hidden = !failed;
    });
  });
  await openStoredGame();
  loading.remove();
  const heartbeat=window.setInterval(()=>view.refresh(),120);
  window.addEventListener('pagehide',()=>{window.clearInterval(heartbeat);keys.clear();input=emptyInput();if(state&&storeOpened&&!busy)void store.save(structuredClone(state)).catch(()=>{});audio.dispose();renderer?.destroy();},{once:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&page==='run'&&state?.run){clearInputs();paused=true;audio.setMode('silent');view.openPanel('pause');recordAutosave();}
  });
  document.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA'].includes((event.target as HTMLElement)?.tagName??''))return;
    if(event.key==='Escape'){return;}
    if(event.repeat)return;
    keys.add(event.code);
    if(event.code==='KeyE'||event.code==='Enter'){keyboardInteract=true;}
    if(event.code==='ShiftLeft'||event.code==='ShiftRight'){input.dodge=true;}
    if(event.code==='KeyQ'){input.skill=true;}
  });
  document.addEventListener('keyup',event=>{keys.delete(event.code);if(event.code==='KeyE'||event.code==='Enter')keyboardInteract=false;});
}
function resolveRenderMode():RenderMode {
  if(page==='run'&&state?.run)return 'run';
  return page==='shop'||page==='result'?'shop':'home';
}
void bootstrap();
