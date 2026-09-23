import { expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { RenderPipeline } from '../src/render/three/RenderPipeline';

it('retains a restrained architectural bloom level through composed frames', () => {
  const pipeline = Object.create(RenderPipeline.prototype) as RenderPipeline;
  const camera = new PerspectiveCamera(35, 1.6, 20, 12000);
  camera.updateMatrixWorld();
  const godrays = { uniforms: { uSunUV: { value: new Vector2() }, uIntensity: { value: 0 }, uStreak: { value: 0 } } };
  const composer = { render: vi.fn() };
  const bloom = { enabled: true, strength: 0.32 };
  Object.assign(pipeline, { camera, godrays, composer,
    sunWorld: new Vector3(), sunDirection: new Vector3(0, 0, -1),
    shaftLowSun: 1, haze: 0.5, sunVisibility: 1, bloom,
    grade: { uniforms: { uGrainTime: { value: 0 } } },
    renderer: { info: { reset: vi.fn(), autoReset: true } },
  });
  pipeline.render(0.6);
  expect(godrays.uniforms.uIntensity.value).toBeGreaterThan(0);
  pipeline.setBloomStrength(0.06);
  for (const t of [0.6, 0.7, 0.4, 0.6]) {
    pipeline.render(t);
    expect(bloom.strength).toBe(0.06);
    expect(bloom.enabled).toBe(true);
    expect(godrays.uniforms.uIntensity.value).toBeGreaterThan(0);
  }
  expect(composer.render).toHaveBeenCalledTimes(5);
});
