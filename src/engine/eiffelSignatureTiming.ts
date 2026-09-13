import type { EiffelKitPart } from '../data/eiffelKitTypes';
import { eiffelCinematicShotAt } from './eiffelCamera';
import { transformRigidPoint, type RigidPose, type RigidVec3 } from './eiffelRigid';
import type { EiffelTiming } from './eiffelConstructionTiming';

/** Isolated proposal allocator. Not wired into production: retiming invalidates route caches. */
export const EIFFEL_SIGNATURE_WINDOWS = [
  { id: 'lower-pylon', low: 1, high: 9, start: .09, end: .13 },
  { id: 'first-floor', low: 23, high: 23, start: .265, end: .305 },
  { id: 'shaft', low: 35, high: 52, start: .54, end: .58 },
  { id: 'summit', low: 55, high: 63, start: .78, end: .82 },
] as const;
const BANDS = [
  [0, .99, .035, .065], [1, 9, .065, .15466666666666667],
  [10, 23, .15466666666666667, .3152], [24, 34, .3152, .4298666666666666],
  [35, 54, .4298666666666666, .6477333333333334], [55, 63, .6477333333333334, .9],
] as const;
export interface EiffelSignatureInput {
  readonly part: EiffelKitPart;
  readonly upperClearance?: 'sampled-clear' | 'unresolved';
  readonly previewPoses?: readonly { readonly fraction: number; readonly pose: RigidPose }[];
}
export interface EiffelProjectedPayload {
  readonly longPixels: number;
  readonly effectiveWidthPixels: number;
  readonly areaPixels: number;
  readonly entirelyInFrame: boolean;
  readonly points: readonly (readonly [number, number])[];
}
export interface EiffelSignatureChoice {
  readonly id: typeof EIFFEL_SIGNATURE_WINDOWS[number]['id'];
  readonly partId: string;
  readonly stage: number;
  readonly start: number;
  readonly end: number;
  readonly frontness: number;
  readonly projectionScope: 'installed-envelope' | 'route-samples';
  readonly routeSampleCount: number;
  readonly silhouette: 'at-least-one-pixel' | 'subpixel-width-review';
  readonly clearance: 'sampled-clear' | 'needs-route-validation';
  readonly desktop: EiffelProjectedPayload;
  readonly mobile: EiffelProjectedPayload;
}

/** Projection uses the exact cinematic camera. It does not claim visibility through occluders. */
export function projectEiffelPayload(part: EiffelKitPart, t: number, width: number, height: number, pose: RigidPose = part.finalPose): EiffelProjectedPayload {
  const shot = eiffelCinematicShotAt(t, width / height), ca = Math.cos(shot.azimuth), sa = Math.sin(shot.azimuth), cp = Math.cos(shot.pitch), sp = Math.sin(shot.pitch);
  const tan = Math.tan(shot.fov * Math.PI / 360), aspect = width / height;
  const points: [number, number][] = []; let inFrame = true;
  for (const x of [part.localBounds.min[0], part.localBounds.max[0]]) for (const y of [part.localBounds.min[1], part.localBounds.max[1]]) for (const z of [part.localBounds.min[2], part.localBounds.max[2]]) {
    const v: RigidVec3 = transformRigidPoint(pose, [x, y, z]);
    const dx = v[0] - shot.target[0], dy = v[1] - shot.target[1], dz = v[2] - shot.target[2];
    const radial = ca * dx + sa * dz, depth = shot.radius - cp * radial - sp * dy;
    const nx = (sa * dx - ca * dz) / (depth * tan * aspect), ny = (-sp * radial + cp * dy) / (depth * tan);
    inFrame &&= depth > 0 && Math.abs(nx) < .98 && Math.abs(ny) < .98;
    points.push([(nx + 1) * width / 2, (1 - ny) * height / 2]);
  }
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a: readonly number[], b: readonly number[], c: readonly number[]) => (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
  const half = (values: typeof sorted) => { const result: typeof sorted = []; for (const p of values) { while (result.length > 1 && cross(result[result.length - 2]!, result.at(-1)!, p) <= 0) result.pop(); result.push(p); } return result; };
  const lower = half(sorted), upper = half(sorted.slice().reverse()); lower.pop(); upper.pop(); const hull = [...lower, ...upper];
  let area = 0, longPixels = 0;
  for (let i = 0; i < hull.length; i++) { const a = hull[i]!, b = hull[(i + 1) % hull.length]!; area += a[0] * b[1] - a[1] * b[0]; }
  for (const a of points) for (const b of points) longPixels = Math.max(longPixels, Math.hypot(a[0] - b[0], a[1] - b[1]));
  area = Math.abs(area) / 2;
  return { longPixels, effectiveWidthPixels: area / Math.max(longPixels, 1e-9), areaPixels: area, entirelyInFrame: inFrame, points };
}

