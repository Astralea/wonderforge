import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { eiffelSolidBox } from '../src/engine/eiffelOccupancy';
import { EIFFEL_SECOND_FLOOR_RELAY_SEQUENCE_DURATION as DURATION } from '../src/engine/eiffelSecondFloorRelaySequence';
import { eiffelSecondFloorRelayCameraPointsAt, eiffelSecondFloorRelayFilmShotAt } from '../src/engine/eiffelSecondFloorRelayCamera';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_FIRST_FLOOR_END_SECONDS, EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE, eiffelFilmAzimuthAt, eiffelFilmShotAt } from '../src/engine/eiffelFilm';

const cameraAt = (seconds: number, aspect: number) => {
  const t = (EIFFEL_FILM_FIRST_FLOOR_END_SECONDS + seconds / EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE) / EIFFEL_FILM_DURATION;
  const shot = eiffelSecondFloorRelayFilmShotAt(seconds, aspect, eiffelFilmAzimuthAt(t));
  const camera = new PerspectiveCamera(shot.fov, aspect, 5, 2400);
  const h = shot.radius * Math.cos(shot.pitch);
  camera.position.set(shot.target[0] + h * Math.cos(shot.azimuth), shot.target[1] + shot.radius * Math.sin(shot.pitch), shot.target[2] + h * Math.sin(shot.azimuth));
  camera.lookAt(new Vector3(...shot.target)); camera.updateMatrixWorld(true);
  return camera;
};

describe('Second-floor relay construction framing', () => {
  it('fits the workers, full lifted carrier and receiving equipment in both viewport shapes', () => {
    for (const aspect of [1440 / 900, 390 / 844]) for (let s = 0; s <= DURATION; s += 2) {
      const camera = cameraAt(s, aspect);
      for (const p of eiffelSecondFloorRelayCameraPointsAt(s)) {
        const v = new Vector3(...p).project(camera);
        expect(Math.abs(v.x), `x ${s}/${aspect}`).toBeLessThan(.91);
        expect(Math.abs(v.y), `y ${s}/${aspect}`).toBeLessThan(.91);
        expect(v.z).toBeGreaterThan(-1);
      }
    }
  });
  it('keeps the full five-metre near frustum outside completed tower solids', () => {
    const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
    const boxes = manifest.parts.map(part => eiffelSolidBox(part, part.finalPose));
    const samples = [...Array.from({ length: 33 }, (_, i) => i / 8), ...Array.from({ length: Math.floor(DURATION / 2) + 1 }, (_, i) => i * 2)];
    for (const aspect of [1440 / 900, 390 / 844]) for (const s of samples) {
      const t = (EIFFEL_FILM_FIRST_FLOOR_END_SECONDS + s / EIFFEL_FILM_SECOND_FLOOR_RELAY_RATE) / EIFFEL_FILM_DURATION;
      const shot = eiffelFilmShotAt(t, aspect), camera = new PerspectiveCamera(shot.fov, aspect, 5, 2400), horizontal = shot.radius * Math.cos(shot.pitch);
      camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal, shot.target[1] + Math.sin(shot.pitch) * shot.radius, shot.target[2] + Math.sin(shot.azimuth) * horizontal);
      const p = camera.position.toArray();
      const near = 5 * Math.sqrt(1 + Math.tan(camera.fov * Math.PI / 360) ** 2 * (1 + aspect ** 2));
      let distance = Infinity, closest = '';
      for (const [i, box] of boxes.entries()) {
        const delta = p.map((v, k) => v - box.center[k]!);
        const d = Math.hypot(...box.axes.map((axis, k) => Math.max(0, Math.abs(axis.reduce((sum, v, j) => sum + v * delta[j]!, 0)) - box.half[k]!)));
        if (d < distance) { distance = d; closest = manifest.parts[i]!.id; }
      }
      expect(distance, `camera ${s}/${aspect}: ${closest}`).toBeGreaterThan(near);
    }
  });
  it('has continuous framing and deterministic reverse seeks', () => {
    for (const s of [38, 46, 64, 74, 104, 116, DURATION - 138, DURATION - 126, DURATION - 36, DURATION - 20, DURATION - 12, DURATION - 6]) {
      const a = eiffelSecondFloorRelayFilmShotAt(s - 1e-5), b = eiffelSecondFloorRelayFilmShotAt(s + 1e-5);
      expect(Math.hypot(...a.target.map((v, i) => v - b.target[i]!))).toBeLessThan(.001);
      expect(Math.abs(a.fov - b.fov)).toBeLessThan(.001);
      const saved = eiffelSecondFloorRelayFilmShotAt(s);
      eiffelSecondFloorRelayFilmShotAt(DURATION); eiffelSecondFloorRelayFilmShotAt(0);
      expect(eiffelSecondFloorRelayFilmShotAt(s)).toEqual(saved);
    }
  });
});
