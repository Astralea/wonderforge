import type { Vec3 } from './constructionTypes';
import { mulberry32 } from '../engine/random';
import { eiffelTerrainHeightAt } from '../engine/eiffelTerrain';
import type {
  EiffelConstructionPlan,
  EiffelLayer,
  EiffelLegId,
  EiffelPart,
  EiffelPartGroup,
  EiffelPartKind,
  EiffelRoute,
} from './eiffelTypes';

export const EIFFEL_HEIGHT = 312;
export const EIFFEL_BASE = 197;
export const EIFFEL_PLATFORM_1 = 57;
export const EIFFEL_PLATFORM_2 = 115;
export const EIFFEL_PLATFORM_3 = 276;
export const EIFFEL_WAGON_BED = 0.85;
export const EIFFEL_MAX_ACTIVE = 96;
export const EIFFEL_YARD: Vec3 = [168, 2.2, 36];
export const EIFFEL_CREEPER_MAST_RADIUS = 0.55;
export const EIFFEL_CREEPER_JIB_RADIUS = 0.72;
export const EIFFEL_CREEPER_CABIN: Vec3 = [12, 8, 10];
export const EIFFEL_CREEPER_COUNTER: Vec3 = [8.4, 5.8, 7.2];

export const EIFFEL_LEGS: ReadonlyArray<{ key: EiffelLegId; sx: 1 | -1; sz: 1 | -1 }> = [
  { key: 'ne', sx: 1, sz: 1 },
  { key: 'se', sx: 1, sz: -1 },
  { key: 'sw', sx: -1, sz: -1 },
  { key: 'nw', sx: -1, sz: 1 },
];

const LAYERS: EiffelLayer[] = [
  { id: 'paris-champ-sky', depth: 0, motion: 'playback-time' },
  { id: 'seine-trocadero', depth: 1, motion: 'static-world-space' },
  { id: 'champ-de-mars', depth: 2, motion: 'static-world-space' },
  { id: 'tower', depth: 3, motion: 'playback-time' },
  { id: 'work-systems', depth: 4, motion: 'playback-time' },
  { id: 'foreground-yard', depth: 5, motion: 'static-world-space' },
];

const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function eiffelOffsetAt(y: number): number {
  const yClamped = Math.max(0, y);
  if (yClamped <= EIFFEL_PLATFORM_1) {
    return 90 + (21 - 90) * (yClamped / EIFFEL_PLATFORM_1);
  }
  if (yClamped <= EIFFEL_PLATFORM_2) {
    return 21 + (9.4 - 21) * ((yClamped - EIFFEL_PLATFORM_1) / (EIFFEL_PLATFORM_2 - EIFFEL_PLATFORM_1));
  }
  if (yClamped <= EIFFEL_PLATFORM_3) {
    return 9.4 + (3.4 - 9.4) * ((yClamped - EIFFEL_PLATFORM_2) / (EIFFEL_PLATFORM_3 - EIFFEL_PLATFORM_2));
  }
  return 3.4 + (1.6 - 3.4) * Math.min(1, (yClamped - EIFFEL_PLATFORM_3) / (EIFFEL_HEIGHT - EIFFEL_PLATFORM_3));
}

export function eiffelLegCenter(sx: number, sz: number, y: number): [number, number] {
  const offset = eiffelOffsetAt(y);
  return [sx * offset, sz * offset];
}

export function eiffelLean(sx: number, sz: number, y0: number, y1: number): [number, number] {
  const dy = Math.max(0.01, y1 - y0);
  const o0 = eiffelOffsetAt(y0);
  const o1 = eiffelOffsetAt(y1);
  const rx = Math.atan2(sz * (o0 - o1), dy);
  const rz = Math.atan2(-sx * (o0 - o1), dy);
  return [rx, rz];
}

const ARCH_SPRING_Y = 14;
const ARCH_CROWN_Y = EIFFEL_PLATFORM_1 - 2;
const ARCH_RISE = ARCH_CROWN_Y - ARCH_SPRING_Y;
const ARCH_HALF0 = eiffelOffsetAt(ARCH_SPRING_Y) * 0.82;
const ARCH_RHO = (ARCH_HALF0 * ARCH_HALF0 + ARCH_RISE * ARCH_RISE) / (2 * ARCH_RISE);

