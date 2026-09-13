import type { RigidVec3 } from './eiffelRigid';

type V = RigidVec3;
const UP: V = [0, 1, 0];
const X: V = [1, 0, 0];
const NEG_Z: V = [0, 0, -1];
const Z: V = [0, 0, 1];
const TAU = Math.PI * 2;
const EPS = 1e-9;
export const EIFFEL_SUMMIT_CARGO_SIDE = Math.hypot(.36, .34);
export const EIFFEL_SUMMIT_CARGO_RING_RADIUS = Math.sqrt(.36 ** 2 + .34 ** 2 - .06 ** 2);
export const EIFFEL_SUMMIT_CARGO_BRIDLE_LENGTH = Math.hypot(.14, 1.61);
export const EIFFEL_SUMMIT_CARGO_WINDING_PITCH = .0122;
export const EIFFEL_SUMMIT_CARGO_WINDING_MAX_TURNS = 119;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: V) => Math.hypot(...a);
const unit = (a: V): V => {
  const size = length(a);
  if (size < EPS) throw new Error('Cargo rope has a degenerate direction');
  return mul(a, 1 / size);
};

export interface EiffelCargoRopeLine {
  readonly kind: 'line'; readonly id: string;
  readonly start: V; readonly end: V; readonly length: number;
}
export interface EiffelCargoRopeArc {
  readonly kind: 'arc'; readonly id: string;
  readonly start: V; readonly end: V; readonly length: number;
  readonly center: V; readonly radius: number; readonly axis: V;
  readonly startRadial: V; readonly startTangent: V; readonly sweep: number;
}
export type EiffelCargoRopeSegment = EiffelCargoRopeLine | EiffelCargoRopeArc;
export interface EiffelCargoRopeInput {
  readonly assembly?: 1 | 2 | string;
  readonly heel: V;
  /** Mathematical world-X/Z azimuth, increasing west -> south -> east. */
  readonly boomYaw: number;
  readonly boomPitch: number;
  readonly lowerBlockCenter: V;
  readonly tipSideOffset?: number;
  readonly bridleAnchors?: readonly [V, V];
  /** Explicit alternate support only; both admitted candidate lifts use zero. */
  readonly fixedDriveOffsetY?: number;
}
export interface EiffelCargoGuidePose {
  readonly id: string; readonly center: V; readonly axis: V; readonly radius: number;
}

/** Signed common tangent in one real sheave plane. Opposite radii select
 * an internal tangent; this is necessary at the drum and western redirect. */
function tangent(a: V, ra: number, b: V, rb: number, u: V, v: V, normalHint: V, internal = false) {
  const delta = sub(b, a), dx = dot(delta, u), dy = dot(delta, v);
  if (Math.abs(dot(delta, cross(u, v))) > 1e-6) throw new Error('Cargo sheaves are not coplanar');
  const distance = Math.hypot(dx, dy), sign = internal ? -1 : 1;
  const k = (ra - sign * rb) / distance;
  if (!(distance > EPS) || Math.abs(k) >= 1) throw new Error('Cargo sheaves have no real tangent');
  const h = Math.sqrt(1 - k * k), ex = dx / distance, ey = dy / distance;
  const candidates = [-1, 1].map(s => add(mul(u, k * ex - s * h * ey), mul(v, k * ey + s * h * ex)));
  const normal = dot(candidates[0]!, normalHint) > dot(candidates[1]!, normalHint) ? candidates[0]! : candidates[1]!;
  return { a: add(a, mul(normal, ra)), b: add(b, mul(normal, sign * rb)) };
}

