import type { Vec } from './model.ts';
import { distance } from './geometry.ts';

export type MotionSample = { pos: Vec; travel: number };

// Advance the gait by distance travelled, including movement while firing.
// Camera movement, pause and standing still must never advance the feet.
export function sampleMotion(previous: MotionSample | undefined, pos: Vec, reduced: boolean) {
  const step = previous ? distance(previous.pos, pos) : 0;
  const moving = step > .0001 && step < 1;
  const travel = moving ? (previous?.travel ?? 0) + step : 0;
  return { sample: { pos: { ...pos }, travel }, moving, frame: reduced || !moving ? -1 : Math.floor(travel / .19) % 4 };
}
