import type { DirectionalLight } from 'three';
import type { EiffelShadowFrame } from '../../engine/eiffelShadow';

/** Apply a fitted frame without allocating a light or another shadow map. */
export function applyEiffelShadowFrame(sun: DirectionalLight, frame: EiffelShadowFrame): void {
  sun.target.position.set(...frame.target);
  sun.position.set(...frame.lightPosition);
  const camera = sun.shadow.camera;
  camera.left = frame.left;
  camera.right = frame.right;
  camera.bottom = frame.bottom;
  camera.top = frame.top;
  camera.near = frame.near;
  camera.far = frame.far;
  camera.updateProjectionMatrix();
}

/** Exact original projection and target for editions that do not opt in. */
export function restoreEiffelShadowFrame(sun: DirectionalLight, direction: readonly [number, number, number]): void {
  const target: [number, number, number] = [-15, 7, -17];
  applyEiffelShadowFrame(sun, {
    target, lightPosition: target.map((v, i) => v + direction[i]! * 145) as [number, number, number],
    left: -82, right: 82, bottom: -70, top: 70, near: 2, far: 300,
  });
}
