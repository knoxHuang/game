import { spriteFrame } from './content/visuals.ts';
import Phaser from 'phaser';
import { dungeon, assetKey, enemyDefinition } from './content/registry.ts';
import type { EnemyRole } from './content/schema.ts';
import type { BossId, Direction } from './model.ts';

type Kind = 'player' | 'beast' | 'bug' | 'cultist';
export const bossArtKey = (id: BossId) => `boss-${id}`;
// Four directional illustrations also provide articulated walking poses at runtime.
export const actorKey = (kind: Kind, direction: Direction, frame = -1, _tier = 0) => `${kind}-${direction}${frame < 0 ? '' : `-walk-${frame % 4}`}`;
export const ITEM_KEYS = ['weapon','armor','crystal','iron','radio','medkit','seal','scroll','device','lamp','chest','rock','compass','bag','chart','workbench'] as const;

export const STARTUP_ART = {
  'lobby-cutaway': '/assets/lobby/cutaway-harbor-mobile.webp',
  'lobby-investigator': '/assets/lobby/investigator-cutaway-mobile.webp',
  'lobby-tools': '/assets/lobby/brass-tools-mobile.webp',
  'lobby-lantern': '/assets/lobby/departure-lantern-mobile.webp',
  'ui-panel': '/assets/ui/brass-panel-mobile.webp',
  'battle-hud-frame': '/assets/ui/harbor-mystery-frame-mobile.webp',
  'actor-atlas': '/assets/game/actors-mobile.webp',
  'enemy-atlas': '/assets/game/enemies-readable-mobile.webp',
  'item-atlas': '/assets/game/items-mobile.webp',
  'field-atlas': '/assets/game/field-tools-mobile.webp',
  'boss-atlas': '/assets/game/bosses-mobile.webp',
  'tide-boss-readable': '/assets/dungeons/tide_colossus/boss-readable-mobile.webp',
  'pier-ground': '/assets/game/pier-ground-mobile.webp',
} as const;

export function preloadArt(scene: Phaser.Scene, retry = ''): void {
  for (const [key, src] of Object.entries(STARTUP_ART)) {
    if (!scene.textures.exists(key)) scene.load.image(key, retry ? `${src}?retry=${retry}` : src);
  }
}

// Queue only the selected pack. Other dungeons do not add battle downloads to startup.
export function queueDungeonArt(scene: Phaser.Scene, id: string): string[] {
  const d=dungeon(id), keys:string[]=[];
  const image=(key:string,src:string)=>{keys.push(key);if(!scene.textures.exists(key))scene.load.image(key,src);};
  for(const role of ['beast','bug','cultist','guardian'] as const){
    const sprite=enemyDefinition(id,role).sprite;
    if(sprite.type==='sheet'){
      const key=assetKey(id,role);keys.push(key);
      if(!scene.textures.exists(key))scene.load.spritesheet(key,sprite.src,{frameWidth:sprite.frameSize,frameHeight:sprite.frameSize});
    }
  }
  for(const [slot,src]of Object.entries(d.effects))if(src)image(assetKey(id,`effect-${slot}`),src);
  if(d.arena.background)image(assetKey(id,'background'),d.arena.background);
  for(const slot of ['floorArt','wallArt','obstacleArt'] as const){const art=d.biome[slot];if(art.type==='image')image(assetKey(id,slot),art.src);}
  return keys;
}

