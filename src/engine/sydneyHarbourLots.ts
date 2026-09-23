import { mulberry32 } from './random';
import {
  SYDNEY_HARBOUR_CONTEXT,
  sydneyDistanceToRoute,
  type SydneyFootprint,
} from '../data/sydneyHarbourContext';
import { sydneyLandmarkFootprint } from './sydneyLandmarks';
import { sydneyGroundKindAt, sydneyTerrainHeightAt } from './sydneyTerrain';

/** `block` is the low outer-suburb mass that carries the city into the haze. */
export type SydneyHarbourKind =
  | 'shed'
  | 'office'
  | 'terrace'
  | 'fig'
  | 'block'
  | 'grove';
export interface SydneyHarbourLot {
  kind: SydneyHarbourKind;
  form: 'villa' | 'row' | 'flats';
  district: string;
  canopyGroup?: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  storeys: number;
  width: number;
  depth: number;
  supportY: number;
  foundationBottom: number;
  footprint: SydneyFootprint;
}
export function sydneyFootprintsOverlap(
  a: SydneyFootprint,
  b: SydneyFootprint,
  margin = 0,
): boolean {
  return (
    a.minX < b.maxX + margin &&
    a.maxX > b.minX - margin &&
    a.minZ < b.maxZ + margin &&
    a.maxZ > b.minZ - margin
  );
}
/** Landmark bounds with a 3 m working margin; lots never overlap them. */
const SYDNEY_LANDMARK_FOOTPRINTS: readonly SydneyFootprint[] =
  SYDNEY_HARBOUR_CONTEXT.landmarks.map((l) => sydneyLandmarkFootprint(l, 3));
