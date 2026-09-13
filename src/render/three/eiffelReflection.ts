import { Color, DataTexture, EquirectangularReflectionMapping, FloatType, LinearSRGBColorSpace, RGBAFormat } from 'three';
import { sampleEiffelSky } from '../../data/eiffelSky';

/** Broad outdoor reflection source. No painted sun or fictitious buildings. */
export function createEiffelReflectionSource(): DataTexture {
  const sky = sampleEiffelSky(.45);
  const zenith = new Color(sky.zenith);
  const horizon = new Color(sky.horizon);
  const ground = new Color('#857763');
  const color = new Color();
  const width = 128, height = 64;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    // EquirectangularReflectionMapping maps +Y to v=1. DataTexture row zero
    // is v=0 (no image flip), so the first row must contain the ground.
    const elevation = -Math.cos((y + .5) / height * Math.PI);
    if (elevation >= 0) color.copy(horizon).lerp(zenith, Math.pow(elevation, .55));
    else color.copy(horizon).lerp(ground, Math.min(1, -elevation * 4));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data.set([color.r, color.g, color.b, 1], i);
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
  texture.name = 'eiffel-paris-sky-reflection-source';
  texture.colorSpace = LinearSRGBColorSpace;
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

export function eiffelReflectionIntensity(sunElevation: number): number {
  return .025 + .5 * Math.max(0, Math.min(1, sunElevation / .5));
}