// Trim only transparent margins. Preserve the generated illustration and aspect ratio.
function extract(scene: Phaser.Scene, atlas: string, key: string, rect: readonly number[], maxSize = Infinity): void {
  const source = scene.textures.get(atlas).getSourceImage() as HTMLImageElement;
  const [x,y,right,bottom] = rect.map((v,i) => Math.round(v * (i % 2 ? source.height : source.width)));
  const w=right-x,h=bottom-y;
  const scratch = document.createElement('canvas'); scratch.width=w; scratch.height=h;
  const ctx=scratch.getContext('2d')!; ctx.drawImage(source,x,y,w,h,0,0,w,h);
  const data=ctx.getImageData(0,0,w,h).data;
  let l=w,t=h,r=0,b=0;
  for(let py=0;py<h;py++) for(let px=0;px<w;px++) if(data[(py*w+px)*4+3]>32){l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py);}
  if(r<l||b<t) throw new Error(`游戏美术为空：${key}`);
  const scale=Math.min(1,maxSize/Math.max(r-l+1,b-t+1));
  const texture=scene.textures.createCanvas(key,Math.max(1,Math.round((r-l+1)*scale)),Math.max(1,Math.round((b-t+1)*scale)))!;
  texture.context.imageSmoothingEnabled=true;texture.context.imageSmoothingQuality='high';
  texture.context.drawImage(scratch,l,t,r-l+1,b-t+1,0,0,texture.width,texture.height); texture.refresh();
  // Illustrations shrink to fractional screen sizes; terrain keeps the global nearest filter.
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}
// Articulate the existing silhouette: alternate the two lower limbs and shift the
// torso. Keep the source illustrations and alpha; no extra bitmap downloads.
function createWalkPoses(scene: Phaser.Scene, kind: Kind, dir: Direction): void {
  const source=scene.textures.get(actorKey(kind,dir)).getSourceImage() as HTMLCanvasElement;
  const scale=88/Math.max(source.width,source.height),w=Math.round(source.width*scale),h=Math.round(source.height*scale);
  const split=Math.round(h*(kind==='beast'||kind==='bug'?.58:.72)),half=Math.round(w/2);
  for(let frame=-1;frame<4;frame++){
    const stride=frame<0?0:[0,3,0,-3][frame],bob=frame<0?0:frame%2;
    const texture=scene.textures.createCanvas(frame<0?`${kind}-${dir}-rest`:actorKey(kind,dir,frame),w+10,h+10)!;
    const ctx=texture.context;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // Side views use horizontal scissoring; front/back views alternate foot lift.
    for(let side=0;side<2;side++){
      const left=side===0?0:half,width=side===0?half:w-half,step=side===0?stride:-stride;
      ctx.drawImage(source,left/scale,split/scale,width/scale,(h-split)/scale,
        5+left+(dir==='left'||dir==='right'?step:0),5+split+(dir==='left'||dir==='right'?Math.abs(step)*-.3:step),width,h-split);
    }
    ctx.drawImage(source,0,0,source.width,split/scale,5,5-bob,w,split+1);
    outlinePose(texture,kind==='beast'?'#c1d5dd':kind==='bug'?'#d9ad9b':kind==='cultist'?'#beb3dc':'#91a99a');
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

function outlinePose(texture: Phaser.Textures.CanvasTexture, edge: string): void {
  const copy=document.createElement('canvas');copy.width=texture.width;copy.height=texture.height;
  copy.getContext('2d')!.drawImage(texture.canvas,0,0);
  const ctx=texture.context;ctx.clearRect(0,0,texture.width,texture.height);
  for(const [x,y] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(copy,x,y);
  ctx.globalCompositeOperation='source-in';ctx.fillStyle=edge;ctx.fillRect(0,0,texture.width,texture.height);
  ctx.globalCompositeOperation='source-over';ctx.drawImage(copy,0,0);
}
export function createTextures(scene: Phaser.Scene): void {
  const directions: Direction[]=['down','left','right','up'];
  const rows=[0,.27,.49,.715,1];
  // Keep the investigator's original pixels; only enemies use the readability repaint.
  (['player','beast','bug','cultist'] as const).forEach((kind,row)=>directions.forEach((dir,col)=>extract(scene,kind==='player'?'actor-atlas':'enemy-atlas',actorKey(kind,dir),[col/4,rows[row],(col+1)/4,rows[row+1]])));
  (['player','beast','bug','cultist'] as const).forEach(kind=>directions.forEach(dir=>createWalkPoses(scene,kind,dir)));
  ITEM_KEYS.forEach((key,i)=>extract(scene,'item-atlas',key,[i%4/4,Math.floor(i/4)/4,(i%4+1)/4,(Math.floor(i/4)+1)/4]));
  ([['harpoon',[0,0,.59,.5]],['ritual',[.59,0,1,.5]],['field-book',[0,.5,.5,1]],['building',[.5,.5,1,1]]] as const).forEach(([key,rect])=>extract(scene,'field-atlas',key,rect));
  extract(scene,'item-atlas','sample',[.5,0,.75,.25]);
  extract(scene,'item-atlas','instrument',[0,.5,.25,.75]);
  extract(scene,'tide-boss-readable',bossArtKey('tide_colossus'),[0,0,1,1],256);
  extract(scene,'boss-atlas',bossArtKey('many_eyed_priest'),[.59,0,1,.5]);
  extract(scene,'boss-atlas',bossArtKey('cthulhu_avatar'),[0,.5,.59,1]);
  extract(scene,'enemy-atlas','beast',[0,.27,.25,.49]);
}

export function enemyArt(id: string, role: EnemyRole, dir: Direction, mode: string, time: number): { key: string; frame?: number } {
  const sprite=enemyDefinition(id,role).sprite;
  if(sprite.type==='sheet') return spriteFrame(sprite,id,role,mode,time);
  return {key: role==='guardian' ? sprite.key : actorKey(role,dir)};
}
