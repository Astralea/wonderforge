import type { DirectionalLight, Vector3 } from 'three';

/**
 * Shadow volume for the sarsen ring, Heel Stone, and the long solstice throw
 * along the NE–SW axis. Low sun expands the ortho slab so a 7 m upright's
 * ~55 m shadow still lands on the turf map.
 */
export function applyStonehengeShadow(sun: DirectionalLight, direction: Vector3): void {
  const target: [number, number, number] = [0, 2.6, 0];
  const low = Math.max(0, Math.min(1, 1 - direction.y / 0.38));
  const reach = 168 + low * 90;
  sun.target.position.set(...target);
  sun.position.set(
    target[0] + direction.x * reach,
    target[1] + direction.y * reach,
    target[2] + direction.z * reach,
  );
  const half = 96 + low * 48;
  const camera = sun.shadow.camera;
  camera.left = -half;
  camera.right = half;
  camera.bottom = -half * 0.8;
  camera.top = half * 0.8;
  camera.near = 4;
  camera.far = reach * 2.15;
  camera.updateProjectionMatrix();
}
