import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { SYDNEY_SAILS, sydneyShellPoint, SYDNEY_PODIUM_MESHES } from '../src/data/sydneyShells';
import { sydneyCinematicShotAt } from '../src/engine/sydneyCamera';
import { SYDNEY_CAMERA_NEAR } from '../src/render/three/sydneyRenderPrecision';

/** Protect the complete authored silhouette in the actual film, including the
 * wide south stair and northern beaks, rather than a guessed central box. */
describe('Sydney photographed reveal framing', () => {
  it.each([[1440, 900], [390, 844], [844, 390]])('keeps the complete roof and podium visible at %ix%i', (w, h) => {
    const vertices: number[][] = [];
    for (const shell of SYDNEY_SAILS)
      for (const side of [-1, 1] as const)
        for (let u = 0; u <= 16; u++)
          for (let v = 0; v <= 16; v++)
            vertices.push(sydneyShellPoint(shell, u / 16, v / 16, side));
    for (const part of SYDNEY_PODIUM_MESHES)
      for (let i = 0; i < part.vertices.length; i += 9)
        vertices.push(part.vertices.slice(i, i + 3));
    for (const t of [.82, .92, 1]) {
      const shot = sydneyCinematicShotAt(t, w / h);
      const camera = new PerspectiveCamera(shot.fov, w / h, SYDNEY_CAMERA_NEAR, 12000);
      camera.position.set(
        shot.target[0] + Math.cos(shot.azimuth) * Math.cos(shot.pitch) * shot.radius,
        shot.target[1] + Math.sin(shot.pitch) * shot.radius,
        shot.target[2] + Math.sin(shot.azimuth) * Math.cos(shot.pitch) * shot.radius,
      );
      camera.lookAt(...shot.target);
      camera.updateMatrixWorld();
      for (const p of vertices) {
        const ndc = new Vector3(p[0], p[1], p[2]).project(camera);
        expect(Math.abs(ndc.x), `t${t} point${p}`).toBeLessThan(.94);
        expect(Math.abs(ndc.y), `t${t} point${p}`).toBeLessThan(.94);
        expect(ndc.z).toBeGreaterThan(-1);
        expect(ndc.z).toBeLessThan(1);
      }
    }
  });
});
