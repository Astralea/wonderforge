import { expect, it, vi } from 'vitest';
import { ShaderMaterial } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPipeline } from '../src/render/three/RenderPipeline';

it('releases the real grade and output pass materials along with composer targets', () => {
  const grade = new ShaderPass(new ShaderMaterial());
  const output = new OutputPass();
  const released = [vi.fn(), vi.fn()];
  grade.material.addEventListener('dispose', released[0]!);
  output.material.addEventListener('dispose', released[1]!);
  const composer = { passes: [grade, output], dispose: vi.fn() };
  const renderer = { renderLists: { dispose: vi.fn() }, dispose: vi.fn() };
  const pipeline = { scene: { environment: null }, sun: { shadow: {} }, composer, renderer };
  RenderPipeline.prototype.dispose.call(pipeline as unknown as RenderPipeline);
  for (const dispose of [...released, composer.dispose, renderer.renderLists.dispose, renderer.dispose]) expect(dispose).toHaveBeenCalledOnce();
});
