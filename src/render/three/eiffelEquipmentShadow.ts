import { Mesh, Vector3, type Object3D } from 'three';

/** Preserve substantial source solids and the carried member. A mixed material
 * batch keeps all its casters; no new batches or replacement geometry are made.
 */
export function hasMajorEquipmentShadow(sources: readonly Mesh[]): boolean {
  const size = new Vector3(), scale = new Vector3();
  return sources.some(source => {
    for (let owner: Object3D | null = source; owner; owner = owner.parent) {
      if (owner.userData.wf_role === 'actual-payload') return true;
    }
    source.geometry.computeBoundingBox();
    source.geometry.boundingBox!.getSize(size);
    source.getWorldScale(scale);
    const dimensions = size.multiply(scale).toArray().map(Math.abs).sort((a, b) => a - b);
    return dimensions[0]! * dimensions[1]! >= .08;
  });
}
