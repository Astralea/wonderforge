import { describe, expect, it, vi } from 'vitest';
import { Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera, Scene, Vector2, Vector3 } from 'three';
import { colosseumAstronomyAtJulianDay, julianCalendarToJulianDay, type ColosseumAstronomySample } from '../src/engine/colosseumAstronomy';
import { colosseumLightState, type ColosseumLightingSky } from '../src/engine/colosseumLighting';
import type { LightState } from '../src/engine/daynight';
import { RenderPipeline } from '../src/render/three/RenderPipeline';
import { sampleColosseumSky } from '../src/data/colosseumSky';

const reference = colosseumAstronomyAtJulianDay(julianCalendarToJulianDay(80, 6, 21, 20));

function skyAt(
  elevation: number,
  visibility: number,
  moon: Partial<ColosseumAstronomySample['moon']> = {},
): ColosseumLightingSky {
  return {
    zenith: '#15213a', horizon: '#243047', sunTint: '#ffc48a',
    astronomy: {
      ...reference,
      sun: { ...reference.sun, azimuthDegrees: 270, elevationDegrees: elevation, horizonVisibility: visibility },
      moon: { ...reference.moon, azimuthDegrees: 90, elevationDegrees: 25, horizonVisibility: 1, illuminatedFraction: 0.6, ...moon },
    },
  };
}

function pipelineRig() {
  const pipeline = Object.create(RenderPipeline.prototype) as RenderPipeline;
  const sun = new DirectionalLight(), ambient = new HemisphereLight(), scene = new Scene();
  scene.add(sun, sun.target, ambient);
  scene.fog = new Fog('#778899', 100, 1000);
  const grade = { uniforms: { uTint: { value: new Color() }, uTintStrength: { value: 0 }, uGrainTime: { value: 0 } } };
  const godrays = { uniforms: { uSunUV: { value: new Vector2() }, uIntensity: { value: 0 }, uStreak: { value: 0 } } };
  const camera = new PerspectiveCamera(35, 1.6, 0.5, 2400);
  Object.assign(pipeline, {
    sun, ambient, scene, camera, grade, godrays, bloom: { enabled: true },
    sunTarget: new Vector3(), sunDirection: new Vector3(), sunWorld: new Vector3(),
    warmTint: new Color(), fogNeutralizer: new Color('#c7b499'),
    ambientSkyNeutralizer: new Color('#fff5df'), ambientGroundNeutralizer: new Color('#8b6a42'),
    haze: 0.5, renderer: { info: { autoReset: true, reset: vi.fn() } }, composer: { render: vi.fn() },
  });
  return { pipeline, sun, ambient, scene, camera, grade, godrays };
}

