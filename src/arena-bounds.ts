export type ArenaBounds = { minX:number; maxX:number; minY:number; maxY:number };

/** World coordinates of the playable floor, excluding painted scenery. */
export function arenaBounds(arena:{width:number;height:number;bounds?:ArenaBounds}):ArenaBounds {
  return arena.bounds??{minX:1.5,maxX:arena.width-1.5,minY:1.5,maxY:arena.height-1.5};
}
