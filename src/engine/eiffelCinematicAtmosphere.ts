import { eiffelSunStateAt, sampleEiffelSky, type EiffelSkySample } from '../data/eiffelSky';
import type { Wonder } from '../data/types';
import { lerpColor, lightStateAt, type LightState } from './daynight';
import { clamp, smoothstep } from './easing';
import { EIFFEL_LONG_LOAD_FILM_PRODUCTION_T } from './eiffelLongLoadFilm';

export interface EiffelCinematicAtmosphere {
  light: LightState;
  sky: EiffelSkySample;
  phase: 'construction' | 'night' | 'sunrise' | 'morning';
  nightAmount: number;
  shadowSoftness: number;
}

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

function blendSky(a: EiffelSkySample, b: EiffelSkySample, p: number): EiffelSkySample {
  return {
    t: mix(a.t, b.t, p),
    zenith: lerpColor(a.zenith, b.zenith, p),
    horizon: lerpColor(a.horizon, b.horizon, p),
    sunTint: lerpColor(a.sunTint, b.sunTint, p),
    cloudTint: lerpColor(a.cloudTint, b.cloudTint, p),
    cloudShadow: lerpColor(a.cloudShadow, b.cloudShadow, p),
    cloudOpacity: mix(a.cloudOpacity, b.cloudOpacity, p),
    haze: mix(a.haze, b.haze, p),
    fogStretch: mix(a.fogStretch, b.fogStretch, p),
  };
}

function blendLight(a: LightState, b: LightState, p: number, sky: EiffelSkySample): LightState {
  return {
    sun: {
      azimuth: mix(a.sun.azimuth, b.sun.azimuth, p),
      elevation: mix(a.sun.elevation, b.sun.elevation, p),
      intensity: mix(a.sun.intensity, b.sun.intensity, p),
      visibility: mix(a.sun.visibility ?? 1, b.sun.visibility ?? 1, p),
      color: lerpColor(a.sun.color, b.sun.color, p),
    },
    ambient: {
      intensity: mix(a.ambient.intensity, b.ambient.intensity, p),
      skyColor: lerpColor(a.ambient.skyColor, b.ambient.skyColor, p),
      groundColor: lerpColor(a.ambient.groundColor, b.ambient.groundColor, p),
    },
    sky: sky.horizon,
    fog: sky.horizon,
    emissive: mix(a.emissive, b.emissive, p),
  };
}

/** The pre-ending Eiffel rig, including the existing neutral iron fill. */
function constructionAtmosphere(productionT: number, wonder: Wonder): EiffelCinematicAtmosphere {
  const light = lightStateAt(productionT, wonder);
  const sky = sampleEiffelSky(productionT);
  Object.assign(light.sun, eiffelSunStateAt(productionT), { color: sky.sunTint });
  light.sky = light.fog = sky.horizon;
  light.ambient.skyColor = '#c6ccd0';
  light.ambient.intensity = Math.min(0.76, light.ambient.intensity + 0.24);
  let shadowSoftness = 0;
  if (light.sun.elevation < 18 || light.emissive > 0) {
    const dusk = Math.min(1, Math.max((18 - light.sun.elevation) / 14, light.emissive));
    light.ambient.intensity = Math.min(0.84, light.ambient.intensity + dusk * 0.14);
    light.sun.intensity *= 1 - dusk * 0.06;
    if (dusk > 0.6) light.sun.color = '#c8d0e8';
    shadowSoftness = dusk * 0.45;
  }
  return { light, sky, phase: 'construction', nightAmount: light.emissive, shadowSoftness };
}

/**
 * Spec 47: atmospheric time leaves the construction clock only for the coda.
 * The western key sets, is repositioned while completely dark, then a new
 * eastern sun rises. No construction state is sampled or changed here.
 */
export function sampleEiffelCinematicAtmosphere(
  rawProductionT: number,
  rawViewerSeconds: number,
  wonder: Wonder,
): EiffelCinematicAtmosphere {
  const productionT = clamp(Number.isFinite(rawProductionT) ? rawProductionT : 0);
  const seconds = clamp(Number.isFinite(rawViewerSeconds) ? rawViewerSeconds : 0, 0, 180);
  // The 162s edit key is the long-load source boundary. Pin the atmospheric
  // starting state here: the accelerated last construction waves must not
  // drag the sun rapidly through its sunset before our eight-second coda.
  const base = constructionAtmosphere(seconds <= 162 ? productionT : EIFFEL_LONG_LOAD_FILM_PRODUCTION_T, wonder);
  if (seconds <= 162) return base;

  // A black sunTint also hides the sky shader's disc/halo, independently of
  // directional-light intensity, while its direction crosses the night sky.
  const nightSky = { ...sampleEiffelSky(1), sunTint: '#000000' };
  const nightLight: LightState = {
    sun: { azimuth: 154, elevation: -8, color: '#a8b0c4', intensity: 0, visibility: 0 },
    ambient: { skyColor: '#929db5', groundColor: wonder.palette.ground, intensity: 0.4 },
    sky: nightSky.horizon,
    fog: nightSky.horizon,
    emissive: 1,
  };
  if (seconds < 170) {
    const p = smoothstep((seconds - 162) / 8);
    const sky = blendSky(base.sky, nightSky, p);
    const light = blendLight(base.light, nightLight, p, sky);
    return { light, sky, phase: 'night', nightAmount: light.emissive, shadowSoftness: mix(base.shadowSoftness, 0.45, p) };
  }
  if (seconds < 172) {
    nightLight.sun.azimuth = mix(154, -30, smoothstep((seconds - 170) / 2));
    return { light: nightLight, sky: nightSky, phase: 'night', nightAmount: 1, shadowSoftness: 0.45 };
  }

  const p = smoothstep((seconds - 172) / 6);
  const morningSky = { ...sampleEiffelSky(0.12), horizon: '#d4c0a4', sunTint: '#ffd29a' };
  const sky = blendSky(nightSky, morningSky, p);
  const elevation = mix(-8, 14, p);
  const sunVisibility = smoothstep(elevation / 14);
  // Clouds and ambient dawn appear before the sun clears the horizon; the
  // direct key and its visible disc appear only as it actually rises.
  sky.sunTint = lerpColor('#000000', morningSky.sunTint, sunVisibility);
  const light: LightState = {
    sun: { azimuth: -30, elevation, color: morningSky.sunTint, intensity: 0.98 * sunVisibility, visibility: sunVisibility },
    ambient: { skyColor: lerpColor(nightLight.ambient.skyColor, '#d8d2c8', p), groundColor: wonder.palette.ground, intensity: mix(0.4, 0.78, p) },
    sky: sky.horizon,
    fog: sky.horizon,
    emissive: 1 - p,
  };
  return { light, sky, phase: seconds < 178 ? 'sunrise' : 'morning', nightAmount: light.emissive, shadowSoftness: mix(0.45, 0.14, p) };
}
