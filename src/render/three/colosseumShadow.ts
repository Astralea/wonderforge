import type { DirectionalLight } from 'three';
import type { Vector3 } from 'three';

/** Shadow volume for the 188 m ellipse and the near Palatine/Caelian slopes. */
export function applyColosseumShadow(sun: DirectionalLight, direction: Vector3): void {
  const target: [number, number, number] = [0, 14, 0];
  sun.target.position.set(...target);
  const reach = 280;
  sun.position.set(
    target[0] + direction.x * reach,
    target[1] + direction.y * reach,
    target[2] + direction.z * reach,
  );
  const camera = sun.shadow.camera;
  camera.left = -170;
  camera.right = 170;
  camera.bottom = -130;
  camera.top = 130;
  camera.near = 8;
  camera.far = 560;
  camera.updateProjectionMatrix();
}
