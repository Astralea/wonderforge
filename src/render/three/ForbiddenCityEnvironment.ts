import { Group, Mesh, MeshStandardMaterial } from 'three';
import type { LightState } from '../../engine/daynight';
import { configureEiffelWater } from './eiffelWater';
import { injectMaterialRecipe } from './proceduralDetail';
import { batchForbiddenCityStatic, disposeForbiddenCityRoot } from './forbiddenCityAssets';

type DetailShader = { uniforms: Record<string, { value: unknown }> };

/** Static authored courts, terraces, walls, banks and Beijing setting. Water
 * remains source geometry; only its shared deterministic optical uniforms tick. */
export class ForbiddenCityEnvironment {
  readonly group: Group;
  private readonly waterMaterials = new Set<MeshStandardMaterial>();
  private disposed = false;

  constructor(source: Group) {
    source.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const role = String(object.userData.wf_role ?? '');
      if (!/(?:moat|water)/i.test(role)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof MeshStandardMaterial)) throw Error(`Forbidden City water role ${role} requires MeshStandardMaterial`);
        if (!this.waterMaterials.has(material)) {
          injectMaterialRecipe(material, 'water');
          configureEiffelWater(material);
          this.waterMaterials.add(material);
        }
      }
    });
    this.group = batchForbiddenCityStatic(source, 'forbidden-city-environment');
    this.group.userData.waterMaterialCount = this.waterMaterials.size;
  }

  update(seconds: number, light: LightState): void {
    if (!Number.isFinite(seconds)) throw Error('Forbidden City environment time must be finite');
    for (const material of this.waterMaterials) {
      const shaders = material.userData.wfDetailShaders as DetailShader[] | undefined;
      if (shaders) for (const shader of shaders) shader.uniforms.uWfTime!.value = seconds;
    }
    this.group.userData.seconds = seconds;
    this.group.userData.light = light;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeForbiddenCityRoot(this.group);
  }
}
