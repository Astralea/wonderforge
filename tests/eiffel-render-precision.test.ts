import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, MeshStandardMaterial, ShaderLib, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { eiffelCinematicShotAt } from '../src/engine/eiffelCamera';
import { EIFFEL_CAMERA_NEAR } from '../src/render/three/eiffelRenderPrecision';
import { configureEiffelWater } from '../src/render/three/eiffelWater';
import { injectMaterialRecipe } from '../src/render/three/proceduralDetail';

describe('Eiffel render precision', () => {
  it('composes the water filter with the actual shared material recipe exactly once', () => {
    const material = new MeshStandardMaterial();
    injectMaterialRecipe(material, 'water');
    configureEiffelWater(material);
    const hook = material.onBeforeCompile;
    configureEiffelWater(material);
    expect(material.onBeforeCompile).toBe(hook);
    const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
    hook.call(material, shader as Parameters<typeof hook>[0], {} as Parameters<typeof hook>[1]);
    expect(shader.fragmentShader.match(/float wfFbm\(vec2 p\)/g)).toHaveLength(1);
    expect(shader.fragmentShader).toContain('dFdx(p)');
    expect(shader.fragmentShader).toContain('span * 2.13');
    expect(shader.uniforms).toHaveProperty('uEiffelRippleFilter', material.userData.eiffelRippleFilter);
    expect(material.userData.eiffelRippleFilter.value).toBe(1);
    expect(material.customProgramCacheKey()).toContain('eiffel-footprint-water-v1');
    material.dispose();
  });

  it('keeps the entire new near-frustum outside transformed city and tower mesh bounds throughout desktop/mobile orbits', async () => {
    const boxes: Box3[] = [];
    for (const file of ['public/models/paris-1889/paris-city.glb', 'public/models/eiffel/tower-rebuilt.glb']) {
      const bytes = readFileSync(file);
      const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.geometry.computeBoundingBox();
        boxes.push(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
      });
    }
    expect(boxes.length).toBeGreaterThan(10);
    const position = new Vector3();
    for (const aspect of [1440 / 900, 390 / 844]) for (let i = 0; i <= 200; i++) {
      const shot = eiffelCinematicShotAt(i / 200, aspect);
      position.set(shot.target[0] + Math.cos(shot.azimuth) * Math.cos(shot.pitch) * shot.radius,
        shot.target[1] + Math.sin(shot.pitch) * shot.radius,
        shot.target[2] + Math.sin(shot.azimuth) * Math.cos(shot.pitch) * shot.radius);
      const tanY = Math.tan(shot.fov * Math.PI / 360);
      const nearCornerDistance = EIFFEL_CAMERA_NEAR * Math.sqrt(1 + tanY * tanY * (1 + aspect * aspect));
      let minimum = Infinity;
      for (const box of boxes) minimum = Math.min(minimum, box.distanceToPoint(position));
      expect(minimum, `camera ${i / 200}, aspect ${aspect}`).toBeGreaterThan(nearCornerDistance);
    }
  }, 30000);
});