function line(id: string, start: V, end: V): EiffelCargoRopeLine {
  return { kind: 'line', id, start, end, length: length(sub(end, start)) };
}
function arc(id: string, center: V, radius: number, start: V, end: V, incoming: V, explicitSweep?: number): EiffelCargoRopeArc {
  const radial = unit(sub(start, center)), tangentDirection = unit(incoming);
  if (Math.abs(length(sub(start, center)) - radius) > 1e-6 || Math.abs(length(sub(end, center)) - radius) > 1e-6
    || Math.abs(dot(radial, tangentDirection)) > 1e-6) throw new Error(`Cargo rope non-tangent arc: ${id}`);
  const endRadial = unit(sub(end, center));
  let sweep = explicitSweep ?? Math.atan2(dot(endRadial, tangentDirection), dot(endRadial, radial));
  if (sweep < -EPS) sweep += TAU;
  if (Math.abs(sweep) < EPS) sweep = 0;
  return { kind: 'arc', id, start, end, center, radius, startRadial: radial, startTangent: tangentDirection,
    axis: unit(cross(radial, tangentDirection)), sweep, length: radius * sweep };
}
export function sampleEiffelCargoRopeSegment(segment: EiffelCargoRopeSegment, progress: number): V {
  const t = Math.min(1, Math.max(0, progress));
  if (t === 0) return segment.start;
  if (t === 1) return segment.end;
  if (segment.kind === 'line') return add(segment.start, mul(sub(segment.end, segment.start), t));
  const angle = segment.sweep * t;
  return add(segment.center, mul(add(mul(segment.startRadial, Math.cos(angle)), mul(segment.startTangent, Math.sin(angle))), segment.radius));
}
function sampled(segments: readonly EiffelCargoRopeSegment[]): V[] {
  const points: V[] = [];
  for (const segment of segments) {
    if (!points.length) points.push(segment.start);
    const steps = segment.kind === 'line' ? 1 : segment.id === 'head-annulus' ? 128 : 24;
    for (let i = 1; i <= steps; i++) points.push(sampleEiffelCargoRopeSegment(segment, i / steps));
  }
  return points;
}

/** The 1:1 diamond cam repeats after 24 spindle turns. Eleven straight
 * turns and one rounded reversal lay each layer without an axial snap. */
export function eiffelCargoWindingCrossSection(turns: number) {
  const p = EIFFEL_SUMMIT_CARGO_WINDING_PITCH, a = 5.5 * p;
  const layer = Math.floor(turns / 12), t = turns - 12 * layer, direction = layer % 2 ? -1 : 1;
  if (t <= 11) return { x: direction * (-a + p * t), radius: .106 + layer * p, dx: direction * p, dr: 0, layer };
  const u = t - 11, psi = 2 * u + (Math.PI - 2) * (3 * u * u - 2 * u * u * u);
  const speed = 2 + (Math.PI - 2) * 6 * u * (1 - u);
  return { x: direction * (a + .5 * p * Math.sin(psi)), radius: .106 + layer * p + .5 * p * (1 - Math.cos(psi)),
    dx: direction * .5 * p * Math.cos(psi) * speed, dr: .5 * p * Math.sin(psi) * speed, layer };
}
const LEAD_DISTANCE = Math.hypot(.46, .13);
const LEAD_ELEVATION = Math.atan2(.13, .46);
const takeoffAngle = (radius: number) => Math.asin((radius + .06) / LEAD_DISTANCE) - LEAD_ELEVATION;
const takeoffDerivative = (radius: number) => 1 / Math.sqrt(LEAD_DISTANCE ** 2 - (radius + .06) ** 2);
const GAUSS_NODES = [.09501250983763744, .2816035507792589, .4580167776572274, .6178762444026438, .755404408355003, .8656312023878318, .9445750230732326, .9894009349916499];
const GAUSS_WEIGHTS = [.1894506104550685, .1826034150449236, .1691565193950025, .1495959888165767, .1246289712555339, .0951585116824928, .0622535239386479, .0271524594117541];
function integrate(f: (q: number) => number, from: number, to: number) {
  const half = (to - from) / 2, middle = (from + to) / 2;
  return half * GAUSS_NODES.reduce((sum, node, i) => sum + GAUSS_WEIGHTS[i]! * (f(middle - half * node) + f(middle + half * node)), 0);
}
type WindingSection = ReturnType<typeof eiffelCargoWindingCrossSection>;
function windingSpeed(section: WindingSection) {
  const angularSpeed = TAU + takeoffDerivative(section.radius) * section.dr;
  return Math.hypot(section.dx, section.dr, section.radius * angularSpeed);
}
const WINDING_LAYER_LENGTHS = Array.from({ length: 10 }, (_, layer) => {
  const from = 12 * layer;
  const straight = 11 * Math.hypot(EIFFEL_SUMMIT_CARGO_WINDING_PITCH, TAU * (.106 + layer * EIFFEL_SUMMIT_CARGO_WINDING_PITCH));
  return straight + (layer < 9 ? integrate(q => windingSpeed(eiffelCargoWindingCrossSection(q)), from + 11, from + 12) : 0);
});
function baseWindingLength(turns: number) {
  const layer = Math.min(9, Math.floor(turns / 12)), t = turns - 12 * layer;
  let sum = WINDING_LAYER_LENGTHS.slice(0, layer).reduce((a, b) => a + b, 0);
  sum += Math.min(t, 11) * Math.hypot(EIFFEL_SUMMIT_CARGO_WINDING_PITCH, TAU * (.106 + layer * EIFFEL_SUMMIT_CARGO_WINDING_PITCH));
  if (t > 11) sum += integrate(q => windingSpeed(eiffelCargoWindingCrossSection(q)), layer * 12 + 11, turns);
  return sum;
}
/** The last quarter turn is a C1 peel-off patch. Its axial and radial
 * derivatives become zero at detachment, so the free rope has a real circular
 * tangent in the fixed lead plane, rather than a kink at a helical endpoint. */
