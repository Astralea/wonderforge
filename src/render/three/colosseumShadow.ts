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
  // Low celestial keys cast long shadows through the portrait foreground.
  // The old 560m depth cut those shadows off across the visible valley floor.
  camera.far = 1_200;
  // Keep receiver offset in metres when extending the depth interval. Large
  // normalized bias becomes a detached ground shadow under a grazing key.
  const grazing = Math.max(0, Math.min(1, direction.y / .25));
  sun.shadow.bias = -(0.004 + .022 * grazing) / (camera.far - camera.near);
  sun.shadow.normalBias = .003 + .015 * grazing;
  camera.updateProjectionMatrix();
}