/** Unit direction of the nearest ground street, for block-aligned lots. */
function streetYawAt(x: number, z: number): number {
  let best = Infinity,
    yaw = 0;
  for (const r of SYDNEY_HARBOUR_CONTEXT.routes) {
    if (r.mode !== 'ground') continue;
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1]!,
        b = r.points[i]!;
      const d = sydneyDistanceToRoute(x, z, {
        ...r,
        points: [a, b],
      });
      if (d < best) {
        best = d;
        yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      }
    }
  }
  return yaw;
}
function tryLot(
  lots: SydneyHarbourLot[],
  kind: SydneyHarbourKind,
  district: string,
  x: number,
  z: number,
  yaw: number,
  scale: number,
  storeys: number,
  width: number,
  depth: number,
  form: SydneyHarbourLot['form'] = 'villa',
  maxFall = 2.4,
): void {
  const c = Math.abs(Math.cos(yaw)),
    s = Math.abs(Math.sin(yaw));
  const hw = (width * c + depth * s) / 2,
    hd = (depth * c + width * s) / 2;
  const footprint = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
  const districtBounds = SYDNEY_HARBOUR_CONTEXT.districts.find(
    (d) => d.id === district,
  )!.footprint;
  if (
    footprint.minX < districtBounds.minX ||
    footprint.maxX > districtBounds.maxX ||
    footprint.minZ < districtBounds.minZ ||
    footprint.maxZ > districtBounds.maxZ
  )
    return;
  if (
    SYDNEY_HARBOUR_CONTEXT.protectedFootprints.some((f) =>
      sydneyFootprintsOverlap(f, footprint, 3),
    )
  )
    return;
  if (
    SYDNEY_HARBOUR_CONTEXT.routes.some(
      (r) =>
        sydneyDistanceToRoute(x, z, r) < r.width / 2 + Math.hypot(hw, hd) + 2,
    ) ||
    SYDNEY_HARBOUR_CONTEXT.viaducts.some(
      (v) =>
        sydneyDistanceToRoute(x, z, v as never) <
        v.width / 2 + Math.hypot(hw, hd) + 2,
    )
  )
    return;
  if (
    SYDNEY_LANDMARK_FOOTPRINTS.some((f) =>
      sydneyFootprintsOverlap(f, footprint, 0),
    )
  )
    return;
  if (
    lots.some((l) => {
      const adjoiningGardenCrowns =
        kind === 'fig' &&
        district === 'garden' &&
        l.kind === 'fig' &&
        l.district === 'garden';
      if (adjoiningGardenCrowns && Math.hypot(l.x - x, l.z - z) < 6)
        return true;
      return sydneyFootprintsOverlap(
        l.footprint,
        footprint,
        adjoiningGardenCrowns ? -3 : kind === 'fig' ? 0.5 : 2,
      );
    })
  )
    return;
  const heights = [
    [x, z],
    [x - hw, z - hd],
    [x + hw, z - hd],
    [x - hw, z + hd],
    [x + hw, z + hd],
  ].map(([a, b]) => sydneyTerrainHeightAt(a!, b!));
  if (Math.min(...heights) < 1) return;
  const supportY = kind === 'fig' ? heights[0]! : Math.max(...heights);
  if (Math.max(...heights) - Math.min(...heights) > maxFall) return;
  lots.push({
    kind,
    form,
    district,
    x,
    z,
    yaw,
    scale,
    storeys,
    width,
    depth,
    supportY,
    foundationBottom: Math.min(...heights),
    footprint,
  });
}
type GardenPoint = readonly [number, number];
function pointInGardenPolygon(
  x: number,
  z: number,
  polygon: readonly GardenPoint[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
function gardenFootprintTouchesPolygon(
  footprint: SydneyFootprint,
  polygon: readonly GardenPoint[],
): boolean {
  const corners: GardenPoint[] = [
    [footprint.minX, footprint.minZ],
    [footprint.maxX, footprint.minZ],
    [footprint.maxX, footprint.maxZ],
    [footprint.minX, footprint.maxZ],
  ];
  if (corners.some(([x, z]) => pointInGardenPolygon(x, z, polygon)))
    return true;
  if (
    polygon.some(
      ([x, z]) =>
        x >= footprint.minX &&
        x <= footprint.maxX &&
        z >= footprint.minZ &&
        z <= footprint.maxZ,
    )
  )
    return true;
  const cross = (a: GardenPoint, b: GardenPoint, c: GardenPoint) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < polygon.length; i++)
    for (let j = 0; j < 4; j++) {
      const a = polygon[i]!,
        b = polygon[(i + 1) % polygon.length]!,
        c = corners[j]!,
        d = corners[(j + 1) % 4]!;
      if (
        cross(a, b, c) * cross(a, b, d) < 0 &&
        cross(c, d, a) * cross(c, d, b) < 0
      )
        return true;
    }
  return false;
}

function replaceBotanicGarden(lots: SydneyHarbourLot[]): SydneyHarbourLot[] {
  const result = lots.filter((l) => l.district !== 'garden');
  const plan = SYDNEY_HARBOUR_CONTEXT.gardenComposition;
  const rand = mulberry32(plan.seed);
  let placed = 0;
  for (const group of plan.canopyGroups) {
    const polygon = group.polygon as readonly GardenPoint[];
    for (
      let attempt = 0;
      attempt < 3600 &&
      placed <
        Math.ceil(
          (plan.maxInstances * (plan.canopyGroups.indexOf(group) + 1)) /
            plan.canopyGroups.length,
        );
      attempt++
    ) {
      const centre =
          group.plantingCenters[attempt % group.plantingCenters.length]!,
        angle = rand() * Math.PI * 2,
        r = Math.sqrt(rand()) * group.plantingRadius;
      const x = centre[0] + Math.cos(angle) * r,
        z = centre[1] + Math.sin(angle) * r;
      if (sydneyGroundKindAt(x, z) !== 'garden') continue;
      const scale =
        group.scaleRange[0] +
        rand() * (group.scaleRange[1] - group.scaleRange[0]);
      const yaw = rand() * Math.PI * 2;
      const width = plan.canopyEnvelope.width * scale,
        depth = plan.canopyEnvelope.depth * scale;
      const c = Math.abs(Math.cos(yaw)),
        s = Math.abs(Math.sin(yaw));
      const hw = (width * c + depth * s) / 2,
        hd = (depth * c + width * s) / 2;
      const footprint = {
        minX: x - hw,
        maxX: x + hw,
        minZ: z - hd,
        maxZ: z + hd,
      };
      if (
        ![
          [x - hw, z - hd],
          [x + hw, z - hd],
          [x + hw, z + hd],
          [x - hw, z + hd],
        ].every(([a, b]) => pointInGardenPolygon(a!, b!, polygon))
      )
        continue;
      if (gardenFootprintTouchesPolygon(footprint, plan.lawn.polygon)) continue;
      const before = result.length;
      tryLot(result, 'fig', 'garden', x, z, yaw, scale, 1, width, depth);
      if (result.length > before) {
        result[result.length - 1]!.canopyGroup = group.id;
        placed++;
      }
    }
  }
  for (const adjustment of plan.frontageRelocations) {
    const index = result.findIndex(
      (l) =>
        l.district === 'garden' &&
        Math.hypot(l.x - adjustment.from[0], l.z - adjustment.from[1]) < 0.01,
    );
    if (index < 0)
      throw new Error('Authored garden relocation source is missing');
    const original = result.splice(index, 1)[0]!;
    const previousLength = result.length;
    tryLot(
      result,
      'fig',
      'garden',
      adjustment.to[0],
      adjustment.to[1],
      adjustment.yaw,
      original.scale,
      original.storeys,
      original.width,
      original.depth,
    );
    if (result.length !== previousLength + 1)
      throw new Error('Authored garden relocation violates site clearance');
    const moved = result.pop()!;
    moved.canopyGroup = adjustment.group;
    result.splice(index, 0, moved);
  }
  return result;
}

/** Street-aware district fabric; no anonymous overlapping grids or centre-only clearance. */
export function createSydneyHarbourLots(): SydneyHarbourLot[] {
  const rand = mulberry32('sydney-harbour-context-1966-v2');
  const lots: SydneyHarbourLot[] = [];
  for (const district of SYDNEY_HARBOUR_CONTEXT.districts) {
    if (
      district.id === 'point' ||
      district.character === 'terrace' ||
      district.character === 'outer'
    )
      continue;
    const { minX, maxX, minZ, maxZ } = district.footprint;
    if (district.character === 'city') {
      // 1960s city blocks: mostly 6–12 storeys under the lifted height limit,
      // rare towers, every lot square to its nearest street.
      for (let z = minZ + 12; z < maxZ - 8; z += 29)
        for (let x = minX + 12; x < maxX - 8; x += 29) {
          if (rand() < 0.1) continue;
          const px = x + (rand() - 0.5) * 9,
            pz = z + (rand() - 0.5) * 9;
          const r = rand();
          const storeys =
            r < 0.14
              ? 3 + Math.floor(rand() * 2)
              : r < 0.9
                ? 5 + Math.floor(rand() * 7)
                : 12 + Math.floor(rand() * 9);
          tryLot(
            lots,
            'office',
            district.id,
            px,
            pz,
            streetYawAt(px, pz),
            0.9 + rand() * 0.2,
            storeys,
            17 + rand() * 13,
            13 + rand() * 10,
            'villa',
            3.2,
          );
        }
      continue;
    }
    const step = district.character === 'garden' ? 35 : 26;
    for (let z = minZ + 15; z < maxZ - 10; z += step) {
      for (let x = minX + 14; x < maxX - 10; x += step) {
        const kind =
          district.character === 'garden'
            ? 'fig'
            : district.character === 'quay'
              ? 'shed'
              : 'office';
        if (rand() < (kind === 'fig' ? 0.08 : 0.18)) continue;
        const scale = 0.85 + rand() * 0.3;
        const tall = kind === 'office' && rand() > 0.91;
        const storeys =
          kind === 'office'
            ? tall
              ? 12 + Math.floor(rand() * 6)
              : 2 + Math.floor(rand() * 5)
            : 2;
        const width =
          kind === 'fig'
            ? 18 * scale
            : kind === 'office'
              ? 13 + rand() * 9
              : kind === 'shed'
                ? 19 * scale
                : 9 + rand() * 6;
        const depth =
          kind === 'fig'
            ? 18 * scale
            : kind === 'office'
              ? 12 + rand() * 7
              : kind === 'shed'
                ? 10 * scale
                : 11 + rand() * 5;
        tryLot(
          lots,
          kind,
          district.id,
          x + (rand() - 0.5) * 13,
          z + (rand() - 0.5) * 13,
          0,
          scale,
          storeys,
          width,
          depth,
        );
      }
    }
  }
  // Authored street-front clusters leave garden breaks; each block mixes actual
  // long terrace rows, hipped villas and taller low flats rather than a hut grid.
  for (const cluster of SYDNEY_HARBOUR_CONTEXT.residentialClusters) {
    const route = SYDNEY_HARBOUR_CONTEXT.routes.find(
      (r) => r.id === cluster.street,
    )!;
    const a = route.points[0]!,
      b = route.points[route.points.length - 1]!;
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    let distance = cluster.start * length;
    let index = 0;
    while (distance < cluster.end * length) {
      const form: SydneyHarbourLot['form'] = cluster.forms
        ? cluster.forms[index % cluster.forms.length]!
        : index % 4 === 0
          ? 'row'
          : index % 4 === 2
            ? 'flats'
            : 'villa';
      const width = form === 'row' ? 25 : form === 'flats' ? 18 : 12;
      const depth = form === 'row' ? 10 : form === 'flats' ? 17 : 15;
      for (const side of [-1, 1]) {
        if (rand() < 0.17) continue;
        const u = distance / length,
          setback =
            route.width / 2 + Math.hypot(width, depth) / 2 + 5 + rand() * 4;
        tryLot(
          lots,
          'terrace',
          cluster.district,
          a[0] + dx * u - (dz / length) * setback * side,
          a[1] + dz * u + (dx / length) * setback * side,
          -Math.atan2(dz, dx),
          0.9 + rand() * 0.2,
          form === 'flats'
            ? cluster.district === 'potts-point'
              ? 5 + Math.floor(rand() * 5)
              : 3
            : form === 'row'
              ? 2
              : 1,
          width,
          depth,
          form,
        );
      }
      distance += width + 6 + rand() * 10;
      index++;
    }
  }
  // Contiguous tree gardens separate the street clusters and continue uphill.
  for (const [district, cx, cz, radius, count] of [
    ['kirribilli', 240, -810, 60, 16],
    ['kirribilli', -40, -890, 44, 12],
    ['milsons', -340, -1020, 35, 8],
    ['north-ridge', -160, -1210, 62, 14],
    ['north-ridge', 70, -1420, 65, 14],
    ['north-ridge', -430, -1460, 64, 12],
  ] as const)
    for (let i = 0; i < count * 4; i++) {
      const angle = rand() * Math.PI * 2,
        r = Math.sqrt(rand()) * radius,
        scale = 0.85 + rand() * 0.4;
      tryLot(
        lots,
        'fig',
        district,
        cx + Math.cos(angle) * r,
        cz + Math.sin(angle) * r,
        0,
        scale,
        1,
        18 * scale,
        18 * scale,
      );
    }
  // Trees inhabit streets and slopes without intruding on the worksite or harbour.
  for (let i = 0; i < 50; i++) {
    const north = i < 30;
    const x = -160 + rand() * 500,
      z = north ? -780 - rand() * 250 : 650 + rand() * 400;
    tryLot(
      lots,
      'fig',
      north ? 'kirribilli' : 'cbd',
      x,
      z,
      rand() * Math.PI,
      0.9 + rand() * 0.4,
      1,
      18,
      18,
    );
  }
  // Royal Botanic Garden east of the accepted garden groups, Mrs Macquaries
  // Point and the Domain: clustered groves with open lawns between them,
  // and leafy north-shore streets. Low-detail canopies for the distant camera.
  const grove = (x: number, z: number, cell: number) => {
    const a = Math.sin(x / cell + Math.sin(z / (cell * 1.7)) * 1.9),
      b = Math.cos(z / (cell * 0.9) - Math.sin(x / (cell * 1.3)) * 1.4);
    return 0.5 + 0.5 * a * b;
  };
  for (let z = 180; z < 1420; z += 21)
    for (let x = -150; x < 780; x += 21) {
      const px = x + (rand() - 0.5) * 14,
        pz = z + (rand() - 0.5) * 14,
        scale = 0.75 + rand() * 0.5;
      if (sydneyGroundKindAt(px, pz) !== 'garden') continue;
      const inGarden = px > -180 && px < 180 && pz > 165 && pz < 650;
      if (inGarden || grove(px, pz, 70) < 0.64) continue;
      tryLot(lots, 'grove', 'outer', px, pz, rand() * Math.PI, scale, 1, 15 * scale, 15 * scale);
    }
  for (let z = -2300; z < -560; z += 30)
    for (let x = -1500; x < 700; x += 30) {
      const px = x + (rand() - 0.5) * 20,
        pz = z + (rand() - 0.5) * 20,
        scale = 0.8 + rand() * 0.5;
      if (sydneyGroundKindAt(px, pz) !== 'north' || grove(px, pz, 90) < 0.72) continue;
      tryLot(lots, 'grove', 'outer', px, pz, rand() * Math.PI, scale, 1, 15 * scale, 15 * scale);
    }
  // Outer suburbs carry the city into the haze: warehouses west, terraces and
  // flats south/east, low houses on the north shore. Named districts keep
  // their own fabric.
  const named = SYDNEY_HARBOUR_CONTEXT.districts.filter(
    (d) => d.character !== 'outer' && d.character !== 'garden',
  );
  for (let z = -2400; z <= 2400; z += 66)
    for (let x = -2400; x <= 2400; x += 66) {
      const px = x + (rand() - 0.5) * 30,
        pz = z + (rand() - 0.5) * 30;
      const r = rand(),
        size = rand(),
        yawJitter = (rand() - 0.5) * 0.3;
      const radius = Math.hypot(px, pz);
      if (radius < 900 || radius > 2450 || r < 0.12) continue;
      const kind = sydneyGroundKindAt(px, pz);
      if (kind !== 'city' && kind !== 'north') continue;
      if (
        named.some(
          (d) =>
            px > d.footprint.minX &&
            px < d.footprint.maxX &&
            pz > d.footprint.minZ &&
            pz < d.footprint.maxZ,
        )
      )
        continue;
      const north = kind === 'north',
        west = px < -1150;
      const width = north ? 16 + size * 12 : west ? 34 + size * 26 : 24 + size * 22,
        depth = north ? 12 + size * 8 : west ? 26 + size * 18 : 18 + size * 14;
      const storeys = north
        ? 1 + Math.floor(r * 2.4)
        : west
          ? 3 + Math.floor(r * 5)
          : px > 600
            ? 4 + Math.floor(r * 7)
            : 2 + Math.floor(r * 6);
      tryLot(
        lots,
        'block',
        'outer',
        px,
        pz,
        streetYawAt(px, pz) + yawJitter,
        1,
        storeys,
        width,
        depth,
        'villa',
        8,
      );
    }
  // Garden groups occupy the mapped southern peninsula; all districts share
  // the same terrain support and collision rejection.
  return replaceBotanicGarden(lots);
}
export const SYDNEY_HARBOUR_LOTS = createSydneyHarbourLots();
export function sydneyHarbourLotsOf(
  kind: SydneyHarbourKind,
): SydneyHarbourLot[] {
  return SYDNEY_HARBOUR_LOTS.filter((lot) => lot.kind === kind);
}