function peeledSection(q: number, end: number): WindingSection {
  const start = Math.max(0, end - .25);
  if (q <= start || end === start) return eiffelCargoWindingCrossSection(q);
  const a = eiffelCargoWindingCrossSection(start), b = eiffelCargoWindingCrossSection(end), width = end - start, u = (q - start) / width;
  const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u;
  const d00 = 6 * u * u - 6 * u, d10 = 3 * u * u - 4 * u + 1, d01 = -d00;
  const hermite = (v0: number, slope: number, v1: number) => h00 * v0 + h10 * width * slope + h01 * v1;
  const derivative = (v0: number, slope: number, v1: number) => (d00 * v0 + d10 * width * slope + d01 * v1) / width;
  return { x: hermite(a.x, a.dx, b.x), radius: hermite(a.radius, a.dr, b.radius),
    dx: derivative(a.x, a.dx, b.x), dr: derivative(a.radius, a.dr, b.radius), layer: b.layer };
}
export function eiffelCargoWindingLength(turns: number) {
  if (!Number.isFinite(turns) || turns < 0 || turns > EIFFEL_SUMMIT_CARGO_WINDING_MAX_TURNS) throw new Error('Cargo winding turns outside capacity');
  const start = Math.max(0, turns - .25);
  return baseWindingLength(start) + integrate(q => windingSpeed(peeledSection(q, turns)), start, turns);
}
export function sampleEiffelCargoWindingPoint(turns: number, woundTurns: number): V {
  const section = peeledSection(turns, woundTurns), angle = TAU * turns + takeoffAngle(section.radius);
  return [section.x, section.radius * Math.cos(angle), section.radius * Math.sin(angle)];
}
export function sampleEiffelCargoWindingTangent(turns: number, woundTurns: number): V {
  const section = peeledSection(turns, woundTurns), angle = TAU * turns + takeoffAngle(section.radius);
  const speed = TAU + takeoffDerivative(section.radius) * section.dr;
  return unit([section.dx, section.dr * Math.cos(angle) - section.radius * Math.sin(angle) * speed,
    section.dr * Math.sin(angle) + section.radius * Math.cos(angle) * speed]);
}
const WINDING_SAMPLES_PER_TURN = 96;
const BASE_WINDING_POINTS = Array.from({ length: EIFFEL_SUMMIT_CARGO_WINDING_MAX_TURNS * WINDING_SAMPLES_PER_TURN + 1 }, (_, i) => {
  const q = i / WINDING_SAMPLES_PER_TURN, section = eiffelCargoWindingCrossSection(q), angle = TAU * q + takeoffAngle(section.radius);
  return [section.x, section.radius * Math.cos(angle), section.radius * Math.sin(angle)] as V;
});
function windingPoints(turns: number) {
  const start = Math.max(0, turns - .25), count = Math.floor(start * WINDING_SAMPLES_PER_TURN);
  const points = BASE_WINDING_POINTS.slice(0, count + 1);
  if (start > count / WINDING_SAMPLES_PER_TURN + EPS) points.push(sampleEiffelCargoWindingPoint(start, turns));
  const steps = Math.max(1, Math.ceil((turns - start) * WINDING_SAMPLES_PER_TURN));
  for (let i = 1; i <= steps; i++) points.push(sampleEiffelCargoWindingPoint(start + (turns - start) * i / steps, turns));
  return points;
}

