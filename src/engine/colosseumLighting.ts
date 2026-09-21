import type { ColosseumSkySample } from '../data/colosseumSky';
import type { ColosseumAstronomySample } from './colosseumAstronomy';
import { lerpColor, type LightState } from './daynight';
import { clamp, smoothstep } from './easing';

/** Only these fields affect the physical light sources and photographic fill. */
export type ColosseumLightingSky = Pick<ColosseumSkySample, 'zenith' | 'horizon' | 'sunTint'> & {
  astronomy: ColosseumAstronomySample;
};

/**
 * Astronomical direction/visibility, with explicitly adapted night exposure.
 * This is a film-lighting scale, not measured lux. The renderer retains one
 * shadow-casting DirectionalLight: its source switches only while the Sun is
 * completely below the horizon and both solar/lunar direct terms are zero.
 * Neither the Sun nor the Moon is repositioned to accommodate the camera.
 */
export function colosseumLightState(sky: ColosseumLightingSky): LightState {
  const { sun, moon } = sky.astronomy;
  const solarVisibility = clamp(sun.horizonVisibility);
  const moonPhase = clamp(moon.illuminatedFraction);
  const moonRise = clamp(moon.horizonVisibility);
  const darkAdaptation = smoothstep((-sun.elevationDegrees - 1) / 5);
  const fullDay = smoothstep((sun.elevationDegrees + 6) / 18);
  const highSun = smoothstep((sun.elevationDegrees - 2) / 28);
  const solarKey: LightState['sun'] = {
    // Compass bearing -> reflected renderer's east/up/south polar angle.
    azimuth: sun.azimuthDegrees - 90,
    elevation: sun.elevationDegrees,
    color: sky.sunTint,
    intensity: 1.22 * (0.72 + 0.28 * highSun),
    visibility: solarVisibility,
  };
  const moonKey: LightState['sun'] = {
    azimuth: moon.azimuthDegrees - 90,
    elevation: moon.elevationDegrees,
    color: '#b6c9e7',
    intensity: 0.18 + 0.06 * moonPhase,
    // A crescent supplies less key light than a full Moon. Horizon visibility
    // uses the real disc, not the presentation's angular enlargement.
    visibility: darkAdaptation * moonRise * Math.pow(moonPhase, 0.8),
  };

  return {
    sun: solarKey,
    ...(solarVisibility === 0 ? { keyLight: moonKey } : {}),
    ambient: {
      // Cool open-sky fill protects stone readability through twilight; the
      // lower dark value avoids an artificial daylight-bright moonlit scene.
      skyColor: lerpColor('#93a9c5', '#c4d0da', fullDay),
      groundColor: lerpColor('#536078', '#81745f', fullDay),
      intensity: 0.28 + 0.4 * fullDay,
    },
    sky: sky.horizon,
    fog: sky.horizon,
    emissive: 0,
  };
}
