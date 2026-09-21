import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3, ShaderMaterial, DirectionalLight } from 'three';
import { COLOSSEUM_CELESTIAL_ANGULAR_SCALE, colosseumSunStateAt, sampleColosseumSky } from '../src/data/colosseumSky';
import { colosseumCinematicShotAt } from '../src/engine/colosseumCamera';
import { colosseumTerrainHeightAt, colosseumWesternReliefAt } from '../src/engine/colosseumTerrain';
import { ColosseumSkyDome } from '../src/render/three/ColosseumSkyDome';
import { deriveSceneFogColor } from '../src/render/three/RenderPipeline';
import { Color } from 'three';
import { applyColosseumShadow } from '../src/render/three/colosseumShadow';

function direction(t: number): Vector3 {
  const state = colosseumSunStateAt(t), az = state.azimuth * Math.PI / 180, el = state.elevation * Math.PI / 180;
  return new Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
}

describe('Roman ephemeris sky presentation', () => {
  it('uses a physical east-up-south renderer compass without holding the sun above the horizon', () => {
    for (const t of [0, .3, .5, .72, .9, 1]) {
      const sun = sampleColosseumSky(t).astronomy.sun;
      expect(direction(t).distanceTo(new Vector3(sun.direction[0], sun.direction[1], -sun.direction[2]))).toBeLessThan(1e-9);
    }
    expect(direction(0).x).toBeGreaterThan(0);
    expect(direction(.47).z).toBeGreaterThan(0); // physical south is +Z
    expect(colosseumSunStateAt(1).elevation).toBeLessThan(-10);
    expect(colosseumSunStateAt(1)).not.toEqual(colosseumSunStateAt(.9));
  });

  it('lets the waning gibbous Moon rise across a fixed closing bearing in both formats', () => {
    for (const aspect of [16/9, 1.6, 390/844, 320/844]) {
      let previousY = -Infinity;
      const settledShot = colosseumCinematicShotAt(.88, aspect);
      for (const t of [.88, .91, .94, .97, 1]) {
        const shot = colosseumCinematicShotAt(t, aspect);
        expect(shot.azimuth).toBe(settledShot.azimuth);
        expect(shot.pitch).toBe(settledShot.pitch);
        const camera = new PerspectiveCamera(shot.fov, aspect, .5, 5000);
        const h = Math.cos(shot.pitch) * shot.radius;
        camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * h, shot.target[1] + Math.sin(shot.pitch) * shot.radius, -shot.target[2] - Math.sin(shot.azimuth) * h);
        camera.lookAt(new Vector3(shot.target[0], shot.target[1], -shot.target[2])); camera.updateMatrixWorld();
        const moon = sampleColosseumSky(t).astronomy.moon;
        const point = camera.position.clone().addScaledVector(new Vector3(moon.direction[0], moon.direction[1], -moon.direction[2]), 2000).project(camera);
        const margin = Math.tan(moon.angularRadiusDegrees * COLOSSEUM_CELESTIAL_ANGULAR_SCALE * Math.PI / 180) / Math.tan(shot.fov * Math.PI / 360);
        expect(Math.abs(point.x) + margin / aspect).toBeLessThan(1);
        expect(Math.abs(point.y) + margin).toBeLessThan(1);
        expect(point.y).toBeGreaterThan(previousY); previousY = point.y;
        expect(moon.illuminatedFraction).toBeGreaterThan(.99);
        expect(moon.illuminatedFraction).toBeLessThan(1);
        expect(moon.waxing).toBe(false);
      }
    }
    expect(sampleColosseumSky(.84).astronomy.moon.horizonVisibility).toBe(0);
    expect(sampleColosseumSky(1).astronomy.moon.horizonVisibility).toBe(1);
  });

  it('uses the same sun and fog colour in the dome as the scene light, including reverse seeks', () => {
    const sky = new ColosseumSkyDome();
    for (const t of [1, .62, 0, .9, 1]) {
      const sample = sampleColosseumSky(t), sun = direction(t);
      sky.update(t, sample, sun);
      const uniforms = (sky.mesh.material as ShaderMaterial).uniforms;
      expect((uniforms.uSunDirection!.value as Vector3).distanceTo(sun)).toBeLessThan(1e-9);
      const fog = deriveSceneFogColor(sample.horizon, new Color(), new Color(sample.fogNeutralizer));
      expect((uniforms.uFogColor!.value as Color).equals(fog)).toBe(true);
      const moon = sample.astronomy.moon;
      expect((uniforms.uMoonDirection!.value as Vector3).toArray()).toEqual([moon.direction[0], moon.direction[1], -moon.direction[2]]);
      expect((uniforms.uMoonLightDirection!.value as Vector3).toArray()).toEqual([moon.lightDirection[0], moon.lightDirection[1], -moon.lightDirection[2]]);
      expect(uniforms.uSunVisibility!.value).toBe(sample.astronomy.sun.horizonVisibility);
      expect(uniforms.uMoonVisibility!.value).toBe(moon.horizonVisibility);
      expect(uniforms.uTime!.value).toBe(sample.t);
    }
    sky.dispose();
  });

  it('covers the long portrait foreground without converting depth bias into metres of detachment', () => {
    const key = new DirectionalLight();
    const grazing = new Vector3(Math.cos(1.4 * Math.PI / 180), Math.sin(1.4 * Math.PI / 180), 0);
    applyColosseumShadow(key, grazing);
    expect(key.shadow.camera.far).toBeGreaterThanOrEqual(1100);
    const biasMetres = Math.abs(key.shadow.bias) * (key.shadow.camera.far - key.shadow.camera.near);
    const worstGroundShift = (biasMetres + key.shadow.normalBias) / grazing.y;
    expect(worstGroundShift).toBeLessThan(.5);
  });

  it('gives the western distance physical relief without changing construction or Caelian waterworks', () => {
    for (let x = -520; x <= 600; x += 20) for (let z = -650; z <= 650; z += 50) expect(colosseumWesternReliefAt(x,z)).toBe(0);
    expect(colosseumTerrainHeightAt(0,0)).toBe(0);
    expect(colosseumTerrainHeightAt(-1030,140)).toBeGreaterThan(30);
    expect(colosseumTerrainHeightAt(-1440,700)).toBeGreaterThan(25);
    expect(colosseumTerrainHeightAt(-1030,1000)).toBeLessThan(colosseumTerrainHeightAt(-1030,140) - 10);
  });
});
