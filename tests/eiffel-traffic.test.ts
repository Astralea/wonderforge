import { describe, expect, it } from 'vitest';
import { EIFFEL_TRAFFIC_ACTORS, EIFFEL_TRAFFIC_ROUTES } from '../src/data/eiffelTraffic';
import { activeEiffelTrafficAt, eiffelTrafficPoseAt } from '../src/engine/eiffelTraffic';
import { EIFFEL_SEINE_WATER_Y, eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';

describe('1889 Paris traffic', () => {
  it('contains period street and river life without ordinary motor cars', () => {
    const kinds = new Set(EIFFEL_TRAFFIC_ACTORS.map((actor) => actor.kind));
    expect(kinds).toEqual(new Set(['pedestrian-man', 'pedestrian-woman', 'cart', 'carriage', 'steam-boat', 'barge']));
    expect(kinds.has('car' as never)).toBe(false);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind.startsWith('pedestrian')).length).toBeGreaterThanOrEqual(18);
  });

  it('keeps road traffic outside the site and promenade traffic on the paved boundary', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => !item.kind.includes('boat') && item.kind !== 'barge')) {
      const route = EIFFEL_TRAFFIC_ROUTES.find((item) => item.id === actor.routeId)!;
      for (let i = 0; i <= 48; i += 1) {
        const pose = eiffelTrafficPoseAt(actor, i / 48);
        const [x, y, z] = pose.position;
        if (route.surface === 'road' || route.surface === 'sidewalk') {
          expect(Math.abs(x)).toBeGreaterThanOrEqual(190);
          expect(x > 100 && x < 180 && z > -120 && z < 110).toBe(false);
        } else {
          expect(Math.abs(x) < 90 && Math.abs(z) < 90).toBe(false);
          if (route.id.startsWith('market-')) {
            expect(x).toBeGreaterThanOrEqual(-175);
            expect(x).toBeLessThanOrEqual(-109);
            expect(z).toBeGreaterThanOrEqual(-87);
            expect(z).toBeLessThanOrEqual(115);
          } else {
          expect(Math.abs(x) > 108 || z < -108 || z > 358).toBe(false);
          }
        }
        for (const pool of [{ z: 230, hx: 10, hz: 34 }, { z: 310, hx: 9, hz: 12 }]) {
          expect(Math.abs(x) < pool.hx && Math.abs(z - pool.z) < pool.hz).toBe(false);
        }
        const lift = route.surface === 'road' ? 0.08 : 0.24;
        expect(y).toBeCloseTo(eiffelTerrainHeightAt(x, z) + lift, 8);
      }
    }
  });

  it('populates evenly spaced period lanes without same-lane overlaps', () => {
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind.startsWith('pedestrian'))).toHaveLength(648);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === 'cart' || actor.kind === 'carriage')).toHaveLength(24);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.kind.startsWith('pedestrian')
      && (actor.routeId.startsWith('expo-') || actor.routeId.startsWith('tower-boundary')),
    )).toHaveLength(240);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.kind.startsWith('pedestrian') && actor.routeId.startsWith('market-cluster-'),
    )).toHaveLength(24);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.kind.startsWith('pedestrian')
      && (actor.routeId.startsWith('market-table-') || actor.routeId.startsWith('market-stall-mill-')),
    )).toHaveLength(80);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.kind.startsWith('pedestrian')
      && (actor.routeId.startsWith('garden-') || actor.routeId.startsWith('palace-entry-')),
    )).toHaveLength(80);
    expect(EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.lod === 'near'
      && (actor.routeId.startsWith('market-table-')
        || actor.routeId.startsWith('market-stall-mill-')
        || actor.routeId.startsWith('garden-')
        || actor.routeId.startsWith('palace-entry-')),
    )).toHaveLength(6);
    for (const route of EIFFEL_TRAFFIC_ROUTES.filter((candidate) => candidate.surface !== 'water')) {
      const actors = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.routeId === route.id);
      if (actors.length < 2) continue;
      for (const t of [0, 0.37, 1]) {
        const poses = actors.map((actor) => eiffelTrafficPoseAt(actor, t));
        for (let index = 0; index < poses.length; index += 1) {
          const a = poses[index]!;
          const b = poses[(index + 1) % poses.length]!;
          const spacing = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
          const isSmallActivityLoop = route.id.startsWith('market-') || route.id.startsWith('palace-entry-');
          const isGardenMillingLane = route.id.startsWith('garden-') && route.id.endsWith('-mill');
          // Small conversational loops keep more than two body diameters
          // between figures; the long walking lanes retain five-metre slots.
          expect(spacing).toBeGreaterThan(route.id.startsWith('north-bank-') ? 0.7
            : isSmallActivityLoop ? 1.25 : isGardenMillingLane ? 3.5 : 5);
        }
      }
    }
  });

  it('places stationary market groups on paving clear of pavilion walls', () => {
    const pavilionFootprints = [
      { x: -147, z: -54, hx: 15, hz: 12 },
      { x: -144, z: 4, hx: 19.5, hz: 17.5 },
      { x: -148, z: 73, hx: 15, hz: 13.5 },
      { x: -127, z: 103, hx: 5, hz: 5 },
      { x: -162, z: 110, hx: 4.5, hz: 4.5 },
    ];
    const market = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.routeId.startsWith('market-cluster-'));
    expect(market).toHaveLength(24);
    for (const actor of market) {
      expect(actor.speed).toBe(0);
      const start = eiffelTrafficPoseAt(actor, 0);
      expect(eiffelTrafficPoseAt(actor, 1).position).toEqual(start.position);
      const [x, y, z] = start.position;
      expect(x).toBeGreaterThanOrEqual(-175);
      expect(x).toBeLessThanOrEqual(-109);
      expect(z).toBeGreaterThanOrEqual(-87);
      expect(z).toBeLessThanOrEqual(115);
      expect(y).toBeCloseTo(eiffelTerrainHeightAt(x, z) + 0.24, 8);
      for (const footprint of pavilionFootprints) {
        expect(Math.abs(x - footprint.x) <= footprint.hx + 0.75
          && Math.abs(z - footprint.z) <= footprint.hz + 0.75).toBe(false);
      }
    }
  });

  it('keeps market milling and table visitors on paving clear of structures and seating', () => {
    const pavilionFootprints = [
      { x: -147, z: -54, hx: 15, hz: 12 },
      { x: -144, z: 4, hx: 19.5, hz: 17.5 },
      { x: -148, z: 73, hx: 15, hz: 13.5 },
      { x: -127, z: 103, hx: 5, hz: 5 },
      { x: -162, z: 110, hx: 4.5, hz: 4.5 },
    ];
    const tableCenters = ([-152, -144, -136] as const)
      .flatMap((x) => ([-29, -22, 35, 44] as const).map((z) => ({ x, z })));
    const activity = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.routeId.startsWith('market-table-') || actor.routeId.startsWith('market-stall-mill-'));
    expect(activity).toHaveLength(80);
    for (const actor of activity) {
      for (const t of [0, 0.17, 0.43, 0.71, 1]) {
        const [x, y, z] = eiffelTrafficPoseAt(actor, t).position;
        expect(x).toBeGreaterThanOrEqual(-175);
        expect(x).toBeLessThanOrEqual(-109);
        expect(z).toBeGreaterThanOrEqual(-87);
        expect(z).toBeLessThanOrEqual(115);
        expect(y).toBeCloseTo(eiffelTerrainHeightAt(x, z) + 0.24, 8);
        for (const footprint of pavilionFootprints) {
          expect(Math.abs(x - footprint.x) <= footprint.hx + 0.75
            && Math.abs(z - footprint.z) <= footprint.hz + 0.75).toBe(false);
        }
        if (actor.routeId.startsWith('market-table-')) {
          const table = tableCenters.find((candidate) => actor.routeId === `market-table-${candidate.x}-${candidate.z}`)!;
          expect(Math.hypot(x - table.x, z - table.z)).toBeGreaterThanOrEqual(2);
        }
      }
      if (actor.routeId.startsWith('market-table-')) {
        expect(actor.speed).toBe(0);
        expect(eiffelTrafficPoseAt(actor, 0).position).toEqual(eiffelTrafficPoseAt(actor, 1).position);
      } else {
        expect(actor.speed).toBeGreaterThan(0);
      }
    }
  });

  it('fills garden and palace-entry promenades while avoiding pools, halls and vehicle lanes', () => {
    const visitors = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.routeId.startsWith('garden-') || actor.routeId.startsWith('palace-entry-'));
    expect(visitors).toHaveLength(80);
    for (const actor of visitors) {
      for (const t of [0, 0.19, 0.47, 0.73, 1]) {
        const [x, y, z] = eiffelTrafficPoseAt(actor, t).position;
        expect(y).toBeCloseTo(eiffelTerrainHeightAt(x, z) + 0.24, 8);
        expect(Math.abs(x)).toBeLessThanOrEqual(85);
        expect(z).toBeGreaterThanOrEqual(138);
        expect(z).toBeLessThanOrEqual(332);
        expect(Math.abs(x) >= 116 && z >= 127 && z <= 333).toBe(false);
        for (const pool of [{ z: 230, hx: 10, hz: 34 }, { z: 310, hx: 9, hz: 12 }]) {
          expect(Math.abs(x) < pool.hx + 1 && Math.abs(z - pool.z) < pool.hz + 1).toBe(false);
        }
        // Horse vehicles occupy the x=+/-100 exposition loop; visitors stay
        // on the garden walk's palace-facing edge at or inside x=+/-85.
        expect(Math.abs(x)).toBeLessThanOrEqual(85);
      }
    }
  });

  it('keeps vessels on offset lanes in the rotated Seine channel', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => item.kind.includes('boat') || item.kind === 'barge')) {
      const route = EIFFEL_TRAFFIC_ROUTES.find((item) => item.id === actor.routeId)!;
      expect(route.surface).toBe('water');
      for (let i = 0; i <= 120; i += 1) {
        const pose = eiffelTrafficPoseAt(actor, i / 120);
        const [x, y, z] = pose.position;
        const across = Math.sin(0.08) * x + Math.cos(0.08) * (z + 175);
        expect(across).toBeCloseTo(route.surface === 'water' ? route.across : 0, 8);
        expect(y).toBe(EIFFEL_SEINE_WATER_Y);
        expect(eiffelTerrainHeightAt(x, z)).toBeLessThan(y);
      }
    }
  });

  it('derives wheel and gait motion from travelled distance and seeks deterministically', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS) {
      const a = eiffelTrafficPoseAt(actor, 0.63);
      expect(eiffelTrafficPoseAt(actor, 0.63)).toEqual(a);
      eiffelTrafficPoseAt(actor, 0.95);
      expect(eiffelTrafficPoseAt(actor, 0.63)).toEqual(a);
      if (actor.wheelRadius) expect(a.wheelAngle).toBeCloseTo(Math.abs(a.distance) / actor.wheelRadius, 8);
      if (actor.stride) expect(a.gaitPhase).toBeGreaterThanOrEqual(0);
    }
    expect(activeEiffelTrafficAt(0.4)).toHaveLength(EIFFEL_TRAFFIC_ACTORS.length);
  });

  it('rolls the bottom rim backward to cancel forward carriage travel in either route direction', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter(a => a.wheelRadius)) {
      const dt = 1e-6;
      const a = eiffelTrafficPoseAt(actor, .37);
      const b = eiffelTrafficPoseAt(actor, .37 + dt);
      const forwardTravel = actor.speed * 60 * dt;
      const rimTravel = -actor.wheelRadius! * Math.sin(b.wheelAngle - a.wheelAngle);
      expect(Math.abs(forwardTravel + rimTravel)).toBeLessThan(1e-9);
    }
  });

  it('keeps unpowered barges moored while steam passenger boats use the arch lanes', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => item.kind === 'barge')) {
      expect(actor.speed).toBe(0);
      expect(eiffelTrafficPoseAt(actor, 0).position).toEqual(eiffelTrafficPoseAt(actor, 1).position);
      const route = EIFFEL_TRAFFIC_ROUTES.find((item) => item.id === actor.routeId)!;
      expect(route.surface === 'water' && Math.abs(route.across)).toBe(40);
    }
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => item.kind === 'steam-boat')) {
      const route = EIFFEL_TRAFFIC_ROUTES.find((item) => item.id === actor.routeId)!;
      expect(route.surface === 'water' && Math.abs(route.across)).toBe(20);
    }
  });

  it('keeps closed street loops position-continuous through route wrap', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => item.kind !== 'steam-boat' && item.kind !== 'barge')) {
      if (actor.speed === 0) continue;
      let previous = eiffelTrafficPoseAt(actor, 0);
      for (let i = 1; i <= 200; i += 1) {
        const pose = eiffelTrafficPoseAt(actor, i / 200);
        const step = Math.hypot(
          pose.position[0] - previous.position[0],
          pose.position[2] - previous.position[2],
        );
        // Offset curves are slightly longer or shorter through a corner, but
        // remain locally continuous and cannot teleport at route wrap.
        expect(step).toBeLessThan(actor.speed * 60 / 200 * 1.25);
        previous = pose;
      }
    }
  });

  it('hides every river wrap before the position discontinuity', () => {
    for (const actor of EIFFEL_TRAFFIC_ACTORS.filter((item) => item.kind.includes('boat') || item.kind === 'barge')) {
      const forcedWrap = { ...actor, phase: 0.999, direction: 1 as const, speed: 4.2 };
      const before = eiffelTrafficPoseAt(forcedWrap, 0);
      const after = eiffelTrafficPoseAt(forcedWrap, 0.01);
      expect(Math.abs(after.position[0] - before.position[0])).toBeGreaterThan(1_000);
      expect(Math.max(before.visibility, after.visibility)).toBeLessThan(0.02);
    }
  });
});