describe('Colosseum astronomical key and photographic fill', () => {
  it('hands off daylight to the real rising Moon only after the post-sunset gap', () => {
    const workEnd = sampleColosseumSky(.8), between = sampleColosseumSky(.84), risen = sampleColosseumSky(1);
    expect(workEnd.astronomy.sun.horizonVisibility).toBe(1);
    expect(colosseumLightState(workEnd).keyLight).toBeUndefined();
    expect(between.astronomy.sun.horizonVisibility).toBe(0);
    expect(between.astronomy.moon.horizonVisibility).toBe(0);
    expect(colosseumLightState(between).keyLight?.visibility).toBe(0);
    const lunarLight = colosseumLightState(risen);
    expect(lunarLight.sun.visibility).toBe(0);
    expect(lunarLight.keyLight?.visibility).toBeGreaterThan(.98);
    expect(lunarLight.keyLight?.azimuth).toBe(risen.astronomy.moon.azimuthDegrees - 90);
    expect(lunarLight.keyLight?.elevation).toBe(risen.astronomy.moon.elevationDegrees);
    expect(lunarLight.emissive).toBe(0);
  });

  it('keeps the actual Sun through partial sunset, then fades a visible Moon after twilight begins', () => {
    for (const [elevation, visibility] of [[35, 1], [0, 0.5], [-0.2, 0.1]]) {
      const light = colosseumLightState(skyAt(elevation!, visibility!));
      expect(light.keyLight).toBeUndefined();
      expect(light.sun.visibility).toBe(visibility);
      expect(light.sun.azimuth).toBe(180); // Compass west -> renderer negative X.
      expect(light.sun.elevation).toBe(elevation);
    }
    expect(colosseumLightState(skyAt(-0.5, 0)).keyLight?.visibility).toBe(0);
    expect(colosseumLightState(skyAt(-1, 0)).keyLight?.visibility).toBe(0);
    const middle = colosseumLightState(skyAt(-3.5, 0)).keyLight!;
    const night = colosseumLightState(skyAt(-6, 0)).keyLight!;
    expect(middle.visibility).toBeCloseTo(night.visibility! / 2, 12);
    expect(night.visibility).toBeGreaterThan(0);
    expect(night.intensity).toBeGreaterThanOrEqual(0.15);
    expect(night.intensity).toBeLessThanOrEqual(0.25);
  });

  it('gates lunar key energy by real horizon visibility and illuminated phase', () => {
    const full = colosseumLightState(skyAt(-12, 0, { illuminatedFraction: 1 })).keyLight!;
    const crescent = colosseumLightState(skyAt(-12, 0, { illuminatedFraction: 0.15 })).keyLight!;
    const halfRisen = colosseumLightState(skyAt(-12, 0, { illuminatedFraction: 1, horizonVisibility: 0.5 })).keyLight!;
    const below = colosseumLightState(skyAt(-12, 0, { horizonVisibility: 0, elevationDegrees: -2 })).keyLight!;
    const newMoon = colosseumLightState(skyAt(-12, 0, { illuminatedFraction: 0 })).keyLight!;
    expect(crescent.visibility).toBeGreaterThan(0);
    expect(crescent.visibility).toBeLessThan(full.visibility!);
    expect(halfRisen.visibility).toBeCloseTo(full.visibility! / 2, 12);
    expect(below.visibility).toBe(0);
    expect(newMoon.visibility).toBe(0);
  });

  it('uses dimmer cool night fill and no fabricated emissive lighting', () => {
    const day = colosseumLightState(skyAt(40, 1));
    const night = colosseumLightState(skyAt(-15, 0));
    expect(night.ambient.intensity).toBeLessThan(day.ambient.intensity / 2);
    const dayColor = new Color(day.ambient.skyColor), nightColor = new Color(night.ambient.skyColor);
    expect(nightColor.b).toBeGreaterThan(nightColor.r);
    expect(nightColor.r + nightColor.g + nightColor.b).toBeLessThan((dayColor.r + dayColor.g + dayColor.b) * 0.75);
    expect(night.emissive).toBe(0);
    expect(day.emissive).toBe(0);
  });

  it('is deterministic through forward/reverse astronomical seeks without mutating the sample', () => {
    const sky = skyAt(-8, 0), before = structuredClone(sky);
    const initial = colosseumLightState(sky);
    colosseumLightState(skyAt(30, 1));
    colosseumLightState(skyAt(-0.1, 0.25));
    expect(colosseumLightState(sky)).toEqual(initial);
    expect(sky).toEqual(before);
  });
});