/** Circular Sauvestre spring: u in [0,1] along one face, radial metres outside the pylon. */
export function eiffelArchPoint(
  towardX: number,
  towardZ: number,
  yaw: number,
  u: number,
  radial: number,
): { x: number; y: number; z: number } {
  const along0 = (u - 0.5) * 2 * ARCH_HALF0;
  const y = ARCH_SPRING_Y + ARCH_RISE - ARCH_RHO + Math.sqrt(Math.max(0, ARCH_RHO * ARCH_RHO - along0 * along0));
  const off = eiffelOffsetAt(y) + radial;
  const along = (u - 0.5) * 2 * eiffelOffsetAt(y) * 0.82;
  return {
    x: towardX * off + Math.cos(yaw) * along,
    y,
    z: towardZ * off + Math.sin(yaw) * along,
  };
}

function part(partial: Omit<EiffelPart, 'scale' | 'routeId'>): EiffelPart {
  return { ...partial, scale: [1, 1, 1], routeId: 'levallois-east' };
}

export function createEiffelConstructionPlan(): EiffelConstructionPlan {
  const rand = mulberry32('eiffel-kœchlin-v1');
  const parts: EiffelPart[] = [];
  const routes: EiffelRoute[] = [
    {
      id: 'levallois-east',
      yard: EIFFEL_YARD,
      road: [96, 0.6, 28],
      staging: [72, 0.8, 18],
      laneWidth: 4.4,
    },
  ];

  const push = (
    id: string,
    group: EiffelPartGroup,
    kind: EiffelPartKind,
    leg: EiffelPart['leg'],
    storey: number,
    dimensions: Vec3,
    finalPosition: Vec3,
    finalRotation: Vec3,
    material: EiffelPart['material'],
    lane: number,
    start: number,
    duration: number,
  ) => {
    parts.push(part({
      id,
      group,
      kind,
      leg,
      storey,
      dimensions,
      finalPosition,
      finalRotation,
      material,
      lane,
      start,
      duration,
      colorVariation: rand() * 2 - 1,
    }));
  };

  for (const [index, leg] of EIFFEL_LEGS.entries()) {
    const [x, z] = eiffelLegCenter(leg.sx, leg.sz, 2);
    const turf = eiffelTerrainHeightAt(x, z);
    const stagger = 0.002 + index * 0.005;
    push(
      `pier-${leg.key}-plinth`,
      'foundation',
      'pier',
      leg.key,
      -1,
      [17.2, 2.8, 17.2],
      [x, turf + 1.4, z],
      [0, 0, 0],
      'masonry',
      index,
      stagger,
      0.008,
    );
    push(
      `pier-${leg.key}-course`,
      'foundation',
      'pier',
      leg.key,
      -1,
      [16.0, 3, 16.0],
      [x, turf + 4.3, z],
      [0, 0, 0],
      'masonry',
      index,
      stagger + 0.005,
      0.008,
    );
    push(
      `pier-${leg.key}`,
      'foundation',
      'pier',
      leg.key,
      -1,
      [14.8, 2.6, 14.8],
      [x, turf + 7.1, z],
      [0, 0, 0],
      'masonry',
      index,
      stagger + 0.01,
      0.01,
    );
  }

  const addLegStoreys = (
    count: number,
    yStart: number,
    yEnd: number,
    origin: number,
    span: number,
    duration: number,
    group: Extract<EiffelPartGroup, 'leg' | 'shaft' | 'lantern'>,
    storeyOffset: number,
    width0: number,
    width1: number,
  ) => {
    const pylons = group === 'shaft' || group === 'lantern'
      ? [{ key: 'axis' as const, sx: 0, sz: 0, index: 0 }]
      : EIFFEL_LEGS.map((leg, index) => ({ key: leg.key, sx: leg.sx, sz: leg.sz, index }));
    for (let storey = 0; storey < count; storey += 1) {
      const y0 = yStart + (storey / count) * (yEnd - yStart);
      const y1 = yStart + ((storey + 1) / count) * (yEnd - yStart);
      const y = (y0 + y1) / 2;
      const height = y1 - y0;
      const width = width0 + (width1 - width0) * (storey / Math.max(1, count - 1));
      for (const pylon of pylons) {
        const [cx, cz] = eiffelLegCenter(pylon.sx, pylon.sz, y);
        const [rx, rz] = eiffelLean(pylon.sx, pylon.sz, y0, y1);
        const lower = group === 'leg' && y0 < EIFFEL_PLATFORM_1;
        const mid = group === 'leg' && !lower;
        const farMidLag = mid && pylon.sz === 1 ? 0.22 : 0;
        const storeySpan = farMidLag ? span * 0.55 : span;
        const start = origin
          + storey * (storeySpan / count)
          + pylon.index * 0.01
          + 0.0002 * storey
          + farMidLag;
        const half = width * 0.5;
        const cols = width >= 5.2 ? 2 : 1;
        const faceW = half * 2 * 0.94;
        const panelW = faceW / cols;
        const stacksHere = lower || mid ? 1 : height >= panelW * 1.85 ? 2 : 1;
        const post = lower ? 1.58 : mid ? 1.4 : 1.16;
        const ownedLeg = group === 'shaft' || group === 'lantern' ? 'axis' : pylon.key;
        const storeyId = storeyOffset + storey;
        for (const [cornerIndex, corner] of CORNERS.entries()) {
          push(
            `chord-${group}-${pylon.key}-${storeyId}-${cornerIndex}`,
            group,
            'chord',
            ownedLeg,
            storeyId,
            [post, height * 0.98, post],
            [cx + corner[0] * half, y, cz + corner[1] * half],
            [rx, 0, rz],
            'dark-iron',
            (pylon.index + cornerIndex) % 4,
            start + cornerIndex * 0.0006,
            duration,
          );
        }
        let panelIndex = 0;
        const colMark = (col: number) => (col === 0 ? '' : col === 1 ? '-b' : '-c');
        const tag = (base: string, col: number, stack: number) => {
          const stackMark = stack === 1 ? '2' : '';
          return `${base}${stackMark}${colMark(col)}`;
        };
        const faces: Array<{
          horiz: string;
          diag: string;
          alongX: boolean;
          sx: number;
          sz: number;
        }> = [
          { horiz: 'hx-p', diag: 'dx-p', alongX: false, sx: 1, sz: 0 },
          { horiz: 'hx-n', diag: 'dx-n', alongX: false, sx: -1, sz: 0 },
          { horiz: 'hz-p', diag: 'dz-p', alongX: true, sx: 0, sz: 1 },
          { horiz: 'hz-n', diag: 'dz-n', alongX: true, sx: 0, sz: -1 },
        ];
        for (const [faceIndex, face] of faces.entries()) {
          const outward = group === 'shaft' || group === 'lantern'
            || (face.sx !== 0 && face.sx === pylon.sx)
            || (face.sz !== 0 && face.sz === pylon.sz);
          const cameraFacing = group === 'leg' && face.sz === -1 && pylon.sz === -1;
          const backOfNear = lower && pylon.sz === -1 && face.sz === 1;
          const farNorth = group === 'leg' && pylon.sz === 1 && face.sz === -1;
          const innerNear = group === 'leg' && pylon.sz === -1 && face.sx === -pylon.sx;
          if (backOfNear || farNorth || innerNear) continue;
          const dense = outward || cameraFacing;
          const faceCols = cameraFacing && lower ? 1 : dense || group !== 'leg' ? cols : 1;
          const faceStacks = dense || group !== 'leg' ? stacksHere : 1;
          const mid = group === 'leg' && !lower;
          const shaftLow = group === 'shaft' && y0 < 180;
          const heavy = lower || mid || shaftLow;
          const northFace = face.sz === -1;
          const northLower = lower && northFace;
          const bar = northLower ? 1.26 : lower || mid ? 1.18 : heavy || group === 'shaft' ? 0.94 : 0.6;
          const rail = northLower ? 1.26 : lower || mid ? 1.28 : heavy || group === 'shaft' ? 1.02 : 0.78;
          const braceMat: EiffelPart['material'] = heavy || group === 'shaft' ? 'dark-iron' : 'iron';
          if (faceCols === 2) {
            const inset = 0.42;
            const mx = face.alongX ? cx : cx + face.sx * (half - inset);
            const mz = face.alongX ? cz + face.sz * (half - inset) : cz;
            push(
              `chord-${group}-${pylon.key}-${storeyId}-mullion-${face.horiz}`,
              group,
              'chord',
              ownedLeg,
              storeyId,
              [post, height * 0.98, post],
              [mx, y, mz],
              [rx, 0, rz],
              'dark-iron',
              pylon.index % 4,
              start + 0.002 + faceIndex * 0.0003,
              duration,
            );
          }
          const panelW = faceW / faceCols;
          const bayH = height / faceStacks;
          const rise = bayH * 0.88;
          const diagLen = Math.hypot(panelW, rise);
          const tilt = Math.atan2(rise, panelW);
          for (let col = 0; col < faceCols; col += 1) {
            const along = ((col + 0.5) / faceCols - 0.5) * faceW;
            for (let stack = 0; stack < faceStacks; stack += 1) {
              const yMid = y0 + (stack + 0.5) * bayH;
              const yaw = col * 0.011 + stack * 0.007 + faceIndex * 0.003;
              const hx = face.alongX ? cx + along : cx + face.sx * half;
              const hz = face.alongX ? cz + face.sz * half : cz + along;
              const horizDim: Vec3 = face.alongX ? [panelW, rail, rail] : [rail, rail, panelW];
              const diagDim: Vec3 = face.alongX ? [diagLen, bar, bar] : [bar, bar, diagLen];
              const horizRot: Vec3 = face.alongX
                ? [rx * 0.08, yaw, rz * 0.16]
                : [rx * 0.16, yaw, rz * 0.08];
              const tiltA: Vec3 = face.alongX
                ? [rx * 0.05, yaw, tilt + rz * 0.08]
                : [tilt + rx * 0.08, yaw, rz * 0.05];
              const tiltB: Vec3 = face.alongX
                ? [rx * 0.05, yaw + 0.006, -tilt + rz * 0.08]
                : [-tilt + rx * 0.08, yaw + 0.006, rz * 0.05];
              const delay = 0.0016 + panelIndex * 0.00012;
              const pushBrace = (id: string, dim: Vec3, rot: Vec3, yOff: number) => {
                push(
                  `brace-${id}-${group}-${pylon.key}-${storeyId}`,
                  group,
                  'brace',
                  ownedLeg,
                  storeyId,
                  dim,
                  [hx, yMid + yOff, hz],
                  rot,
                  braceMat,
                  (pylon.index + panelIndex) % 4,
                  start + delay,
                  duration * 0.9,
                );
                panelIndex += 1;
              };
              if (!cameraFacing) {
                pushBrace(tag(face.horiz, col, stack), horizDim, horizRot, 0);
              }
              const skipSeineBay = cameraFacing && lower && storey % 2 === 1;
              if (!skipSeineBay) {
                const diagLetter = stack === 0 ? (['a', 'b'] as const) : (['c', 'd'] as const);
                pushBrace(`${face.diag}${diagLetter[0]}${colMark(col)}`, diagDim, tiltA, 0.05);
                pushBrace(`${face.diag}${diagLetter[1]}${colMark(col)}`, diagDim, tiltB, 0.1);
              }
            }
            if (faceStacks === 2) {
              const joinY = y0 + bayH;
              const joinDim: Vec3 = face.alongX ? [panelW, 0.98, 0.98] : [0.98, 0.98, panelW];
              const hx = face.alongX ? cx + along : cx + face.sx * half;
              const hz = face.alongX ? cz + face.sz * half : cz + along;
              const yaw = col * 0.011 + 0.02 + faceIndex * 0.003;
              const joinRot: Vec3 = face.alongX
                ? [rx * 0.08, yaw, rz * 0.16]
                : [rx * 0.16, yaw, rz * 0.08];
              push(
                `brace-${face.horiz}-join${colMark(col)}-${group}-${pylon.key}-${storeyId}`,
                group,
                'brace',
                ownedLeg,
                storeyId,
                joinDim,
                [hx, joinY, hz],
                joinRot,
                'iron',
                (pylon.index + col + faceIndex) % 4,
                start + 0.0014 + panelIndex * 0.00012,
                duration * 0.9,
              );
              panelIndex += 1;
            }
          }
          if (lower || mid || group === 'shaft') {
            const belt = rail * 1.12;
            const beltDim: Vec3 = face.alongX ? [faceW, belt, belt] : [belt, belt, faceW];
            const bx = face.alongX ? cx : cx + face.sx * half;
            const bz = face.alongX ? cz + face.sz * half : cz;
            const beltRot: Vec3 = face.alongX
              ? [rx * 0.08, faceIndex * 0.004, rz * 0.16]
              : [rx * 0.16, faceIndex * 0.004, rz * 0.08];
            push(
              `brace-${face.horiz}-belt-${group}-${pylon.key}-${storeyId}`,
              group,
              'brace',
              ownedLeg,
              storeyId,
              beltDim,
              [bx, y1, bz],
              beltRot,
              'dark-iron',
              pylon.index % 4,
              start + 0.0022 + faceIndex * 0.0002,
              duration * 0.9,
            );
          }
        }
      }
    }
  };

  addLegStoreys(5, 8.6, EIFFEL_PLATFORM_1 - 1.2, 0.024, 0.09, 0.0045, 'leg', 0, 16.8, 8.2);
  const lastLowerSeated = parts
    .filter((part) => part.group === 'leg' && part.storey >= 0 && part.storey < 8)
    .reduce((latest, part) => Math.max(latest, part.start + part.duration), 0);
  addLegStoreys(10, EIFFEL_PLATFORM_1 + 1.4, EIFFEL_PLATFORM_2 - 1.1, lastLowerSeated + 0.002, 0.15, 0.0045, 'leg', 8, 6.6, 4.4);
  const lastSeineMidSeated = parts
    .filter((part) => part.group === 'leg' && (part.leg === 'se' || part.leg === 'sw') && part.storey >= 8 && part.storey < 18)
    .reduce((latest, part) => Math.max(latest, part.start + part.duration), 0);
  const lastMidSeated = parts
    .filter((part) => part.group === 'leg' && part.storey >= 8 && part.storey < 18)
    .reduce((latest, part) => Math.max(latest, part.start + part.duration), 0);

  const archFaces: Array<{ towardX: number; towardZ: number; yaw: number; north: boolean; side: boolean }> = [
    { towardX: 0, towardZ: 1, yaw: 0, north: false, side: false },
    { towardX: 1, towardZ: 0, yaw: Math.PI / 2, north: false, side: true },
    { towardX: 0, towardZ: -1, yaw: 0, north: true, side: false },
    { towardX: -1, towardZ: 0, yaw: Math.PI / 2, north: false, side: true },
  ];
  const archCount = 12;
  const archPoint = eiffelArchPoint;
  for (const [archIndex, face] of archFaces.entries()) {
    const origin = face.north ? 0.218 : face.side ? 0.268 : 0.45;
    const segDt = face.north ? 0.0018 : face.side ? 0.002 : 0.005;
    const chordDur = face.north ? 0.02 : face.side ? 0.016 : 0.014;
    for (const [chord, radial, thick] of [
      ['o', 11.8, 1.8],
      ['i', 7.4, 1.4],
    ] as const) {
      for (let segment = 0; segment < archCount; segment += 1) {
        const a = archPoint(face.towardX, face.towardZ, face.yaw, segment / archCount, radial);
        const b = archPoint(face.towardX, face.towardZ, face.yaw, (segment + 1) / archCount, radial);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dy, dz);
        const pitch = Math.atan2(dy, Math.hypot(dx, dz));
        const crown = face.north && segment >= 4 && segment < 8;
        push(
          `arch-${archIndex}-${chord}-${segment}`,
          'arch',
          'arch',
          'axis',
          segment,
          [len, thick, thick],
          [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2],
          [pitch, face.yaw, 0],
          'dark-iron',
          archIndex,
          (crown ? 0.335 : origin) + segment * segDt + (chord === 'i' ? 0.004 : 0),
          chordDur,
        );
      }
    }
    for (let joint = 0; joint < archCount; joint += 1) {
      const u = joint / archCount;
      const outer = archPoint(face.towardX, face.towardZ, face.yaw, u, 11.8);
      const inner = archPoint(face.towardX, face.towardZ, face.yaw, u, 7.4);
      const dx = outer.x - inner.x;
      const dy = outer.y - inner.y;
      const dz = outer.z - inner.z;
      const len = Math.max(0.8, Math.hypot(dx, dy, dz));
      const dim: Vec3 = Math.abs(dz) >= Math.abs(dx)
        ? [1.6, 1.6, len]
        : [len, 1.6, 1.6];
      const crown = face.north && joint >= 4 && joint < 8;
      push(
        `arch-${archIndex}-w-${joint}`,
        'arch',
        'arch',
        'axis',
        joint,
        dim,
        [(outer.x + inner.x) / 2, (outer.y + inner.y) / 2, (outer.z + inner.z) / 2],
        [0, face.yaw, 0],
        'dark-iron',
        archIndex,
        (crown ? 0.335 : origin) + 0.008 + joint * (face.north ? 0.0018 : face.side ? 0.002 : 0.006),
        face.north ? 0.014 : face.side ? 0.012 : 0.01,
      );
    }
  }

  for (const platform of [
    { y: EIFFEL_PLATFORM_1, half: 34, start: 0.345, prefix: 'p1', storey: 0 },
    { y: EIFFEL_PLATFORM_2, half: 16, start: Math.max(lastSeineMidSeated + 0.002, 0.34), prefix: 'p2', storey: 1 },
  ]) {
    for (let gx = -2; gx <= 2; gx += 1) {
      for (let gz = -2; gz <= 2; gz += 1) {
        if (Math.abs(gx) + Math.abs(gz) === 0) continue;
        if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue;
        const x = gx * (platform.half / 2.2);
        const z = gz * (platform.half / 2.2);
        push(
          `girder-${platform.prefix}-${gx}-${gz}`,
          'platform',
          'girder',
          'axis',
          platform.storey,
          [platform.half / 2.2, platform.prefix === 'p1' ? 2.2 : 3.4, platform.prefix === 'p1' ? 2.2 : 2.8],
          [x, platform.y, z],
          [0, gx === 0 ? Math.PI / 2 : 0, 0],
          'dark-iron',
          Math.abs(gx + gz) % 4,
          platform.start + (gx + 2) * 0.003 + (gz + 2) * 0.002,
          0.018,
        );
      }
    }
  }

  const deckHalf = 30;
  for (const [deckIndex, deck] of [
    { id: 'n', x: 0, z: deckHalf, yaw: 0 },
    { id: 's', x: 0, z: -deckHalf, yaw: 0 },
    { id: 'e', x: deckHalf, z: 0, yaw: Math.PI / 2 },
    { id: 'w', x: -deckHalf, z: 0, yaw: Math.PI / 2 },
  ].entries()) {
    push(
      `girder-p1-deck-${deck.id}`,
      'platform',
      'girder',
      'axis',
      0,
      [54, 2.2, 2.4],
      [deck.x, EIFFEL_PLATFORM_1, deck.z],
      [0, deck.yaw, 0],
      'dark-iron',
      deckIndex,
      0.358 + deckIndex * 0.002,
      0.016,
    );
  }

  addLegStoreys(18, EIFFEL_PLATFORM_2 + 1.2, EIFFEL_PLATFORM_3 - 2, Math.max(lastMidSeated + 0.002, 0.48), 0.16, 0.0045, 'shaft', 18, 14.4, 5.2);
  const shaftEnd = parts
    .filter((part) => part.group === 'shaft')
    .reduce((latest, part) => Math.max(latest, part.start + part.duration), 0);
  addLegStoreys(4, EIFFEL_PLATFORM_3, EIFFEL_HEIGHT - 2, shaftEnd + 0.002, 0.08, 0.0045, 'lantern', 36, 4.8, 2.2);

  return {
    seed: 'eiffel-kœchlin-v1',
    height: EIFFEL_HEIGHT,
    base: EIFFEL_BASE,
    platform1: EIFFEL_PLATFORM_1,
    platform2: EIFFEL_PLATFORM_2,
    platform3: EIFFEL_PLATFORM_3,
    wagonBedHeight: EIFFEL_WAGON_BED,
    maxActive: EIFFEL_MAX_ACTIVE,
    parts,
    routes,
    layers: LAYERS.map((layer) => ({ ...layer })),
    keepOuts: [
      { id: 'tower-footprint', minX: -110, maxX: 110, minZ: -110, maxZ: 110 },
      { id: 'east-yard', minX: 128, maxX: 198, minZ: 12, maxZ: 58 },
    ],
  };
}

export const EIFFEL_CONSTRUCTION = createEiffelConstructionPlan();
