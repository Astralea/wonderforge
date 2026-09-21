import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { eiffelAxisBox, eiffelSolidBox } from '../src/engine/eiffelOccupancy';
import { eiffelReceiverBeamBox } from '../src/engine/eiffelUpperClearance';
import { EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES } from '../src/engine/eiffelJointCampaign';
import { eiffelFilmAzimuthAt, eiffelGroundLiftFocusPointsAt, eiffelJointCampaignFocusPointsAt, eiffelJointCampaignShotAt } from '../src/engine/eiffelFilm';
import { eiffelFilmEditShotAt, eiffelFilmEditSourceTAt, sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';
import station from '../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
import support from '../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';

const cameraFor = (shot: ReturnType<typeof eiffelFilmEditShotAt>, aspect: number) => {
  const camera = new PerspectiveCamera(shot.fov, aspect, 5, 2400);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * horizontal,
    shot.target[1] + Math.sin(shot.pitch) * shot.radius,
    shot.target[2] + Math.sin(shot.azimuth) * horizontal);
  camera.lookAt(new Vector3(...shot.target)); camera.updateMatrixWorld(true);
  return camera;
};

it('raises the cinematic working lens to 16 degrees while retaining global orbit and the 25 degree fastening view', () => {
  for (const aspect of [1440 / 900, 390 / 844]) {
    for (const seconds of [21.6, 23, 34, 39.6, 42]) {
      const shot = eiffelFilmEditShotAt('cinematic', seconds / 180, aspect);
      expect(shot.pitch * 180 / Math.PI).toBeCloseTo(16, 8);
      expect(shot.fov).toBe(42);
      expect(shot.azimuth).toBe(eiffelFilmAzimuthAt(eiffelFilmEditSourceTAt('cinematic', seconds / 180)));
    }
    const fastening = eiffelJointCampaignShotAt(EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[1]! + 4, aspect);
    expect(fastening.pitch * 180 / Math.PI).toBeCloseTo(25, 8);
  }
});

it('keeps the full payload/rig envelope framed and the 5 metre near frustum outside tower and falsework throughout both cues', () => {
  const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
  const boxes = [
    ...manifest.parts.map(part => eiffelSolidBox(part, part.finalPose)),
    ...[...station.proposedStructure, ...support.beams].map(beam => eiffelReceiverBeamBox(
      beam.a as [number, number, number], beam.b as [number, number, number], beam.halfWidth)),
    ...support.boxes.map(box => eiffelAxisBox(box.center as [number, number, number], box.size as [number, number, number])),
  ];
  for (const aspect of [1440 / 900, 390 / 844]) for (const [start, end] of [[15, 23], [34, 42]]) {
    for (let seconds = start!; seconds <= end!; seconds += .25) {
      const film = sampleEiffelFilmEdit('cinematic', seconds / 180);
      const shot = eiffelFilmEditShotAt('cinematic', seconds / 180, aspect);
      const camera = cameraFor(shot, aspect);
      const points = film.chapter === 'ground-lift'
        ? eiffelGroundLiftFocusPointsAt(film.pilotSeconds)
        : eiffelJointCampaignFocusPointsAt(film.campaignSeconds);
      for (const point of points) {
        const projected = new Vector3(...point).project(camera);
        expect(Math.abs(projected.x), `horizontal ${seconds},${aspect}`).toBeLessThan(.98);
        expect(Math.abs(projected.y), `vertical ${seconds},${aspect}`).toBeLessThan(.92);
        expect(projected.z).toBeGreaterThan(-1);
      }
      const cornerRadius = 5 * Math.sqrt(1 + Math.tan(shot.fov * Math.PI / 360) ** 2 * (1 + aspect ** 2));
      for (const box of boxes) {
        const delta = camera.position.toArray().map((value, i) => value - box.center[i]!);
        if (Math.hypot(...delta) - Math.hypot(...box.half) > cornerRadius) continue;
        const distance = Math.hypot(...box.axes.map((axis, i) => Math.max(0,
          Math.abs(axis.reduce((sum, value, j) => sum + value * delta[j]!, 0)) - box.half[i]!)));
        expect(distance, `near frustum ${seconds},${aspect}`).toBeGreaterThan(cornerRadius);
      }
    }
  }
});

it('retains continuous camera position and attitude at cinematic entry/exit boundaries', () => {
  for (const aspect of [1440 / 900, 390 / 844]) for (const seconds of [9, 12, 24, 28, 30, 34, 42, 47, 48]) {
    const before = cameraFor(eiffelFilmEditShotAt('cinematic', (seconds - 1e-5) / 180, aspect), aspect);
    const after = cameraFor(eiffelFilmEditShotAt('cinematic', (seconds + 1e-5) / 180, aspect), aspect);
    expect(before.position.distanceTo(after.position), `${seconds}s position`).toBeLessThan(.01);
    expect(before.quaternion.angleTo(after.quaternion), `${seconds}s attitude`).toBeLessThan(.001);
  }
});