/** Candidate geometry only. The drive frame stays on m073 while its keyed
 * drum traverses. Actual-source hardware/clearance admission is separate. */
export function solveEiffelSummitCargoRope(input: EiffelCargoRopeInput) {
  const { heel: h, lowerBlockCenter: block } = input;
  if (![...h, ...block, input.boomYaw, input.boomPitch].every(Number.isFinite)) throw new Error('Cargo rope inputs must be finite');
  const side = input.tipSideOffset ?? EIFFEL_SUMMIT_CARGO_SIDE;
  if (Math.abs(side - EIFFEL_SUMMIT_CARGO_SIDE) > 1e-8) throw new Error('Cargo side offset disagrees with authored annulus');
  const offset = input.fixedDriveOffsetY ?? 0;
  if (!Number.isFinite(offset)) throw new Error('Cargo drive offset must be finite');
  const e: V = [Math.cos(input.boomYaw), 0, Math.sin(input.boomYaw)];
  const n: V = [-e[2], 0, e[0]];
  const local = (x: number, y: number, z: number): V => add(h, add(mul(e, x), add(mul(UP, y), mul(n, z))));
  const fixed = (x: number, y: number, z: number): V => [x, y + offset, z];
  const d = fixed(.25, 303.01, .12), g1 = fixed(.25, 303.14, .58), g2 = fixed(.19, 303.32, .64);
  const g3 = fixed(-1.18, 303.38, .56), g4 = fixed(-1.26, 303.46, -.26);
  const drumToFirst = tangent(d, .10, g1, .06, Z, UP, UP, true);
  const firstExit = add(g1, [0, 0, .06]), secondEntry = add(g2, [.06, 0, 0]);
  const secondExit = add(g2, [0, .06, 0]), westEntry = add(g3, [0, 0, .08]);
  const westHorizontalExit = add(g3, [-.08, 0, 0]), upturnEntry = add(g4, [0, -.08, 0]);
  const westExit = add(g4, [0, 0, -.08]);

  const r = .06, R = EIFFEL_SUMMIT_CARGO_RING_RADIUS, s = EIFFEL_SUMMIT_CARGO_SIDE;
  const beta = Math.asin(r / s), phiFixed = Math.atan2(-.34, -.36) - beta;
  const fixedRadial: V = [Math.cos(phiFixed), 0, Math.sin(phiFixed)];
  const fixedTangent: V = [fixedRadial[2], 0, -fixedRadial[0]];
  const ringCenter: V = [h[0], h[1] - .18, h[2]];
  const fixedGuide = add(ringCenter, add(mul(fixedRadial, R), [0, -r, 0]));
  const fixedEntry = add(fixedGuide, mul(fixedTangent, -r)), ringEntry = add(fixedGuide, [0, r, 0]);
  if (Math.hypot(westExit[0] - fixedEntry[0], westExit[2] - fixedEntry[2]) > 1e-6 || fixedEntry[1] <= westExit[1])
    throw new Error('Cargo head is not above the fixed western riser');
  const exitGuide = local(-r * R / s, -.12, R * R / s);
  const exitTangent = add(mul(e, R / s), mul(n, r / s));
  const ringExit = add(exitGuide, [0, -r, 0]), exitVertical = local(0, -.12, s);
  // The mathematical yaw may be supplied modulo 2pi. The admissible arc has
  // one unique branch in (0,2pi); continuity is tested over the actual route.
  const phiExit = input.boomYaw + Math.PI / 2 + beta;
  let wrap = phiFixed - phiExit;
  wrap -= Math.floor(wrap / TAU) * TAU;
  if (wrap < 1e-5 || wrap > TAU - 1e-5) throw new Error('Cargo annular entry and exit coincide');

  const heelSheave = local(.06, .30, s), heelEntry = local(0, .30, s);
  const cp = Math.cos(input.boomPitch), sp = Math.sin(input.boomPitch);
  const tip = local(.30 + 5.70 * cp, 5.70 * sp, s);
  const becket = local(.30 + 5.60 * cp + .13 * sp, 5.60 * sp - .13 * cp, s);
  if (Math.abs(dot(sub(block, h), n) - s) > 1e-5) throw new Error('Cargo lower block is outside its sheave plane');
  if (tip[1] - block[1] <= .18) throw new Error('Cargo block has insufficient headroom');
  const heelToTip = tangent(heelSheave, .06, tip, .10, e, UP, UP);
  const tipToBlock = tangent(tip, .10, block, .08, e, UP, e);
  const blockToBecket = tangent(block, .08, becket, 0, e, UP, mul(e, -1));

  const segments: EiffelCargoRopeSegment[] = [
    line('drum-to-east', drumToFirst.a, drumToFirst.b),
    arc('east-low', g1, .06, drumToFirst.b, firstExit, sub(drumToFirst.b, drumToFirst.a)),
    line('east-rise', firstExit, secondEntry),
    arc('east-high', g2, .06, secondEntry, secondExit, UP),
    line('east-to-west', secondExit, westEntry),
    arc('west-horizontal', g3, .08, westEntry, westHorizontalExit, [-1, 0, 0]),
    line('western-return', westHorizontalExit, upturnEntry),
    arc('west-upturn', g4, .08, upturnEntry, westExit, NEG_Z),
    line('western-riser', westExit, fixedEntry),
    arc('fixed-head-entry', fixedGuide, r, fixedEntry, ringEntry, UP),
    arc('head-annulus', ringCenter, R, ringEntry, ringExit, fixedTangent, wrap),
    arc('yaw-head-exit', exitGuide, r, ringExit, exitVertical, exitTangent),
    line('side-rise', exitVertical, heelEntry),
    arc('cargo-heel', heelSheave, .06, heelEntry, heelToTip.a, UP),
    line('heel-to-tip', heelToTip.a, heelToTip.b),
    arc('cargo-tip', tip, .10, heelToTip.b, tipToBlock.a, sub(heelToTip.b, heelToTip.a)),
    line('first-cargo-fall', tipToBlock.a, tipToBlock.b),
    arc('travelling-block', block, .08, tipToBlock.b, blockToBecket.a, sub(tipToBlock.b, tipToBlock.a)),
    line('second-cargo-fall', blockToBecket.a, becket),
  ];
  const restLength = segments.slice(2).reduce((sum, segment) => sum + segment.length, 0);
  const prefixAtRadius = (radius: number) => {
    const lead = tangent(d, radius, g1, .06, Z, UP, UP, true);
    const first = line('drum-to-east', lead.a, lead.b);
    const second = arc('east-low', g1, .06, lead.b, firstExit, sub(lead.b, lead.a));
    return { first, second, length: first.length + second.length };
  };
  const balance = (turns: number) => eiffelCargoWindingLength(turns) + prefixAtRadius(eiffelCargoWindingCrossSection(turns).radius).length + restLength;
  let lower = 0, upper = EIFFEL_SUMMIT_CARGO_WINDING_MAX_TURNS;
  if (balance(lower) >= 120 || balance(upper) <= 120) throw new Error('Cargo winding cannot balance the rope inventory');
  for (let i = 0; i < 43; i++) {
    const middle = (lower + upper) / 2;
    if (balance(middle) < 120) lower = middle; else upper = middle;
  }
  const woundTurns = (lower + upper) / 2, windingSection = eiffelCargoWindingCrossSection(woundTurns);
  const finalPrefix = prefixAtRadius(windingSection.radius);
  segments[0] = finalPrefix.first; segments[1] = finalPrefix.second;
  const drumCenter = add(d, [-windingSection.x, 0, 0]), drumRotation = -TAU * woundTurns;
  const localWinding = windingPoints(woundTurns), woundLength = eiffelCargoWindingLength(woundTurns);
  const fixedSegments = segments.slice(0, 10), dynamicSegments = segments.slice(10);
  const fixedLength = fixedSegments.reduce((sum, segment) => sum + segment.length, 0);
  const freeLength = dynamicSegments.reduce((sum, segment) => sum + segment.length, 0);
  const deployedLength = fixedLength + freeLength;
  if (deployedLength >= 120) throw new Error('Cargo reference path exhausts its rope inventory');
  const eye = add(block, [0, -.19, 0]);
  const bridle = input.bridleAnchors?.map((anchor, i) => line(`bridle-${i}`, eye, anchor)) ?? [];
  if (bridle.some(leg => Math.abs(leg.length - EIFFEL_SUMMIT_CARGO_BRIDLE_LENGTH) > 1e-5))
    throw new Error('Cargo bridle has changed its fixed length');
  const guidePoses: EiffelCargoGuidePose[] = [
    { id: 'cargo-drum', center: drumCenter, axis: X, radius: .10 },
    ...segments.filter((segment): segment is EiffelCargoRopeArc => segment.kind === 'arc')
      .map(segment => ({ id: segment.id, center: segment.center, axis: segment.axis, radius: segment.radius })),
  ];
  return { points: sampled(segments), fixedPoints: sampled(fixedSegments), dynamicPoints: sampled(dynamicSegments),
    radius: .006, segments, guidePoses, continuousWrapAngle: wrap, deployedLength,
    fixedLength, freeLength, lowerBlockEye: eye, tipBecket: becket, bridle,
    winding: { localPoints: localWinding, drumCenter, drumRotation, spindleTurns: woundTurns,
      layer: windingSection.layer, radius: windingSection.radius, localExitX: windingSection.x,
      baseCenter: d, camRotation: drumRotation, followerX: -windingSection.x,
      followerTangent: unit([-windingSection.dx, 0, TAU * .035]),
      length: woundLength, terminalLocalTangent: sampleEiffelCargoWindingTangent(woundTurns, woundTurns),
      numericalLengthMethod: 'analytic straight layers and 16-point Gauss-Legendre curved reversal/peel sections' as const },
    inventory: { totalLength: 120, woundLength, referenceWoundLength: woundLength,
      residual: woundLength + deployedLength - 120, geometricWindingSolved: true as const,
      visualWindingAdmitted: false as const, drumExitUsesReferenceCore: false as const,
      pendingReason: 'Actual keyed spindle, traversing carriage, cam engagement, and whole-rope source clearance still require admission.' },
    fixedDriveOffsetY: offset, lengthIsAnalytic: true as const, sourceClearanceVerified: false as const };
}
