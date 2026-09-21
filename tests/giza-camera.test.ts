import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import { gizaSunStateAt } from '../src/data/gizaSky';
import {
  GIZA_CAMERA,
  GIZA_SHOTS,
  gizaAmbientOrbitAt,
  gizaCinematicPitchAt,
  gizaCinematicShotAt,
} from '../src/engine/gizaCamera';

const DEG = 180 / Math.PI;

/** NDC x/y of a world point through the exact cinematic camera at `t`. */
function projectAt(
  t: number,
  aspect: number,
  fov: number,
  point: Vector3,
): { x: number; y: number } {
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 4000);
  const shot = gizaCinematicShotAt(t, aspect);
  const target = new Vector3(...shot.target);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  camera.position.set(
    target.x + Math.cos(shot.azimuth) * horizontal,
    target.y + Math.sin(shot.pitch) * shot.radius,
    target.z + Math.sin(shot.azimuth) * horizontal,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const projected = point.clone().project(camera);
  return { x: projected.x, y: projected.y };
}

// Apex of each finished monument — the point a viewer looks for.
const plan = createGizaConstructionPlan();
const APEXES = Object.fromEntries(
  Object.values(plan.monuments).map((monument) => [
    monument.id,
    new Vector3(
      monument.center[0],
      monument.groundY + monument.height,
      monument.center[1],
    ),
  ]),
) as Record<'khufu' | 'khafre' | 'menkaure', Vector3>;

describe('Giza cinematic pitch wave', () => {
  it('breathes between horizon and detail framings on desktop', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i <= 400; i += 1) {
      const pitch = gizaCinematicPitchAt(i / 400, 16 / 9) * DEG;
      min = Math.min(min, pitch);
      max = Math.max(max, pitch);
    }
    // Low enough that the horizon line (fov 35 => ±17.5°) enters the frame.
    expect(min).toBeLessThan(17.5);
    expect(min).toBeGreaterThanOrEqual(15.5);
    expect(max).toBeLessThanOrEqual(29.5);
    expect(max).toBeGreaterThan(27);
  });

  it('keeps the mobile wave inside its wider lens', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i <= 400; i += 1) {
      const pitch = gizaCinematicPitchAt(i / 400, 0.6) * DEG;
      min = Math.min(min, pitch);
      max = Math.max(max, pitch);
    }
    // fov 42 => ±21°; the horizon must clear the frame top.
    expect(min).toBeLessThan(21);
    expect(max).toBeLessThanOrEqual(27);
  });

  it('times horizon moments near dawn and the reveal', () => {
    const dawn = gizaCinematicPitchAt(0.12, 16 / 9) * DEG;
    const reveal = gizaCinematicPitchAt(0.92, 16 / 9) * DEG;
    const midBuild = gizaCinematicPitchAt(0.52, 16 / 9) * DEG;
    expect(dawn).toBeLessThan(17);
    expect(reveal).toBeLessThan(17);
    expect(midBuild).toBeGreaterThan(28);
  });
});

describe('Giza reveal frustum contract', () => {
  it('shows all three finished monuments through the desktop reveal', () => {
    // The Menkaure close-up held so long that Khufu sat outside the frustum
    // from t ≈ 0.86 to ≈ 0.95 — to a viewer the Great Pyramid "disappeared"
    // near the end of the movie. The ensemble must be assembled well before
    // the final frame and stay assembled.
    for (let sample = 0; sample <= 12; sample += 1) {
      const t = 0.94 + (sample / 12) * 0.06;
      for (const [name, apex] of Object.entries(APEXES)) {
        const { x, y } = projectAt(t, 16 / 9, GIZA_CAMERA.fov.desktop, apex);
        expect(Math.abs(x), `${name} apex x at t=${t.toFixed(3)}`).toBeLessThan(1.05);
        expect(Math.abs(y), `${name} apex y at t=${t.toFixed(3)}`).toBeLessThan(1.05);
      }
    }
  });

  it('brings Khufu back into frame while the reveal pull-back is underway', () => {
    // By t = 0.92 Khufu's apex must at least be crossing the frame edge
    // (it peaked at NDC x ≈ 1.99 before the shot retiming).
    const { x } = projectAt(0.92, 16 / 9, GIZA_CAMERA.fov.desktop, APEXES.khufu);
    expect(x).toBeLessThan(1.1);
  });

  it('keeps the mobile reveal ensemble on screen (Khufu edge crop is by design)', () => {
    for (let sample = 0; sample <= 6; sample += 1) {
      const t = 0.96 + (sample / 6) * 0.04;
      const khafre = projectAt(t, 0.6, GIZA_CAMERA.fov.mobile, APEXES.khafre);
      const menkaure = projectAt(t, 0.6, GIZA_CAMERA.fov.mobile, APEXES.menkaure);
      const khufu = projectAt(t, 0.6, GIZA_CAMERA.fov.mobile, APEXES.khufu);
      expect(Math.abs(khafre.x)).toBeLessThan(1.05);
      expect(Math.abs(menkaure.x)).toBeLessThan(1.05);
      // The documented push-in crop: Khufu may overhang the right edge, but
      // its apex must stay close enough that the crop reads as intentional.
      expect(khufu.x).toBeLessThan(1.3);
    }
  });

  it('keeps every hand-off inside the movie and in order', () => {
    const { khufuToKhafre, khafreToMenkaure, reveal } = GIZA_SHOTS.handoffs;
    for (const window of [khufuToKhafre, khafreToMenkaure, reveal]) {
      expect(window.from).toBeLessThan(window.to);
      expect(window.to).toBeLessThanOrEqual(1);
    }
    expect(khufuToKhafre.to).toBeLessThanOrEqual(khafreToMenkaure.from);
    expect(khafreToMenkaure.to).toBeLessThanOrEqual(reveal.from);
  });
});

