import { describe, expect, it } from 'vitest';
import { isoProject, type IsoCamera } from '../src/render/projection';
import { tessellate } from '../src/render/faces';
import { blobShadowOffset, buildScene } from '../src/render/sceneGraph';
import { shadeFace } from '../src/render/shade';
import { lightStateAt } from '../src/engine/daynight';
import type { Part, Wonder } from '../src/data/types';
import type { Vec3 } from '../src/render/vec';

const CAM: IsoCamera = {
  azimuth: 0,
  pitch: Math.PI / 6,
  scale: 10,
  center: [400, 300],
  targetY: 0,
};

const fixtureWonder: Wonder = {
  id: 'render-fixture',
  name: 'Fixture',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

const box: Part = {
  shape: 'box',
  material: 'primary',
  position: [0, 0, 0],
  scale: [2, 2, 2],
};

describe('isoProject', () => {
  it('maps world up to screen up', () => {
    expect(isoProject([0, 2, 0], CAM).y).toBeLessThan(isoProject([0, 0, 0], CAM).y);
  });

  it('centers the orbit target', () => {
    const p = isoProject([0, 0, 0], CAM);
    expect(p.x).toBeCloseTo(400, 5);
    expect(p.y).toBeCloseTo(300, 5);
  });

  it('traces a closed loop over a full azimuth orbit', () => {
    const a = isoProject([1, 0.5, 0.5], { ...CAM, azimuth: 0 });
    const b = isoProject([1, 0.5, 0.5], { ...CAM, azimuth: Math.PI * 2 });
    expect(b.x).toBeCloseTo(a.x, 5);
    expect(b.y).toBeCloseTo(a.y, 5);
    expect(b.depth).toBeCloseTo(a.depth, 5);
  });

  it('depth increases toward the camera', () => {
    // azimuth 0 => camera sits on +x
    const near = isoProject([10, 0, 0], CAM);
    const far = isoProject([-10, 0, 0], CAM);
    expect(near.depth).toBeGreaterThan(far.depth);
  });

  it('pitch=0 gives a pure elevation view (depth has no vertical component)', () => {
    const flat = { ...CAM, pitch: 0 };
    expect(isoProject([0, 3, 0], flat).y).toBeCloseTo(300 - 30, 5);
  });
});

describe('tessellate', () => {
  it('box: 6 planar faces with unit area each (unit cube)', () => {
    const faces = tessellate('box');
    expect(faces).toHaveLength(6);
    for (const f of faces) {
      expect(f.points).toHaveLength(4);
      // unit cube face area = 1
      const [a, b, c] = f.points as [Vec3, Vec3, Vec3];
      const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const cross: Vec3 = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      expect(Math.hypot(...cross)).toBeCloseTo(1, 5);
    }
  });

  it('cylinder: 12 side quads + 2 caps, all normals unit length', () => {
    const faces = tessellate('cylinder');
    expect(faces).toHaveLength(14);
    for (const f of faces) {
      expect(Math.hypot(...f.normal)).toBeCloseTo(1, 5);
    }
  });

  it('cone, pyramid, prism, ramp, sphere, torus, sail all produce sane meshes', () => {
    expect(tessellate('cone').length).toBe(13); // 12 sides + base
    expect(tessellate('pyramid').length).toBe(5); // 4 sides + base
    expect(tessellate('prism').length).toBe(5); // 2 ends + 2 slopes + bottom
    expect(tessellate('ramp').length).toBe(5); // sloped top + back + 2 sides + bottom
    expect(tessellate('sphere').length).toBeGreaterThan(40);
    expect(tessellate('torus').length).toBeGreaterThan(80);
    expect(tessellate('sail').length).toBeGreaterThan(30);
    for (const shape of ['cone', 'pyramid', 'prism', 'ramp', 'sphere', 'torus', 'sail'] as const) {
      for (const f of tessellate(shape)) {
        expect(f.points.length).toBeGreaterThanOrEqual(3);
        expect(Math.hypot(...f.normal)).toBeCloseTo(1, 5);
        for (const p of f.points) {
          expect(p.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });
});

describe('buildScene', () => {
  const wonderWith = (parts: Part[]): Wonder => ({
    ...fixtureWonder,
    structure: { stages: [{ name: 's', parts }] },
  });

  it('culls backfaces: box at azimuth 0 shows only top + sun-side faces', () => {
    const faces = buildScene({
      wonder: wonderWith([box]),
      t: 0.5,
      camera: CAM,
      light: lightStateAt(0.5, fixtureWonder),
      scatter: false,
    });
    // top (+y) and +x faces only; ±z faces are edge-on (degenerate)
    expect(faces).toHaveLength(2);
  });

  it('shows 3 box faces at a diagonal azimuth', () => {
    const faces = buildScene({
      wonder: wonderWith([box]),
      t: 0.5,
      camera: { ...CAM, azimuth: Math.PI / 4 },
      light: lightStateAt(0.5, fixtureWonder),
      scatter: false,
    });
    expect(faces).toHaveLength(3);
  });

  it('sorts faces far -> near along the view axis', () => {
    const farBox: Part = { ...box, position: [-5, 0, 0] }; // az 0: -x is far
    const nearBox: Part = { ...box, material: 'accent', position: [5, 0, 0] };
    const faces = buildScene({
      wonder: wonderWith([farBox, nearBox]),
      t: 0.5,
      camera: CAM,
      light: lightStateAt(0.5, fixtureWonder),
      scatter: false,
    });
    const lastPrimary = faces.map((f) => f.material).lastIndexOf('primary');
    const firstAccent = faces.findIndex((f) => f.material === 'accent');
    expect(firstAccent).toBeGreaterThan(lastPrimary);
  });

  it('emits nothing for parts whose entrance has not started', () => {
    const late: Part = { ...box };
    const twoStages: Wonder = {
      ...fixtureWonder,
      structure: {
        stages: [
          { name: 'a', parts: [late] },
          { name: 'b', parts: [{ ...box, material: 'accent' }] },
        ],
      },
    };
    const atStart = buildScene({
      wonder: twoStages,
      t: 0.09, // only stage 0 has begun
      camera: CAM,
      light: lightStateAt(0.5, fixtureWonder),
      scatter: false,
    });
    expect(atStart.every((f) => f.material === 'primary')).toBe(true);
    const later = buildScene({
      wonder: twoStages,
      t: 0.9,
      camera: CAM,
      light: lightStateAt(0.5, fixtureWonder),
      scatter: false,
    });
    expect(later.length).toBeGreaterThan(atStart.length);
  });
});

describe('shadeFace', () => {
  const noon = lightStateAt(0.5, fixtureWonder);

  it('lights horizontal faces brighter than vertical ones at noon', () => {
    const top = shadeFace('#c9b18a', [0, 1, 0], noon, 'primary');
    const side = shadeFace('#c9b18a', [1, 0, 0], noon, 'primary');
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(lum(top)).toBeGreaterThan(lum(side));
  });

  it('sun-facing faces are warmer than faces turned away', () => {
    const az = (noon.sun.azimuth * Math.PI) / 180;
    const el = (noon.sun.elevation * Math.PI) / 180;
    const toward: Vec3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const away: Vec3 = [-toward[0], -toward[1], -toward[2]];
    const warm = shadeFace('#c9b18a', toward, noon, 'primary');
    const cold = shadeFace('#c9b18a', away, noon, 'primary');
    const warmth = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) - (n & 255);
    };
    expect(warmth(warm)).toBeGreaterThan(warmth(cold));
  });

  it('light material glows at night regardless of normal', () => {
    const nightWonder: Wonder = { ...fixtureWonder, endsAtNight: true };
    const night = lightStateAt(1, nightWonder);
    const a = shadeFace('#2e2a24', [0, 1, 0], night, 'light');
    const b = shadeFace('#2e2a24', [0, -1, 0], night, 'light');
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(lum(a)).toBeGreaterThan(300); // glowing, not dark
    expect(Math.abs(lum(a) - lum(b))).toBeLessThan(40); // normal-independent
  });

  it('always returns valid 6-digit hex', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const light = lightStateAt(t, fixtureWonder);
      expect(shadeFace('#c9b18a', [0, 1, 0], light, 'primary')).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps limestone readable at a non-night golden-hour reveal', () => {
    const dusk = lightStateAt(1, fixtureWonder);
    const fill = shadeFace('#e8cf9e', [0, 1, 0], dusk, 'primary');
    const [r, g, b] = [
      Number.parseInt(fill.slice(1, 3), 16),
      Number.parseInt(fill.slice(3, 5), 16),
      Number.parseInt(fill.slice(5, 7), 16),
    ];
    expect(r + g + b).toBeGreaterThan(280);
    expect(r).toBeGreaterThan(b); // golden, not neutral gray
  });
});

describe('blobShadowOffset', () => {
  it('falls opposite the sun azimuth', () => {
    for (const t of [0.1, 0.3, 0.6, 0.8]) {
      const light = lightStateAt(t, fixtureWonder);
      const [dx, dz] = blobShadowOffset(light, 10);
      const az = (light.sun.azimuth * Math.PI) / 180;
      expect(dx * Math.cos(az) + dz * Math.sin(az)).toBeLessThan(0);
    }
  });

  it('grows longer at low sun', () => {
    const morning = blobShadowOffset(lightStateAt(0.1, fixtureWonder), 10);
    const noon = blobShadowOffset(lightStateAt(0.5, fixtureWonder), 10);
    expect(Math.hypot(...morning)).toBeGreaterThan(Math.hypot(...noon));
  });
});
