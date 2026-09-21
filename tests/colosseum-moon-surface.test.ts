import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ShaderMaterial, SRGBColorSpace, Texture } from 'three';
import { ColosseumSkyDome } from '../src/render/three/ColosseumSkyDome';
import { COLOSSEUM_MOON_SURFACE } from '../src/data/colosseumMoonSurface';

describe('Colosseum lunar surface delivery', () => {
  it('ships the unchanged compact NASA map with its source and credit', () => {
    const bytes = readFileSync(resolve('src/assets/lunar/lroc-color-poles-1k.jpg'));
    expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
    expect(bytes.length).toBe(COLOSSEUM_MOON_SURFACE.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(COLOSSEUM_MOON_SURFACE.sha256);
    expect(COLOSSEUM_MOON_SURFACE.credit).toBe("NASA's Scientific Visualization Studio");
    expect(COLOSSEUM_MOON_SURFACE.source).toBe('https://svs.gsfc.nasa.gov/4720/');
    expect(bytes.length).toBeLessThan(150_000);
  });

  it('waits for the image and binds it as sRGB surface colour', async () => {
    let resolveImage!: (texture: Texture) => void;
    const image = new Texture();
    const sky = new ColosseumSkyDome(() => new Promise(resolve => { resolveImage = resolve; }));
    const uniforms = (sky.mesh.material as ShaderMaterial).uniforms;
    let ready = false;
    void sky.ready.then(() => { ready = true; });
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(uniforms.uMoonSurfaceReady.value).toBe(0);
    resolveImage(image);
    await sky.ready;
    expect(uniforms.uMoonSurfaceMap.value).toBe(image);
    expect(uniforms.uMoonSurfaceReady.value).toBe(1);
    expect(image.colorSpace).toBe(SRGBColorSpace);
    expect(image.flipY).toBe(true);
    const released = vi.fn(); image.addEventListener('dispose', released);
    sky.dispose(); sky.dispose();
    expect(released).toHaveBeenCalledOnce();
  });

  it('settles readiness on failed image load and retains the fallback', async () => {
    const sky = new ColosseumSkyDome(() => Promise.reject(new Error('unavailable image')));
    await expect(sky.ready).resolves.toBeUndefined();
    const uniforms = (sky.mesh.material as ShaderMaterial).uniforms;
    expect(uniforms.uMoonSurfaceMap.value).toBeInstanceOf(Texture);
    expect(uniforms.uMoonSurfaceReady.value).toBe(0);
    expect(sky.mesh.userData.lunarSurfaceStatus).toBe('fallback');
    sky.dispose();
  });

  it('disposes a late image without rebinding a scene that has been left', async () => {
    let resolveImage!: (texture: Texture) => void;
    const image = new Texture(), released = vi.fn();
    image.addEventListener('dispose', released);
    const sky = new ColosseumSkyDome(() => new Promise(resolve => { resolveImage = resolve; }));
    await Promise.resolve();
    sky.dispose(); resolveImage(image);
    await sky.ready;
    expect(released).toHaveBeenCalledOnce();
    const uniforms = (sky.mesh.material as ShaderMaterial).uniforms;
    expect(uniforms.uMoonSurfaceMap.value).not.toBe(image);
    expect(uniforms.uMoonSurfaceReady.value).toBe(0);
    expect(sky.mesh.userData.lunarSurfaceStatus).toBe('disposed');
  });
});