export function selectEiffelSignatures(inputs: readonly EiffelSignatureInput[]): EiffelSignatureChoice[] {
  return EIFFEL_SIGNATURE_WINDOWS.map(window => {
    const t = (window.start + window.end) / 2, shot = eiffelCinematicShotAt(t);
    const candidates = inputs.filter(({ part }) => part.stage >= window.low && part.stage <= window.high && part.shape === 'box' && part.transportSize.every((size, i) => size > 0 && size <= (i === 2 ? 6 : 2.6) + 1e-4)).map(({ part, upperClearance, previewPoses }) => {
      const radius = Math.hypot(part.center[0], part.center[2]);
      const frontness = radius > 1e-6 ? (Math.cos(shot.azimuth) * part.center[0] + Math.sin(shot.azimuth) * part.center[2]) / radius : 1;
      const poses = previewPoses?.length ? previewPoses : [{ fraction: .5, pose: part.finalPose }];
      const projected = (width: number, height: number) => {
        const samples = poses.map(p => projectEiffelPayload(part, window.start + (window.end - window.start) * p.fraction, width, height, p.pose));
        const weakest = samples.reduce((a, b) => a.areaPixels < b.areaPixels ? a : b);
        return { ...weakest, longPixels: Math.min(...samples.map(p => p.longPixels)), effectiveWidthPixels: Math.min(...samples.map(p => p.effectiveWidthPixels)), areaPixels: Math.min(...samples.map(p => p.areaPixels)), entirelyInFrame: samples.every(p => p.entirelyInFrame) };
      };
      const desktop = projected(1440, 900), mobile = projected(390, 844);
      return { silhouette: mobile.effectiveWidthPixels >= 1 ? 'at-least-one-pixel' as const : 'subpixel-width-review' as const, projectionScope: previewPoses?.length ? 'route-samples' as const : 'installed-envelope' as const, routeSampleCount: previewPoses?.length ?? 0, id: window.id, partId: part.id, stage: part.stage, start: window.start, end: window.end, frontness, clearance: upperClearance === 'sampled-clear' ? 'sampled-clear' as const : 'needs-route-validation' as const, desktop, mobile };
    }).filter(c => c.frontness > .2 && c.desktop.entirelyInFrame && c.mobile.entirelyInFrame && c.desktop.longPixels >= 12 && c.mobile.longPixels >= 7);
    if (!candidates.length) throw new Error(`No projected human-scale signature payload for ${window.id}`);
    // A real checked route outranks a larger, unverified payload. Within that set,
    // projected silhouette area prevents diagonal thin rods winning on AABB area.
    candidates.sort((a, b) => Number(b.clearance === 'sampled-clear') - Number(a.clearance === 'sampled-clear') || Number(b.mobile.effectiveWidthPixels >= 1) - Number(a.mobile.effectiveWidthPixels >= 1) || (b.mobile.areaPixels * (.7 + .3 * b.frontness)) - (a.mobile.areaPixels * (.7 + .3 * a.frontness)) || a.partId.localeCompare(b.partId));
    return candidates[0]!;
  });
}

/** Preserves the input order. Dependencies must precede dependents; no implicit reordering. */
export function allocateEiffelSignatureTiming(
  ordered: readonly EiffelSignatureInput[], dependencies: ReadonlyMap<string, readonly string[]>, choices: readonly EiffelSignatureChoice[],
): ReadonlyMap<string, EiffelTiming> {
  if (choices.length !== 4 || new Set(choices.map(c => c.id)).size !== 4 || new Set(choices.map(c => c.partId)).size !== 4) throw new Error('Exactly four distinct signature choices are required');
  const selected = new Map(choices.map(c => [c.partId, c]));
  for (const choice of choices) {
    const window = EIFFEL_SIGNATURE_WINDOWS.find(w => w.id === choice.id)!;
    const part = ordered.find(o => o.part.id === choice.partId)?.part;
    if (!part || part.stage !== choice.stage || part.stage < window.low || part.stage > window.high || choice.start !== window.start || choice.end !== window.end) throw new Error(`Invalid signature reservation ${choice.id}`);
  }
  const seen = new Set<string>(); let previousStage = -Infinity;
  for (const { part } of ordered) {
    if (seen.has(part.id) || part.stage < previousStage) throw new Error('Signature input must have unique parts in stage order');
    for (const dependency of dependencies.get(part.id) ?? []) if (!seen.has(dependency)) throw new Error(`Unscheduled signature dependency ${dependency} for ${part.id}`);
    seen.add(part.id); previousStage = part.stage;
  }
  const result = new Map<string, EiffelTiming>(); let waveId = 0;
  for (const [low, high, begin, end] of BANDS) {
    const band = ordered.filter(o => o.part.stage >= low && o.part.stage <= high);
    const waves: EiffelSignatureInput[][] = []; const partWave = new Map<string, number>();
    let stage = -Infinity;
    for (const item of band) {
      const ownSignature = selected.has(item.part.id), last = waves.at(-1);
      const dependencyInLast = (dependencies.get(item.part.id) ?? []).some(id => partWave.get(id) === waves.length - 1);
      if (!last || last.length === 4 || stage !== item.part.stage || ownSignature || selected.has(last[0]!.part.id) || dependencyInLast) waves.push([]);
      waves.at(-1)!.push(item); partWave.set(item.part.id, waves.length - 1); stage = item.part.stage;
    }
    const signatureIndex = waves.findIndex(w => selected.has(w[0]!.part.id));
    const signature = signatureIndex >= 0 ? selected.get(waves[signatureIndex]![0]!.part.id)! : null;
    const segments = signature ? [[0, signatureIndex, begin, signature.start], [signatureIndex, signatureIndex + 1, signature.start, signature.end], [signatureIndex + 1, waves.length, signature.end, end]] : [[0, waves.length, begin, end]];
    for (const [first, last, from, to] of segments) {
      const count = last! - first!; if (!count) continue;
      if (!(to! > from!)) throw new Error('No independent time remains outside a signature');
      for (let i = first!; i < last!; i++) {
        const start = from! + (to! - from!) * (i - first!) / count, finish = i === last! - 1 ? to! : from! + (to! - from!) * (i - first! + 1) / count;
        for (const { part } of waves[i]!) result.set(part.id, { start, end: finish, hero: selected.has(part.id), wave: waveId });
        waveId++;
      }
    }
  }
  if (result.size !== ordered.length) throw new Error('Signature timing omitted an unsupported stage');
  for (const [id, timing] of result) for (const dependency of dependencies.get(id) ?? []) if (result.get(dependency)!.end > timing.start + 1e-12) throw new Error(`Overlapping signature dependency ${dependency}`);
  return result;
}
