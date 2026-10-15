import { sampleMotion } from './actor-motion.ts';
import type { MotionSample } from './actor-motion.ts';
import { battleWorld } from './battle.ts';
import { battleCamera } from './battle-camera.ts';
import { dungeon, enemyDefinition, assetKey, bossAttack } from './content/registry.ts';
import { colorNumber } from './content/schema.ts';
import Phaser from 'phaser';
import { actorKey, createTextures, preloadArt, enemyArt, queueDungeonArt } from './art.ts';
import { BOSSES, careerStats, QUESTS } from './model.ts';
import type { Direction, GameState, Vec } from './model.ts';
import { direction } from './geometry.ts';
import { enemyRadius, nearbyInteraction, targetableEnemy } from './engine.ts';
import type { GameEvent } from './engine.ts';

export type RenderMode = 'home' | 'shop' | 'run' | 'result';
const facing = (a: number): Direction => Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? Math.cos(a) > 0 ? 'right' : 'left' : Math.sin(a) > 0 ? 'down' : 'up';
const COLORS = { ink: 0x17232c, gold: 0xd8b66a, teal: 0x54c7bc, danger: 0xd16b62, arcane: 0xb66bd3, muted: 0x929b9c, stone: 0x2c363c };

class WorldScene extends Phaser.Scene {
  private staticLayer!: Phaser.GameObjects.Container;
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private motion = new Map<string, MotionSample>();
  private shadows!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private bossTitle!: Phaser.GameObjects.Text;
  private bossLocator!: Phaser.GameObjects.Text;
  private backgroundKey = '';
  private tile = 30;
  private loadedDungeons = new Set<string>();
  private loadingDungeon: string | null = null;
  private failedDungeon: string | null = null;
  private ox = 0;
  private oy = 0;
  constructor(private read: () => GameState | null, private mode: () => RenderMode, private frame: (dt: number) => void, private ready: () => void) { super('world'); }
  preload() { this.load.image('lobby-cutaway', '/assets/lobby/cutaway-harbor.png'); preloadArt(this); }
  create() {
    createTextures(this);
    this.staticLayer = this.add.container(0, 0);
    this.shadows = this.add.graphics().setDepth(10);
    this.effects = this.add.graphics().setDepth(100);
    this.label = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#d8b66a', stroke: '#17232c', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(105);
    this.bossTitle = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#d7eee0', stroke: '#17232c', strokeThickness: 3, fontStyle: 'bold' }).setOrigin(0, 0).setDepth(108).setVisible(false);
    this.bossLocator = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#f0d395', stroke: '#102025', strokeThickness: 4 }).setOrigin(.5).setDepth(120).setVisible(false);
    this.ready();
  }
  private dungeonArtReady(id: string): boolean {
    if(this.loadedDungeons.has(id))return true;
    if(this.failedDungeon===id){this.label.setPosition(this.scale.width/2,this.scale.height/2).setText('副本美术加载失败，请刷新后重试。').setVisible(true);return false;}
    if(this.loadingDungeon)return false;
    const keys=queueDungeonArt(this,id);
    if(keys.every(key=>this.textures.exists(key))){this.loadedDungeons.add(id);return true;}
    this.loadingDungeon=id;
    this.label.setPosition(this.scale.width/2,this.scale.height/2).setText('正在载入调查区域…').setVisible(true);
    this.load.once('complete',()=>{
      this.loadingDungeon=null;
      if(keys.every(key=>this.textures.exists(key)))this.loadedDungeons.add(id);else this.failedDungeon=id;
      this.label.setVisible(false);
    });
    this.load.start();return false;
  }
  update(_time: number, delta: number) {
    const before=this.read();
    if(this.mode()==='run' && before?.run && !this.dungeonArtReady(before.run.boss))return;
    this.frame(delta / 1000);
    const s = this.read();
    if (!s || !this.staticLayer) return;
    const w = this.scale.width, h = this.scale.height;
    const mode = this.mode();
    if (mode !== 'run' || !s.run) this.paintShop(s, w, h, _time / 1000);
    else this.paintDungeon(s, w, h);
  }
  private image(id: string, key: string, x: number, y: number, size: number, alpha = 1, frameIndex?: number): Phaser.GameObjects.Image {
    let actor = this.actors.get(id);
    if (!actor) { actor = this.add.image(x, y, key).setDepth(20); this.actors.set(id, actor); }
    actor.setTexture(key,frameIndex);
    const frame = actor.frame, scale = size / Math.max(frame.realWidth, frame.realHeight);
    actor.setPosition(x, y).setDisplaySize(frame.realWidth * scale, frame.realHeight * scale).setAlpha(alpha).setVisible(true).setDepth(20+y*.001);
    return actor;
  }
  private resetBackground(key: string): boolean {
    if (this.backgroundKey === key) return false;
    this.backgroundKey = key;
    this.staticLayer.removeAll(true);
    for (const actor of this.actors.values()) actor.destroy();
    this.actors.clear();
    this.motion.clear();
    return true;
  }
  private tileImage(key: string, x: number, y: number, size: number, tint?: number) {
    const image = this.add.image(x, y, key).setDisplaySize(size, size);
    if (tint !== undefined) image.setTint(tint);
    this.staticLayer.add(image);
    return image;
  }
  private paintShop(_s: GameState, w: number, h: number, _time: number) {
    if (this.resetBackground(`shop-cutaway-${w}-${h}`)) {
      const scale = Math.min(w / 941, h / 1672);
      const art = this.add.image(w / 2, h / 2, 'lobby-cutaway').setDisplaySize(941 * scale, 1672 * scale);
      this.staticLayer.add(art); this.staticLayer.setPosition(0, 0);
    }
    for (const actor of this.actors.values()) actor.setVisible(false);
    this.shadows.clear(); this.effects.clear(); this.label.setVisible(false); this.bossTitle.setVisible(false); this.bossLocator.setVisible(false);
  }
  private point(v: Vec) { return { x: this.ox + (v.x - 0.5) * this.tile, y: this.oy + (v.y - 0.5) * this.tile }; }
  private paintDungeon(s: GameState, w: number, h: number) {
    const run = s.run!, room = battleWorld(run), p = run.player, definition=dungeon(run.boss);
    const boss = room.enemies.find(e => e.kind === 'guardian' && e.hp > 0);
    const camera=battleCamera(w,h,p.pos,definition.arena,!!boss);
    this.tile=camera.tile;this.ox=camera.ox;this.oy=camera.oy;
    if (this.resetBackground(`run-${run.id}-${w}-${h}-${this.tile}`)) {
      const arena=definition.arena,fullWidth=arena.width*this.tile,fullHeight=arena.height*this.tile;
      const floor=this.add.graphics();floor.fillStyle(colorNumber(definition.biome.wash)).fillRect(0,0,fullWidth,fullHeight);this.staticLayer.add(floor);
      const background=arena.background?assetKey(run.boss,'background'):definition.biome.floorArt.type==='image'?assetKey(run.boss,'floorArt'):'pier-ground';
      const ground=this.add.image(fullWidth/2,fullHeight/2,background).setDisplaySize(fullWidth,fullHeight);this.staticLayer.add(ground);
      ground.setTint(0x829297); // Quiet the wet timber highlights beneath combat silhouettes.
      for(const obstacle of arena.obstacles)this.tileImage(definition.biome.obstacleArt.type==='image'?assetKey(run.boss,'obstacleArt'):'rock',(obstacle.x-.5)*this.tile,(obstacle.y-.5)*this.tile,this.tile*1.15,0x8c9c9d);
      if(definition.biome.wallArt.type==='image'){
        for(let y=1;y<=arena.height;y++)for(const x of [1,arena.width])this.tileImage(assetKey(run.boss,'wallArt'),(x-.5)*this.tile,(y-.5)*this.tile,this.tile,colorNumber(definition.biome.wall));
        for(let x=2;x<arena.width;x++)for(const y of [1,arena.height])this.tileImage(assetKey(run.boss,'wallArt'),(x-.5)*this.tile,(y-.5)*this.tile,this.tile,colorNumber(definition.biome.wall));
      }
    }
    this.staticLayer.setPosition(this.ox, this.oy);
    for (const a of this.actors.values()) a.setVisible(false);
    this.effects.clear();this.shadows.clear();
    const reduced=s.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleIds=new Set(['player',...room.enemies.map(e=>e.id)]);
    for(const id of this.motion.keys())if(!visibleIds.has(id))this.motion.delete(id);
    const motionFor=(id:string,pos:Vec)=>{
      const next=sampleMotion(this.motion.get(id),pos,reduced);this.motion.set(id,next.sample);return next;
    };
    for(const warning of run.battle?.pending??[]){
      const v=this.point(warning.pos),r=this.tile*(warning.kind==='guardian'?1.3:.55);
      this.effects.lineStyle(2,COLORS.danger,.85).strokeCircle(v.x,v.y,r);
      this.effects.fillStyle(COLORS.danger,.1).fillCircle(v.x,v.y,r);
      this.effects.lineBetween(v.x,v.y-r*.4,v.x,v.y+r*.1);
      this.effects.fillStyle(COLORS.danger).fillCircle(v.x,v.y+r*.4,1.5);
    }
    for (const h of room.hazards) {
      if (h.phase > 1.2) continue;
      const v = this.point(h.pos), r = (h.radius ?? (h.boss ? .7 : h.magic ? .85 : .5)) * this.tile;
      if(definition.effects.ground) this.image(h.id,assetKey(run.boss,'effect-ground'),v.x,v.y,r*2.5,.6).setDepth(95);
      const color = h.magic ? COLORS.arcane : h.boss ? COLORS.danger : 0x66c9bc;
      this.effects.fillStyle(h.phase >= 0.8 ? (h.magic ? 0xe1aaff : 0xffd28c) : color, h.phase >= 0.8 ? 0.72 : 0.15 + Math.max(0, h.phase) * 0.32).fillCircle(v.x, v.y, r);
      this.effects.lineStyle(2, color).strokeCircle(v.x, v.y, r);
      if (h.magic) { this.effects.lineStyle(1, 0xe0b4ec, 0.9).strokeCircle(v.x, v.y, r * 0.58); this.effects.lineBetween(v.x - r * 0.3, v.y, v.x + r * 0.3, v.y); }
    }
    for (const o of room.objects.filter(o => !o.used)) {
      const v = this.point(o.pos);
      const key = o.kind === 'exit' ? 'device' : o.kind === 'chest' ? 'chest' : o.kind === 'survey' ? 'device' : o.kind === 'seal' ? 'sample' : o.quest === 'K0' ? 'radio' : o.quest === 'Q11' ? 'sample' : 'lamp';
      const sprite=this.image(o.id, key, v.x, v.y, this.tile * (o.kind === 'exit' ? 0.62 : 0.9));
      if(o.kind==='exit')sprite.setDepth(v.y-70);
      if (o.quest || o.kind === 'survey') this.effects.lineStyle(1.5, COLORS.gold).strokeCircle(v.x, v.y - this.tile * 0.7, 3);
    }
    for (const drop of room.drops.filter(d => !d.taken)) {
      const v = this.point(drop.pos), icon = drop.quest ? QUESTS[drop.quest].icon : drop.material ?? 'sample';
      this.image(drop.id, icon, v.x, v.y, this.tile * (drop.quest ? .42 : .3), .9).setDepth(15);
      if (drop.quest) this.shadows.lineStyle(1.5, COLORS.gold,.8).lineBetween(v.x-3,v.y+this.tile*.25,v.x+3,v.y+this.tile*.25);
    }
    for (const b of room.projectiles) {
      const v = this.point(b.pos), color = b.owner === 'player' ? (s.career === 'occultist' ? COLORS.teal : COLORS.gold) : COLORS.danger;
      if(b.owner==='enemy'&&definition.effects.projectile) this.image(b.id,assetKey(run.boss,'effect-projectile'),v.x,v.y,this.tile*.6).setRotation(b.angle+Math.PI/2).setDepth(101);
      else this.effects.fillStyle(color).fillCircle(v.x, v.y, this.tile * (b.owner === 'player' ? 0.14 : 0.16));
      if (b.owner === 'player') this.effects.lineStyle(2, color, 0.6).lineBetween(v.x, v.y, v.x - Math.cos(b.angle) * this.tile * 0.3, v.y - Math.sin(b.angle) * this.tile * 0.3);
    }
    for (const e of room.enemies.filter(e => e.hp > 0 || e.timer < .45)) {
      const v = this.point(e.pos);
      const motion=motionFor(e.id,e.pos);
      const art = enemyArt(run.boss,e.kind,facing(e.mode === 'windup' || e.mode === 'attack' ? e.angle : direction(e.pos,p.pos)),e.hp===0?'defeat':e.flash>0?'hurt':e.mode,e.mode==='idle'||e.mode==='chase'?(reduced?0:run.time):e.timer);
      const actor=enemyDefinition(run.boss,e.kind), sprite=actor.sprite;
      const key=sprite.type==='builtin'&&e.kind!=='guardian'?actorKey(e.kind,facing(e.mode==='windup'||e.mode==='attack'?e.angle:direction(e.pos,p.pos)),motion.frame)+(motion.frame<0?'-rest':''):art.key;
      this.shadows.fillStyle(0x030c10,.6).fillEllipse(v.x,v.y+this.tile*.4,this.tile*actor.size*.85,this.tile*.32);
      const image = this.image(e.id,key,v.x,v.y-this.tile*.12,this.tile*actor.size*(e.kind==='guardian'?1:1.25),e.hp===0?Math.max(0,1-e.timer/.45):1,art.frame);
      image.setRotation(0);
      if(sprite.type==='builtin'&&!reduced){
        if(e.mode==='windup')image.setScale(image.scaleX*1.08,image.scaleY*.88);
        else if(e.mode==='attack'){image.x+=Math.cos(e.angle)*this.tile*.15;image.y+=Math.sin(e.angle)*this.tile*.15;}
        else if(!motion.moving&&e.hp>0)image.setScale(image.scaleX,image.scaleY*(1+Math.sin(run.time*3+e.pos.x)*.018));
      }
      image.setOrigin(sprite.type==='sheet'?sprite.anchor.x:.5,sprite.type==='sheet'?sprite.anchor.y:.5);
      if(e.hp===0) continue;
      const phaseTwo = e.kind === 'guardian' && e.hp <= definition.boss.hp * definition.boss.phaseAt;
      const bossTint = colorNumber(definition.boss.tint);
      image.setTint(e.flash > 0 ? 0xffffff : e.mode === 'windup' ? 0xffaa7b : phaseTwo ? 0xb6a0c5 : e.kind === 'guardian' ? bossTint : 0xffffff);
      if (e.kind === 'guardian' && e.mode === 'recover') {
        this.effects.fillStyle(0x87f4d0, 0.2 + (reduced?0:Math.sin(run.time * 10) * 0.05)).fillCircle(v.x, v.y + this.tile * 0.42, this.tile * 0.42);
        this.effects.lineStyle(3, 0xb8ffe0, 0.95).strokeCircle(v.x, v.y + this.tile * 0.42, this.tile * 0.29);
        this.effects.lineStyle(2, 0xffe48a, 0.95).lineBetween(v.x - this.tile * 0.15, v.y + this.tile * 0.42, v.x + this.tile * 0.15, v.y + this.tile * 0.42);
      }
      if (e.mode === 'windup' && !(e.kind === 'guardian' && bossAttack(run.boss,e.turn).type==='ground')) {
        const length = this.tile * (e.kind === 'guardian' ? 4 : e.kind === 'bug' ? 3 : 1.5);
        this.effects.lineStyle(e.kind === 'guardian' ? this.tile * 1.4 : 3, COLORS.danger, 0.2).lineBetween(v.x, v.y, v.x + Math.cos(e.angle) * length, v.y + Math.sin(e.angle) * length);
        this.effects.lineStyle(2, COLORS.danger, 0.95).lineBetween(v.x, v.y, v.x + Math.cos(e.angle) * length, v.y + Math.sin(e.angle) * length);
      }
      const enemyMaxHp = enemyDefinition(run.boss,e.kind).hp;
      if (e.hp < enemyMaxHp && e.kind !== 'guardian') {
        const maxHp = enemyMaxHp, width = this.tile * 1.25, height = Math.max(3, Math.min(5, this.tile * 0.18));
        const left = v.x - width / 2, top = v.y - this.tile * 0.82;
        this.effects.fillStyle(COLORS.ink, 0.95).fillRect(left, top, width, height);
        this.effects.fillStyle(COLORS.danger).fillRect(left + 1, top + 1, (width - 2) * e.hp / maxHp, height - 2);
      }
    }
    const selected = targetableEnemy(s, careerStats(s).range);
    if (selected) {
      const targetPos = this.point(selected.pos);
      this.effects.lineStyle(1.5, COLORS.teal, 0.95).strokeCircle(targetPos.x, targetPos.y + this.tile * 0.22, this.tile * (enemyRadius(selected,run.boss) + 0.12));
    }
    const v = this.point(p.pos), motion=motionFor('player',p.pos);
    this.shadows.fillStyle(0x020b0f,.7).fillEllipse(v.x,v.y+this.tile*.4,this.tile*.9,this.tile*.3);
    this.shadows.lineStyle(1.5,COLORS.teal,.85).strokeEllipse(v.x,v.y+this.tile*.4,this.tile*.85,this.tile*.3);
    const hero = this.image('player', actorKey('player', facing(p.action === 'attack' || p.action === 'skill' ? p.angle : p.facing), motion.frame)+(motion.frame<0?'-rest':''), v.x, v.y - this.tile * .15, this.tile * 1.5, p.invincible > 0 ? .65 : 1);
    hero.setRotation(!reduced&&p.action==='dodge'?.2:0);
    hero.setTint(p.action === 'hurt' ? 0xff9988 : s.career === 'occultist' ? 0xd4edda : 0xffffff);
    if (!reduced) {
      if(!motion.moving)hero.setScale(hero.scaleX,hero.scaleY*(1+Math.sin(run.time*3)*.012));
      if(p.action==='attack'&&p.timer<.08){hero.x-=Math.cos(p.angle)*2;hero.y-=Math.sin(p.angle)*2;}
    }
    if (s.career === 'occultist') this.effects.lineStyle(1, COLORS.teal,.65).strokeCircle(v.x,v.y+this.tile*.3,this.tile*.34);
    if (p.action === 'dodge') this.effects.lineStyle(2, COLORS.teal, 0.8).strokeCircle(v.x, v.y, this.tile * 0.5);
    if ((p.action === 'attack' || p.action === 'skill') && p.timer < 0.12) {
      const color = s.career === 'occultist' ? COLORS.teal : COLORS.gold;
      this.effects.fillStyle(color, 0.9).fillCircle(v.x + Math.cos(p.angle) * this.tile * 0.42, v.y + Math.sin(p.angle) * this.tile * 0.42, this.tile * (p.action === 'skill' ? 0.18 : 0.12));
      this.effects.lineStyle(2, color, 0.85).lineBetween(v.x, v.y, v.x + Math.cos(p.angle) * this.tile * 0.5, v.y + Math.sin(p.angle) * this.tile * 0.5);
    }
    const target = nearbyInteraction(s);
    this.label.setVisible(!!target);
    if (target) this.label.setPosition(v.x, v.y - this.tile * 0.75).setText(target.locked ?? target.label);
    if (run.survey > 0) this.effects.lineStyle(3, COLORS.teal).strokeCircle(v.x, v.y, this.tile * 0.65);
    if (boss) {
      const location=this.point(boss.pos),north=location.y<camera.top,south=location.y>camera.top+camera.fieldHeight,west=location.x<0,east=location.x>w;
      this.bossLocator.setVisible(north||south||west||east);
      if(north||south||west||east)this.bossLocator.setPosition(w/2,north?camera.top+16:south?camera.top+camera.fieldHeight-16:camera.top+camera.fieldHeight/2).setText(`${north?'↑':south?'↓':west?'←':'→'} ${BOSSES[run.boss].name}`);
      this.effects.fillStyle(COLORS.ink, 0.98).fillRoundedRect(8, 66, w - 16, 32, 3);
      this.effects.fillStyle(COLORS.stone).fillRoundedRect(12, 89, w - 24, 7, 3);
      this.effects.fillStyle(boss.mode === 'recover' ? COLORS.teal : boss.hp <= definition.boss.hp * definition.boss.phaseAt ? 0xa76fba : COLORS.danger).fillRoundedRect(12, 89, (w - 24) * boss.hp / definition.boss.hp, 7, 3);
      const threat = boss.mode === 'recover' ? '弱点暴露 · 输出窗口' : boss.hp <= definition.boss.hp * definition.boss.phaseAt ? '第二阶段 · 危险增强' : '巨型威胁 · 注意预警';
      this.bossTitle.setPosition(w / 2, 68).setOrigin(0.5, 0).setText(`${BOSSES[run.boss].name} · ${threat}`).setVisible(true);
    } else {
      this.bossTitle.setVisible(false);
      this.bossLocator.setVisible(false);
    }
  }
  showEvent(event: GameEvent) {
    if (!event.pos || event.damage === undefined) return;
    const v = this.point(event.pos);
    const text = event.text ? `${event.damage} · ${event.text}` : String(event.damage);
    const t = this.add.text(v.x, v.y - this.tile * 0.8, text, { fontSize: '16px', color: event.text ? '#9ffff0' : '#ffe9b0', fontFamily: 'sans-serif', stroke: '#17232c', strokeThickness: 3 }).setOrigin(0.5).setDepth(150);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 450, onComplete: () => t.destroy() });
  }
}
export class Renderer {
  private game: Phaser.Game;
  private scene: WorldScene;
  private observer: ResizeObserver;
  private icons = new Map<string,string>();
  constructor(element: HTMLElement, state: () => GameState | null, mode: () => RenderMode, frame: (dt: number) => void, ready: () => void) {
    this.scene = new WorldScene(state, mode, frame, ready);
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent: element, width: element.clientWidth || 360, height: element.clientHeight || 500, backgroundColor: '#17232c', pixelArt: true, antialias: false, scene: this.scene, input: { keyboard: false, mouse: false, touch: false }, banner: false, audio: { noAudio: true } });
    this.observer = new ResizeObserver(() => { if (element.clientWidth && element.clientHeight) this.game.scale.resize(element.clientWidth, element.clientHeight); });
    this.observer.observe(element);
  }
  icon(key: string): string {
    if(this.icons.has(key))return this.icons.get(key)!;
    if(!this.game.textures.exists(key))return '';
    const texture = this.game.textures.get(key);
    const source = texture?.getSourceImage();
    const url = source instanceof HTMLCanvasElement ? source.toDataURL() : '';
    if(url)this.icons.set(key,url);
    return url;
  }
  event(event: GameEvent) { this.scene.showEvent(event); }
  destroy() { this.observer.disconnect(); this.game.destroy(true); }
}
