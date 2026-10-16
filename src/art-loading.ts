import { DUNGEONS, dungeon, assetKey, enemyDefinition } from './content/registry.ts';

export type ArtLoader = {
  textures: { exists(key: string): boolean };
  load: {
    image(key: string, src: string): unknown;
    spritesheet(key: string, src: string, config: { frameWidth: number; frameHeight: number }): unknown;
  };
};

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
  'world-chart': '/assets/map/voyage-boss-biomes-v3-mobile.webp',
  'character-body': '/assets/character/linjin-base-mobile.webp',
  'character-coat': '/assets/character/raincoat-layer-mobile.webp',
  'character-grip': '/assets/character/raincoat-grip-mobile.webp',
  'equipment-revolver': '/assets/equipment/brass-revolver-icon-mobile.webp',
  'equipment-coat-icon': '/assets/equipment/diving-coat-icon-mobile.webp',
  'equipment-coat-layer': '/assets/equipment/diving-coat-layer-mobile.webp',
} as const;

export function preloadArt(scene: ArtLoader, retry = ''): string[] {
  const images: Record<string, string> = { ...STARTUP_ART };
  for (const pack of DUNGEONS) {
    images[assetKey(pack.id, 'portrait')] = pack.art.portrait;
    if (pack.art.card) images[assetKey(pack.id, 'card')] = pack.art.card;
  }
  for (const [key, src] of Object.entries(images)) {
    if (!scene.textures.exists(key)) scene.load.image(key, retry ? `${src}?retry=${retry}` : src);
  }
  const keys = Object.keys(images);
  for (const pack of DUNGEONS) keys.push(...queueDungeonArt(scene, pack.id, retry));
  return [...new Set(keys)];
}

// Reuse the same dungeon keys during startup and battle, including configured sheets.
export function queueDungeonArt(scene: ArtLoader, id: string, retry = ''): string[] {
  const d=dungeon(id), keys:string[]=[];
  const url=(src:string)=>retry?`${src}?retry=${retry}`:src;
  const image=(key:string,src:string)=>{keys.push(key);if(!scene.textures.exists(key))scene.load.image(key,url(src));};
  for(const role of ['beast','bug','cultist','guardian'] as const){
    const sprite=enemyDefinition(id,role).sprite;
    if(sprite.type==='sheet'){
      const key=assetKey(id,role);keys.push(key);
      if(!scene.textures.exists(key))scene.load.spritesheet(key,url(sprite.src),{frameWidth:sprite.frameSize,frameHeight:sprite.frameSize});
    }
  }
  for(const [slot,src]of Object.entries(d.effects))if(src)image(assetKey(id,`effect-${slot}`),src);
  if(d.arena.background)image(assetKey(id,'background'),d.arena.background);
  for(const slot of ['floorArt','wallArt','obstacleArt'] as const){const art=d.biome[slot];if(art.type==='image')image(assetKey(id,slot),art.src);}
  return keys;
}