describe('one renderer key with independently tracked solar effects', () => {
  it('returns the true west/below-horizon Sun while the single key points to the east/rising Moon', () => {
    const { pipeline, sun, scene } = pipelineRig();
    const direction = pipeline.updateLight(colosseumLightState(skyAt(-12, 0)));
    expect(direction.x).toBeCloseTo(-0.9781476007, 8);
    expect(direction.y).toBeCloseTo(-0.2079116908, 8);
    expect(direction.z).toBeCloseTo(0, 12);
    expect(pipeline.keyLightDirection.x).toBeCloseTo(0.9063077870, 8);
    expect(pipeline.keyLightDirection.y).toBeCloseTo(0.4226182617, 8);
    expect(pipeline.keyLightDirection.z).toBeCloseTo(0, 12);
    expect(sun.position.clone().normalize().distanceTo(pipeline.keyLightDirection)).toBeLessThan(1e-12);
    expect(scene.children.filter(child => child instanceof DirectionalLight)).toEqual([sun]);
  });

  it('keeps solar grade, shafts and lens streak off when the Moon illuminates the monument', () => {
    const { pipeline, sun, camera, grade, godrays } = pipelineRig();
    const direction = pipeline.updateLight(colosseumLightState(skyAt(-12, 0)));
    // Deliberately face the hidden solar direction: off-screen culling must not
    // be the reason its screen effects disappear while the lunar key is on.
    camera.lookAt(direction);
    camera.updateMatrixWorld();
    pipeline.render(0.96);
    expect(sun.intensity).toBeGreaterThan(0);
    expect(grade.uniforms.uTintStrength.value).toBe(0);
    expect(godrays.uniforms.uIntensity.value).toBe(0);
    expect(godrays.uniforms.uStreak.value).toBe(0);
  });

  it('turns the one key completely off when both physical discs are below the horizon', () => {
    const { pipeline, sun } = pipelineRig();
    pipeline.updateLight(colosseumLightState(skyAt(-12, 0, { horizonVisibility: 0, elevationDegrees: -5 })));
    expect(sun.intensity).toBe(0);
  });

  it('can disable only the sampled lens streak while retaining shafts and the default for other scenes', () => {
    const { pipeline, camera, godrays } = pipelineRig();
    const direction = pipeline.updateLight(colosseumLightState(skyAt(5, 1)));
    camera.lookAt(direction);
    camera.updateMatrixWorld();
    pipeline.render(0.7);
    const defaultStreak = godrays.uniforms.uStreak.value;
    const defaultShafts = godrays.uniforms.uIntensity.value;
    expect(defaultStreak).toBeGreaterThan(0);
    expect(defaultShafts).toBeGreaterThan(0);
    pipeline.setLensStreakEnabled(false);
    pipeline.render(0.7);
    expect(godrays.uniforms.uStreak.value).toBe(0);
    expect(godrays.uniforms.uIntensity.value).toBe(defaultShafts);
    pipeline.setLensStreakEnabled(true);
    pipeline.render(0.7);
    expect(godrays.uniforms.uStreak.value).toBe(defaultStreak);
  });

  it('preserves the existing key, fill and solar-grade formula when the optional source is absent', () => {
    const { pipeline, sun, ambient, grade } = pipelineRig();
    for (const visibility of [undefined, 1, 0.3, 0]) {
      const light: LightState = {
        sun: { azimuth: 0, elevation: 30, color: '#ffe4c8', intensity: 1.2, visibility },
        ambient: { skyColor: '#bacbde', groundColor: '#81745f', intensity: 0.4 },
        sky: '#ddeeff', fog: '#ddeeff', emissive: 0,
      };
      const direction = pipeline.updateLight(light);
      expect(direction.x).toBeCloseTo(Math.sqrt(3) / 2, 14);
      expect(direction.y).toBeCloseTo(0.5, 14);
      expect(direction.z).toBe(0);
      expect(sun.position.distanceTo(direction.clone().multiplyScalar(145))).toBeLessThan(1e-12);
      expect(pipeline.keyLightDirection.equals(direction)).toBe(true);
      expect(sun.intensity).toBe((0.72 + 1.2 * 1.72) * (visibility ?? 1));
      expect(sun.color.equals(new Color(light.sun.color))).toBe(true);
      expect(ambient.intensity).toBe(0.9 + 0.4 * 1.65);
      expect(ambient.color.equals(new Color(light.ambient.skyColor).lerp(new Color('#fff5df'), 0.43))).toBe(true);
      expect(grade.uniforms.uTintStrength.value).toBeCloseTo(0, 14);
    }
  });

  it('restores solar illumination on reverse seek without retaining the lunar key', () => {
    const { pipeline, sun } = pipelineRig();
    const day = colosseumLightState(skyAt(40, 1));
    pipeline.updateLight(day);
    const before = { position: sun.position.clone(), color: sun.color.clone(), intensity: sun.intensity };
    pipeline.updateLight(colosseumLightState(skyAt(-12, 0)));
    pipeline.updateLight(day);
    expect(sun.position.equals(before.position)).toBe(true);
    expect(sun.color.equals(before.color)).toBe(true);
    expect(sun.intensity).toBe(before.intensity);
  });
});
