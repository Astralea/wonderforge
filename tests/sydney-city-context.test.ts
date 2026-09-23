import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, Points, Vector3 } from 'three';
import {
  SYDNEY_HARBOUR_CONTEXT,
  sydneyDistanceToRoute,
} from '../src/data/sydneyHarbourContext';
import { sydneyBoatsAt } from '../src/engine/sydneyBoats';
import {
  createSydneyHarbourLots,
  sydneyFootprintsOverlap,
} from '../src/engine/sydneyHarbourLots';
import {
  sydneyContextPrimitives,
  sydneyLampPositions,
  sydneyLandmarkFootprint,
  sydneyLandmarkPrimitives,
  sydneyLandmarkSupport,
  sydneyViaductCentreline,
} from '../src/engine/sydneyLandmarks';
import {
  SYDNEY_BRIDGE,
  sydneyGroundKindAt,
  sydneyReliefAt,
  sydneyTerrainHeightAt,
} from '../src/engine/sydneyTerrain';
import { SydneyEnvironment } from '../src/render/three/SydneyEnvironment';
import { SYDNEY_CITY_NIGHT } from '../src/render/three/sydneyFacade';

const C = SYDNEY_HARBOUR_CONTEXT;
const samples = (l: (typeof C.landmarks)[number], inset = 0.5) => {
  const c = Math.cos(l.yaw),
    s = Math.sin(l.yaw),
    out: [number, number][] = [];
  for (const u of [-inset, 0, inset])
    for (const v of [-inset, 0, inset]) {
      const lx = u * l.width,
        lz = v * l.depth;
      out.push([l.x + c * lx + s * lz, l.z - s * lx + c * lz]);
    }
  return out;
};

