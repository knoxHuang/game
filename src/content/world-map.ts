// World geography is independent from dungeon list order and from save IDs.
export const WORLD_SIZE = { width: 724, height: 2172 } as const;
export const WORLD_REGIONS = [
  { id: 'nearshore', name: '近岸群岛', chapter: 'Ⅰ', x: 68, y: 73, charted: true, description: '雾港、沉船与沿岸岛链。这里是调查的起点，更多近岸异常将在后续调查中揭晓。', gate: '' },
  { id: 'outer_ruins', name: '外海遗迹', chapter: 'Ⅱ', x: 30, y: 48, charted: true, description: '断钟与石柱沉入外海，仪式的痕迹散落在不同岛屿。', gate: '' },
  { id: 'abyss', name: '沉没深渊', chapter: 'Ⅲ', x: 65, y: 30, charted: false, description: '此海域尚未探明。先保留海雾与深海地形，待首领及其污染规则确定后，再制作独有环境。', gate: '深渊航线尚未勘明' },
  { id: 'forbidden', name: '禁忌海域', chapter: '终章', x: 50, y: 9, charted: false, description: '绿渍巨石与方向难辨的巨大门扉藏在远海迷雾中。这是后期化身调查目标，不是第三关。', gate: '需完成深渊主线' },
] as const;
export type WorldRegionId = typeof WORLD_REGIONS[number]['id'];
export function worldRegion(id: string) { return WORLD_REGIONS.find(r => r.id === id); }
export function worldPoint(x: number, y: number) { return { x: x / 100 * WORLD_SIZE.width, y: y / 100 * WORLD_SIZE.height }; }