describe('Giza dusk sun presence (Tier 4 P4)', () => {
  /**
   * Wrapped |sun azimuth − camera view azimuth| in degrees. The dusk sun
   * holds azimuth −270° (the sky sampler clamps to the daylit window), so
   * this offset decides whether the reveal reads as sunset or as flat
   * backlight. Aspect-independent: only radius/pitch respond to aspect.
   */
  function sunViewOffsetAt(t: number): number {
    const shot = gizaCinematicShotAt(t, 16 / 9);
    const viewAzDeg = (shot.azimuth * DEG + 180) % 360;
    let diff = Math.abs(gizaSunStateAt(t).azimuth - viewAzDeg) % 360;
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  it('lands the setting sun at the frame edge for the final frame', () => {
    // Unswung orbit measured 147.9° at t = 1.0 (sun behind the camera). The
    // design band is 65–85°: forward-scatter glow at the frame edge and low
    // sun raking the ensemble, without the sun disc entering the lens
    // (desktop half-frame is ±29.3° horizontally) and without breaking the
    // frustum contract above.
    expect(sunViewOffsetAt(1)).toBeGreaterThanOrEqual(65);
    expect(sunViewOffsetAt(1)).toBeLessThanOrEqual(85);
  });

  it('leaves every beat before the reveal window untouched', () => {
    // The swing eases in from zero at the window start, so the dawn and
    // build framings keep their authored azimuths exactly.
    for (const t of [0, 0.12, 0.35, 0.62, 0.87, GIZA_SHOTS.handoffs.reveal.from]) {
      const shot = gizaCinematicShotAt(t, 16 / 9);
      expect(shot.azimuth, `azimuth at t=${t}`).toBeCloseTo(
        GIZA_CAMERA.startAzimuth + t * Math.PI * 2 * 1.25,
        10,
      );
    }
  });
});

describe('Giza ambient hero orbit', () => {
  it('rotates continuously with no periodic snap', () => {
    // Across the 100 s loop boundary the azimuth must advance smoothly —
    // the old modulo-of-cinematic-t path snapped ~90° every 90 s.
    let previous = gizaAmbientOrbitAt(0, 16 / 9).azimuth;
    for (let t = 0.5; t <= 220; t += 0.5) {
      const { azimuth } = gizaAmbientOrbitAt(t, 16 / 9);
      const step = Math.abs(azimuth - previous);
      expect(step).toBeLessThan(0.05);
      previous = azimuth;
    }
  });

  it('closes a full turn per ambient period', () => {
    const a = gizaAmbientOrbitAt(0, 16 / 9).azimuth;
    const b = gizaAmbientOrbitAt(GIZA_CAMERA.ambient.turnSeconds, 16 / 9).azimuth;
    expect(b - a).toBeCloseTo(Math.PI * 2, 6);
  });

  it('breathes pitch within the cinematic limits', () => {
    for (let t = 0; t < 200; t += 0.25) {
      const { pitch } = gizaAmbientOrbitAt(t, 16 / 9);
      expect(pitch * DEG).toBeGreaterThanOrEqual(15.5);
      expect(pitch * DEG).toBeLessThanOrEqual(29.5);
    }
  });
});


describe('Giza operation framing', () => {
  it('brings the south haul surface closer while keeping its endpoints visible', () => {
    for (const aspect of [16 / 9, 390 / 844]) {
      const fov = aspect < 0.72 ? GIZA_CAMERA.fov.mobile : GIZA_CAMERA.fov.desktop;
      const close = gizaCinematicShotAt(0.2, aspect);
      expect(close.radius).toBeLessThan(gizaCinematicShotAt(0.32, aspect).radius * 0.7);
      for (const point of [new Vector3(7, 0, 37), new Vector3(7, 3, 12)]) {
        const ndc = projectAt(0.2, aspect, fov, point);
        expect(Math.abs(ndc.x)).toBeLessThan(0.9);
        expect(Math.abs(ndc.y)).toBeLessThan(0.7);
      }
    }
  });

  it('eases into/out of the operation without a target or radius jump', () => {
    for (const t of [0.08, 0.14, 0.24, 0.30]) {
      const a = gizaCinematicShotAt(t - 1e-6, 16 / 9);
      const b = gizaCinematicShotAt(t + 1e-6, 16 / 9);
      expect(Math.abs(a.radius - b.radius)).toBeLessThan(0.01);
      expect(new Vector3(...a.target).distanceTo(new Vector3(...b.target))).toBeLessThan(0.01);
    }
  });
});
