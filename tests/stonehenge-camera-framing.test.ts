import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { STONEHENGE_AXIS, STONEHENGE_CONSTRUCTION } from '../src/data/stonehengeConstruction';
import { STONEHENGE_SKY, stonehengeSunDirectionAt } from '../src/data/stonehengeSky';
import { stonehengeCinematicShotAt } from '../src/engine/stonehengeCamera';
import { createStonehengeStoneGeometry } from '../src/render/three/StonehengeStoneSystem';

const ASPECTS = [21 / 9, 16 / 9, 1440 / 900, 4 / 3, 1, .72, .71, 390 / 844, 320 / 844];
const cameraAt = (t: number, aspect: number) => {
  const shot = stonehengeCinematicShotAt(t, aspect);
  const camera = new PerspectiveCamera(shot.fov, aspect, .5, 4000);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal,
    shot.target[1] + Math.sin(shot.pitch) * shot.radius,
    shot.target[2] + Math.sin(shot.azimuth) * horizontal);
  camera.lookAt(...shot.target); camera.updateMatrixWorld();
  return camera;
};

describe('Stonehenge actual-film framing (Spec 10)', () => {
  it('keeps the complete solar disc below the 6vh letterbox plus 1.5vh margin throughout the closing hold', () => {
    const radius = STONEHENGE_SKY.sunDisc.angularRadiusDegrees * Math.PI / 180;
    for (const aspect of ASPECTS) {
      let top = Infinity, side = 0;
      for (let frame = 0; frame <= 220; frame++) {
        const t = .78 + frame / 1000, camera = cameraAt(t, aspect);
        const direction = new Vector3(...stonehengeSunDirectionAt(t));
        const right = new Vector3(0, 1, 0).cross(direction).normalize();
        const up = direction.clone().cross(right);
        for (let rim = 0; rim < 64; rim++) {
          const theta = rim * Math.PI / 32;
          const point = direction.clone().multiplyScalar(Math.cos(radius))
            .addScaledVector(right, Math.sin(radius) * Math.cos(theta))
            .addScaledVector(up, Math.sin(radius) * Math.sin(theta))
            .multiplyScalar(1e6).add(camera.position).project(camera);
          top = Math.min(top, (1 - point.y) / 2);
          side = Math.max(side, Math.abs(point.x));
        }
      }
      expect(top, `full solar rim, aspect ${aspect}`).toBeGreaterThan(.075);
      expect(side, `solar side margin, aspect ${aspect}`).toBeLessThan(.95);
    }
  });

  it('keeps the complete rendered stone envelopes and Heel Stone inside the letterboxed closing frame', () => {
    const upright = createStonehengeStoneGeometry('upright');
    const lintel = createStonehengeStoneGeometry('lintel');
    const heel = createStonehengeStoneGeometry('upright', true);
    const points = STONEHENGE_CONSTRUCTION.stones.flatMap(stone => {
      const geometry = stone.id === 'heel-stone' ? heel : stone.role === 'lintel' ? lintel : upright;
      const box = geometry.boundingBox!, rotation = new Euler(...stone.finalRotation);
      const corners: Vector3[] = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        corners.push(new Vector3(x * stone.dimensions[0], y * stone.dimensions[1], z * stone.dimensions[2])
          .applyEuler(rotation).add(new Vector3(...stone.finalPosition)));
      }
      return corners;
    });
    upright.dispose(); lintel.dispose(); heel.dispose();
    for (const aspect of ASPECTS) {
      let x = 0, y = 0, z = -Infinity;
      for (let frame = 0; frame <= 44; frame++) {
        const camera = cameraAt(.78 + frame / 200, aspect);
        for (const point of points) {
          const p = point.clone().project(camera);
          x = Math.max(x, Math.abs(p.x)); y = Math.max(y, Math.abs(p.y)); z = Math.max(z, p.z);
        }
      }
      expect(x, `whole setting, aspect ${aspect}`).toBeLessThan(.95);
      expect(y, `clear of both 6vh bars, aspect ${aspect}`).toBeLessThan(.85);
      expect(z).toBeLessThan(1);
    }
  });

  it('preserves the solstice bearing and accepted portrait shot while easing the desktop approach continuously', () => {
    for (const aspect of ASPECTS) {
      for (const t of [.78, .86, .92, 1]) {
        const shot = stonehengeCinematicShotAt(t, aspect);
        expect(shot.azimuth).toBeCloseTo(Math.PI * 2 + STONEHENGE_AXIS, 12);
      }
      for (const t of [.68, .78, .92]) {
        const before = cameraAt(t - 1e-7, aspect), after = cameraAt(t + 1e-7, aspect);
        expect(before.position.distanceTo(after.position), `position at ${t}`).toBeLessThan(.001);
        expect(before.getWorldDirection(new Vector3()).angleTo(after.getWorldDirection(new Vector3())), `bearing at ${t}`).toBeLessThan(1e-5);
      }
      let maxPitchSpeed = 0;
      for (let frame = 0; frame < 360; frame++) {
        const t = .68 + frame / 3600;
        const a = stonehengeCinematicShotAt(t, aspect), b = stonehengeCinematicShotAt(t + 1 / 3600, aspect);
        maxPitchSpeed = Math.max(maxPitchSpeed, Math.abs(b.pitch - a.pitch) * 180 / Math.PI * 60);
      }
      expect(maxPitchSpeed, `approach degrees/second, aspect ${aspect}`).toBeLessThan(3);
    }
    for (const aspect of [390 / 844, 320 / 844]) {
      for (const [t, pitch] of [[.78, 10.2], [.92, 9.6], [1, 9.2]]) {
        expect(stonehengeCinematicShotAt(t!, aspect).pitch * 180 / Math.PI).toBeCloseTo(pitch!, 10);
      }
    }
  });
});
