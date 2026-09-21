import { describe, expect, it } from 'vitest';
import { COLOSSEUM_URBAN_CONTEXT as C } from '../src/data/colosseumUrbanContext';
import { COLOSSEUM_AQUEDUCT as A } from '../src/data/colosseumAqueduct';
import { COLOSSEUM_HILLS, colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';
import { COLOSSEUM_ROME_LOTS, createColosseumRomeLots, romeLotRadius } from '../src/engine/colosseumRomeLots';
import { caelianLotFoundation, createCaelianStreetFronts, distanceToRomeSegment, isClearOfRomeContext, romeContextManifest } from '../src/engine/colosseumUrbanContext';
import { flattenRomeRoles, loadColosseumRomeKit } from '../src/render/three/colosseumRome';
import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { PerspectiveCamera, Vector3 } from 'three';
import { colosseumCinematicShotAt } from '../src/engine/colosseumCamera';
import { sampleColosseumSky } from '../src/data/colosseumSky';

describe('Connected Flavian Rome (Specs 12/49)', () => {
  it('orients named hills around the drained valley without raising the working floor', () => {
    const hills = Object.fromEntries(COLOSSEUM_HILLS.map(h => [h.id, h]));
    for (const id of ['caelian', 'aventine']) expect(hills[id]!.z).toBeLessThan(0);
    for (const id of ['quirinal', 'viminal', 'oppian', 'velia']) expect(hills[id]!.z).toBeGreaterThan(0);
    expect(hills.velia!.x).toBeLessThan(0);
    expect(hills.oppian!.x).toBeGreaterThan(0);
    for (let x = -120; x <= 120; x += 20) for (let z = -100; z <= 100; z += 20) {
      if (Math.hypot(x, z) <= 140) expect(colosseumTerrainHeightAt(x, z)).toBe(0);
    }
  });

  it('carries the conduit into the east precinct wall and continues into a built district', () => {
    const p = C.precinct, receiver = C.watercourse.receiver;
    const east = p.center[0] + p.width / 2;
    expect(receiver[0]).toBeLessThan(east);
    expect(east - receiver[0]).toBeLessThan(1);
    expect(Math.abs(receiver[1] - p.center[1])).toBeLessThan(p.depth / 2 - 5);
    const conduitCap = A.springingHeight + A.spandrelTop + A.channelHeight + A.capHeight;
    expect(p.top - conduitCap).toBeGreaterThanOrEqual(0);
    expect(p.top - conduitCap).toBeLessThan(.1);
    const end = C.watercourse.visibleJoin;
    const fronts = createCaelianStreetFronts();
    const nearest = Math.min(...fronts.map(l => Math.hypot(l.x - end[0], l.z - end[1])));
    expect(nearest).toBeLessThan(55); // Old isolated endpoint was >160m from a building.
    expect(fronts.some(l => (l.x - end[0]) * A.direction[0] + (l.z - end[1]) * A.direction[1] > 25)).toBe(true);
    expect(romeContextManifest().watercourse.to).toBe('claudian-precinct-east-wall');
    expect(romeContextManifest().productionNote).toMatch(/compressed/);
  });

  it('keeps complete building and vegetation footprints off streets, piers and the precinct', () => {
    expect(createColosseumRomeLots()).toEqual(COLOSSEUM_ROME_LOTS);
    for (const lot of COLOSSEUM_ROME_LOTS) expect(isClearOfRomeContext(lot.x, lot.z, romeLotRadius(lot))).toBe(true);
    for (const a of createCaelianStreetFronts()) {
      for (const b of COLOSSEUM_ROME_LOTS) {
        if (a.x === b.x && a.z === b.z) continue;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(romeLotRadius(a) + romeLotRadius(b));
      }
    }
    expect(isClearOfRomeContext(A.start[0], A.start[1], 1)).toBe(false);
    const street = C.streets[0];
    const a = street.points[0]!, b = street.points[1]!;
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    expect(distanceToRomeSegment(x, z, a, b)).toBeCloseTo(0);
    expect(isClearOfRomeContext(x, z, 4)).toBe(false);
  });

  it('ends the upstream abstraction outside the frame or beyond the film fog on both viewports', () => {
    const end = C.watercourse.upstream;
    for (const aspect of [16/9, 1.6, 390/844, 320/844]) for (let i = 0; i <= 100; i++) {
      const t = i / 100, shot = colosseumCinematicShotAt(t, aspect);
      const camera = new PerspectiveCamera(shot.fov, aspect, .5, 5000);
      const h = Math.cos(shot.pitch) * shot.radius;
      camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * h, shot.target[1] + Math.sin(shot.pitch) * shot.radius, shot.target[2] + Math.sin(shot.azimuth) * h);
      camera.lookAt(new Vector3(...shot.target)); camera.updateMatrixWorld();
      const point = new Vector3(end[0], 35, end[1]);
      const ndc = point.clone().project(camera);
      const depth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z;
      // Same fog envelope used by WorldScene.updateColosseumCamera.
      const far = shot.radius * 3.6 * sampleColosseumSky(t).fogStretch;
      expect(depth <= camera.near || Math.abs(ndc.x) > 1.02 || Math.abs(ndc.y) > 1.02 || depth >= far, `aspect=${aspect}, t=${t}`).toBe(true);
    }
  });

  it('uses actual imported roof extents in the authored lot clearance, and supports every new court', async () => {
    const kit = await loadColosseumRomeKit();
    try {
      for (const [kind, root] of Object.entries(kit)) {
        const geometry = flattenRomeRoles(root, ['brick', 'stone', 'void', 'tile', 'foliage', 'timber'])!;
        const positions = geometry.getAttribute('position');
        let radius = 0;
        for (let i = 0; i < positions.count; i++) radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
        expect(romeLotRadius({ kind: kind as 'insula', x: 0, z: 0, yaw: 0, scale: 1 })).toBeGreaterThanOrEqual(radius);
        geometry.dispose();
      }
    } finally {
      const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
      Object.values(kit).forEach(root => root.traverse((o: Object3D) => { if (o instanceof Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } }));
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    }
    for (const lot of createCaelianStreetFronts()) {
      const foundation = caelianLotFoundation(lot);
      expect(foundation.top).toBeGreaterThan(colosseumTerrainHeightAt(lot.x, lot.z));
      for (const corner of foundation.corners) expect(foundation.top).toBeGreaterThan(corner.ground);
    }
  });
});