describe('Sydney city context pass (Spec 13, 2026-09-24)', () => {
  it('declares sourced period landmarks standing through 1959–1973', () => {
    const ids = new Set<string>();
    for (const l of C.landmarks) {
      expect(ids.has(l.id), l.id).toBe(false);
      ids.add(l.id);
      expect(l.built, l.id).toBeLessThanOrEqual(1973);
      if (l.demolished) expect(l.demolished, l.id).toBeGreaterThan(1973);
      expect(C.sources.some((s) => s.id === l.source), l.id).toBe(true);
      expect(l.placement.length, l.id).toBeGreaterThan(8);
    }
    for (const id of [
      'government-house',
      'amp-building',
      'australia-square',
      'overseas-passenger-terminal',
      'finger-wharf',
      'hammerhead-crane',
      'fort-denison',
    ])
      expect(ids.has(id), id).toBe(true);
    expect(C.exclusions).toContain('1976 AMP tower');
  });

  it('grounds, floats or piles every landmark according to the shared sampler', () => {
    for (const l of C.landmarks) {
      const heights = samples(l).map(([x, z]) => sydneyTerrainHeightAt(x, z));
      if (l.support === 'ground')
        expect(Math.min(...heights), l.id).toBeGreaterThan(1);
      if (l.support === 'water' || l.support === 'footing')
        expect(Math.max(...heights), l.id).toBe(0);
      if (l.support === 'piles') {
        expect(heights.some((h) => h === 0), l.id).toBe(true);
        expect(heights.some((h) => h > 1), l.id).toBe(true);
      }
    }
    // No ground building floats: its lowest solid reaches the lowest ground.
    for (const l of C.landmarks.filter((x) => x.support === 'ground')) {
      const bottom = Math.min(...sydneyLandmarkPrimitives(l).map((p) => ('y' in p ? p.y : Infinity)));
      expect(bottom, l.id).toBeLessThanOrEqual(sydneyLandmarkSupport(l).bottom + 0.5);
    }
    for (const p of sydneyContextPrimitives())
      if (p.kind !== 'ribbon') {
        expect(Number.isFinite(p.x + p.y + p.z + p.h), p.kind).toBe(true);
        expect(p.h).toBeGreaterThan(0);
      }
  });

  it('keeps landmarks out of carriageways and lots out of landmarks and the viaduct', () => {
    for (const l of C.landmarks)
      for (const [x, z] of samples(l, 0.5))
        for (const r of C.routes.filter((route) => route.mode === 'ground'))
          expect(sydneyDistanceToRoute(x, z, r), `${l.id} ${r.id}`).toBeGreaterThan(r.width / 2);
    const lots = createSydneyHarbourLots();
    for (const lot of lots) {
      for (const l of C.landmarks)
        expect(sydneyFootprintsOverlap(lot.footprint, sydneyLandmarkFootprint(l, 3)), `${lot.kind} ${l.id}`).toBe(false);
      for (const v of C.viaducts)
        expect(sydneyDistanceToRoute(lot.x, lot.z, v as never)).toBeGreaterThan(v.width / 2);
    }
  });

  it('fills the CBD with street-aligned 1960s blocks and the haze with outer suburbs', () => {
    const lots = createSydneyHarbourLots();
    const cbd = lots.filter((l) => l.district === 'cbd' && l.kind === 'office');
    expect(cbd.length).toBeGreaterThan(300);
    const median = [...cbd.map((l) => l.storeys)].sort((a, b) => a - b)[cbd.length >> 1]!;
    expect(median).toBeGreaterThanOrEqual(6);
    expect(median).toBeLessThanOrEqual(11);
    expect(new Set(cbd.map((l) => l.yaw.toFixed(2))).size).toBeGreaterThan(5);
    const blocks = lots.filter((l) => l.kind === 'block');
    expect(blocks.length).toBeGreaterThan(400);
    for (const b of blocks) expect(Math.hypot(b.x, b.z)).toBeGreaterThan(880);
    expect(lots.filter((l) => l.district === 'woolloomooloo').length).toBeGreaterThan(10);
    expect(lots.filter((l) => l.district === 'potts-point').length).toBeGreaterThan(5);
  });

  it('opens Woolloomooloo Bay to its OSM head and keeps Garden Island and Fort Denison', () => {
    for (const [x, z] of [
      [600, 1000],
      [530, 1300],
      [700, 900],
      [968, -226],
    ])
      expect(sydneyTerrainHeightAt(x!, z!), `${x},${z}`).toBe(0);
    for (const [x, z] of [
      [1250, 400],
      [650, 1450],
      [1000, 1300],
    ])
      expect(sydneyTerrainHeightAt(x!, z!), `${x},${z}`).toBeGreaterThan(1);
    expect(sydneyGroundKindAt(300, 900)).toBe('garden');
    expect(sydneyGroundKindAt(700, 1500)).toBe('city');
  });

  it('adds sandstone relief without touching the worksite, yard or near garden', () => {
    for (let a = 0; a < 64; a++)
      for (const r of [0, 100, 250, 400]) {
        const x = -20 + Math.cos(a) * r,
          z = 120 + Math.sin(a) * r;
        expect(sydneyReliefAt(x, z)).toBe(0);
      }
    expect(sydneyTerrainHeightAt(-960, 290)).toBeGreaterThan(25);
    expect(sydneyTerrainHeightAt(1010, 1380)).toBeGreaterThan(20);
    // Garden Island dockyard stays level for the graving dock.
    const dock = C.landmarks.find((l) => l.id === 'captain-cook-dock')!;
    const s = sydneyLandmarkSupport(dock);
    expect(s.top - s.bottom).toBeLessThan(1.5);
  });

  it('keeps moving workboats clear of the berthed liner, ferries and warships', () => {
    const vessels = C.landmarks.filter((l) => l.support === 'water');
    for (let i = 0; i <= 300; i++)
      for (const boat of sydneyBoatsAt(i / 300)) {
        const hull = {
          minX: boat.position[0] - 10,
          maxX: boat.position[0] + 10,
          minZ: boat.position[2] - 10,
          maxZ: boat.position[2] + 10,
        };
        for (const v of vessels)
          expect(sydneyFootprintsOverlap(hull, sydneyLandmarkFootprint(v, 2)), `${boat.id} ${v.id}`).toBe(false);
      }
  });

  it('carries the Cahill Expressway over the quay and brings both ends to grade', () => {
    for (const v of C.viaducts) {
      const line = sydneyViaductCentreline(v);
      for (const i of [0, line.length - 1]) {
        const [x, y, z] = line[i]!;
        expect(y - sydneyTerrainHeightAt(x, z)).toBeLessThan(1);
      }
      expect(Math.max(...line.map((p) => p[1]))).toBeCloseTo(v.deckY, 1);
      for (const [x, y, z] of line) expect(y).toBeGreaterThan(sydneyTerrainHeightAt(x, z));
    }
  });

  it('lights the city at night with fixed-pixel lamps and window glow, dark by day', async () => {
    const lamps = sydneyLampPositions();
    expect(lamps.length).toBeGreaterThan(400);
    const bridge = lamps.filter(([, y]) => Math.abs(y - (SYDNEY_BRIDGE.deckY + 7.5)) < 0.01);
    expect(bridge.length).toBeGreaterThan(40);
    const env = new SydneyEnvironment({
      water: new MeshStandardMaterial(),
      whitewash: new MeshStandardMaterial(),
    } as never);
    await env.ready;
    const lampMesh = env.group.getObjectByName('sydney-night-lamps') as Points;
    expect(lampMesh).toBeInstanceOf(Points);
    const light = { emissive: 0 } as never;
    env.update(0.3, light, {} as never, new Vector3(0.3, 0.8, 0.2).y);
    expect(SYDNEY_CITY_NIGHT.value).toBe(0);
    expect(lampMesh.visible).toBe(false);
    env.update(1, { emissive: 1 } as never, {} as never, -0.3);
    expect(SYDNEY_CITY_NIGHT.value).toBe(1);
    expect(lampMesh.visible).toBe(true);
    for (const name of ['sydney-context-landmarks', 'sydney-context-outer-blocks', 'sydney-context-groves'])
      expect(env.group.getObjectByName(name), name).toBeTruthy();
    env.dispose();
  }, 60000);
});
