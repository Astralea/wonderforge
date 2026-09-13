import design from '../../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
import type { EiffelOnwardWorker } from './eiffelLongLoadOnward';
import type { RigidVec3 as V } from './eiffelRigid';

const START = 198, END = 206, STEPS = 8;
const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const F = design.floorY;

function handleAt(seconds: number): { center: V; sine: number; cosine: number } {
  const angle = Math.PI / 2 * (1 - smooth((seconds - START) / (END - START)));
  const sine = Math.sin(angle), cosine = Math.cos(angle);
  const [x, y, z] = design.hatch.handleCenter;
  const pivot = design.hatch.pivot;
  return { center: [pivot[0]! + x!, pivot[1]! + y! * cosine - z! * sine,
    pivot[2]! + y! * sine + z! * cosine], sine, cosine };
}

/** One hand on each side of the real rotating handle. Backward steps are
 * separate rigid-foot swings: the other sole stays fixed on the west deck.
 * Both endpoint poses persist, so seeking or changing phase cannot reset him.
 */
export function sampleEiffelOnwardHatchWorker(rawSeconds: number): EiffelOnwardWorker {
  if (!Number.isFinite(rawSeconds)) throw Error('Hatch worker time must be finite');
  const seconds = clamp(rawSeconds, 0, design.duration);
  const { center, sine, cosine } = handleAt(seconds);
  const hands: [V, V] = [-1, 1].map(sign => [center[0], center[1] - sine * sign * .10,
    center[2] + cosine * sign * .10] as V) as [V, V];
  const stepTime = clamp(seconds - START, 0, END - START);
  const step = Math.min(STEPS - 1, Math.floor(stepTime));
  const fraction = clamp(stepTime - step);
  const feet: [V, V] = [0, 1].map(index => {
    const lateral = index === 0 ? -.12 : .12;
    let last = handleAt(START).center[2] + lateral;
    for (let previous = index; previous < step; previous += 2)
      last = handleAt(START + previous + 1).center[2] + lateral;
    if (index !== step % 2) return [design.hatch.workerX, F, last] as V;
    const next = handleAt(START + step + 1).center[2] + lateral;
    const lift = .055 * Math.sin(Math.PI * fraction) ** 2;
    return [design.hatch.workerX, F + lift, last + (next - last) * smooth(fraction)] as V;
  }) as [V, V];
  return {
    id: 'long-load-hatch-worker',
    job: seconds < START ? 'holding-open-hatch' : seconds < END ? 'closing-hatch' : 'holding-closed-hatch',
    feet, hands, bodyX: -20.48,
    contacts: hands.map(point => ({ kind: 'hatch-handle' as const, point, active: true })),
  };
}
