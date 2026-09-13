import { describe, expect, it } from 'vitest';
import {
  DAYLIGHT_HOLD_T,
  GIZA_SKY,
  gizaSunStateAt,
  sampleGizaSky,
} from '../src/data/gizaSky';
import {
  createGizaEnvironmentPlan,
  GIZA_COMPASS,
} from '../src/data/gizaEnvironment';

const environment = createGizaEnvironmentPlan();

const HEX = /^#[0-9a-f]{6}$/i;

function hexRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** World-space horizontal direction for an engine azimuth (degrees). */
function sunDirection(azimuthDegrees: number): [number, number] {
  const radians = (azimuthDegrees * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

describe('Giza sky description (era and place grounding)', () => {
  it('anchors the scene to the Fourth Dynasty reign of Khufu at Giza', () => {
    expect(environment.era.approximateYear).toBe(-2560);
    expect(environment.era.dynasty).toContain('Fourth');
    expect(environment.era.pharaoh).toBe('Khufu');
    expect(environment.era.latitude).toBeGreaterThan(29.9);
    expect(environment.era.latitude).toBeLessThan(30.05);
    expect(environment.era.description.length).toBeGreaterThan(24);
    expect(environment.era.productionNote.length).toBeGreaterThan(24);
  });

  it('fixes a world compass with the Nile east and the desert west', () => {
    expect(GIZA_COMPASS.east).toEqual([0, 0, -1]);
    expect(GIZA_COMPASS.west).toEqual([0, 0, 1]);
    expect(GIZA_COMPASS.north).toEqual([1, 0, 0]);
    expect(GIZA_COMPASS.south).toEqual([-1, 0, 0]);
    const nile = environment.geography.find((zone) => zone.id === 'nile')!;
    expect(nile.bearing).toBe('east');
    expect(nile.anchor[2]).toBeLessThan(-60);
    const desert = environment.geography.find((zone) => zone.id === 'western-desert')!;
    expect(desert.bearing).toBe('west');
    expect(desert.anchor[2]).toBeGreaterThan(60);
  });

  it('runs the sun from the Nile in the east to the desert in the west', () => {
    const dawn = sunDirection(gizaSunStateAt(0).azimuth);
    expect(dawn[0]).toBeCloseTo(GIZA_COMPASS.east[0], 1);
    expect(dawn[1]).toBeCloseTo(GIZA_COMPASS.east[2], 1);

    const noon = gizaSunStateAt(0.5);
    expect(noon.elevation).toBeCloseTo(GIZA_SKY.sunPath.noonElevationDegrees, 5);
    // Culmination stands in the south; a few degrees of meridian offset is
    // allowed since the movie midpoint need not be exactly solar noon.
    const noonDirection = sunDirection(noon.azimuth);
    const southDot =
      noonDirection[0] * GIZA_COMPASS.south[0] + noonDirection[1] * GIZA_COMPASS.south[2];
    expect(southDot).toBeGreaterThan(0.98);

    const dusk = sunDirection(gizaSunStateAt(DAYLIGHT_HOLD_T).azimuth);
    const westDot =
      dusk[0] * GIZA_COMPASS.west[0] + dusk[1] * GIZA_COMPASS.west[2];
    expect(westDot).toBeGreaterThan(0.85);
  });

  it('orders sky keyframes across the daylit axis with valid colors', () => {
    const keyframes = GIZA_SKY.keyframes;
    expect(keyframes.length).toBeGreaterThanOrEqual(5);
    expect(keyframes[0]!.t).toBe(0);
    expect(keyframes.at(-1)!.t).toBe(DAYLIGHT_HOLD_T);
    for (let i = 1; i < keyframes.length; i += 1) {
      expect(keyframes[i]!.t).toBeGreaterThan(keyframes[i - 1]!.t);
    }
    for (const keyframe of keyframes) {
      for (const color of [
        keyframe.zenith,
        keyframe.horizon,
        keyframe.sunTint,
        keyframe.cloudTint,
      ]) {
        expect(color).toMatch(HEX);
      }
      expect(keyframe.haze).toBeGreaterThanOrEqual(0);
      expect(keyframe.haze).toBeLessThanOrEqual(1);
      expect(keyframe.cloudOpacity).toBeGreaterThan(0);
      expect(keyframe.cloudOpacity).toBeLessThanOrEqual(1);
      expect(keyframe.description.length).toBeGreaterThan(24);
    }
  });

  it('authors restrained low-altitude aerosol texture without a moving sky backdrop', () => {
    const texture = GIZA_SKY.dome.atmosphericTexture;
    expect(texture.scale).toBeGreaterThan(0);
    expect(texture.strength).toBeGreaterThan(0);
    expect(texture.strength).toBeLessThanOrEqual(0.12);
    expect(texture.description.length).toBeGreaterThan(24);
  });

  it('keeps warm horizons at dawn/dusk and a blue midday zenith', () => {
    const dawn = GIZA_SKY.keyframes.find((keyframe) => keyframe.label === 'dawn')!;
    const dusk = GIZA_SKY.keyframes.find((keyframe) => keyframe.label === 'dusk')!;
    const midday = GIZA_SKY.keyframes.find((keyframe) => keyframe.label === 'midday')!;
    for (const warm of [dawn.horizon, dusk.horizon]) {
      const [r, , b] = hexRgb(warm);
      expect(r).toBeGreaterThan(b);
    }
    const [, , zenithBlue] = hexRgb(midday.zenith);
    const [zenithRed] = hexRgb(midday.zenith);
    expect(zenithBlue).toBeGreaterThan(zenithRed);
  });

  it('samples deterministically and holds dusk through the reveal', () => {
    expect(sampleGizaSky(0.62)).toEqual(sampleGizaSky(0.62));
    expect(sampleGizaSky(1)).toEqual(sampleGizaSky(DAYLIGHT_HOLD_T));
    expect(sampleGizaSky(0).label).toBe('dawn');
    expect(sampleGizaSky(1).label).toBe('dusk');
    const mid = sampleGizaSky(0.3);
    expect(mid.t).toBeCloseTo(0.3, 6);
    expect(mid.haze).toBeGreaterThan(0);
  });

  it('layers desert clouds with cirrus above cumulus, drifting south', () => {
    const cirrus = GIZA_SKY.cloudLayers.find((layer) => layer.id === 'cirrus')!;
    const cumulus = GIZA_SKY.cloudLayers.find((layer) => layer.id === 'cumulus-humilis')!;
    expect(cirrus.altitude.min).toBeGreaterThan(cumulus.altitude.min + 40);
    for (const layer of GIZA_SKY.cloudLayers) {
      expect(layer.drift.compassToward).toBe('south');
      expect(layer.drift.worldDirection).toEqual([-1, 0, 0]);
      expect(layer.radius.min).toBeGreaterThan(300);
      expect(layer.baseOpacity).toBeGreaterThan(0);
      expect(layer.baseOpacity).toBeLessThanOrEqual(0.5);
      expect(layer.description.length).toBeGreaterThan(24);
      expect(layer.historicalNote.length).toBeGreaterThan(24);
    }
  });
});

describe('Giza dusk tuning (sunset tail and dusk sky structure)', () => {
  it('drops the sun to a sunset-low 7–11° tail across the dusk beats', () => {
    // Review-board fix: the dusk reveal read late-afternoon high (24.1° at
    // t=0.9–1.0, all clamped to the reveal hold). The sunPath dusk tail must
    // hold the sun sunset-low through the whole reveal window.
    for (const t of [0.9, 0.925, 0.95, 1]) {
      const { elevation } = gizaSunStateAt(t);
      expect(elevation).toBeGreaterThanOrEqual(7);
      expect(elevation).toBeLessThanOrEqual(11);
    }
  });

  it('keeps the sun path continuous, above the horizon, and never rising after culmination', () => {
    const steps = 1000;
    const elevations: number[] = [];
    for (let i = 0; i <= steps; i += 1) {
      elevations.push(gizaSunStateAt(i / steps).elevation);
    }
    let maxStep = 0;
    for (let i = 1; i < elevations.length; i += 1) {
      const t = Math.min(i / steps, DAYLIGHT_HOLD_T);
      const delta = Math.abs(elevations[i]! - elevations[i - 1]!);
      maxStep = Math.max(maxStep, delta);
      // Monotonic descent once the daylit axis passes the t=0.5 culmination.
      if (t > 0.5) {
        expect(elevations[i]!).toBeLessThanOrEqual(elevations[i - 1]! + 1e-9);
      }
      // The sun never touches the horizon after sunrise (t=0 is sunrise).
      expect(elevations[i]!).toBeGreaterThan(0);
    }
    // The smoothstep taper keeps value and slope continuous at the join, so
    // the largest per-step change across the movie stays a fraction of a
    // degree (measured slope peaks near t=0.9 at ~0.24°/step).
    expect(maxStep).toBeLessThan(0.5);
  });

  it('leaves the dawn arc, noon culmination, and azimuth sweep untouched', () => {
    // The tail starts at t=0.62, after every accepted morning/noon beat, and
    // a parallel droid designs against the current azimuths — pin both.
    expect(GIZA_SKY.sunPath.dawnAzimuthDegrees).toBe(-90);
    expect(GIZA_SKY.sunPath.sweepDegrees).toBe(200);
    // Pre-change probe value at t=0.12 was 28.7°; the taper is exactly zero
    // there, so the dawn read must stay within ±2°.
    expect(gizaSunStateAt(0.12).elevation).toBeGreaterThanOrEqual(26.7);
    expect(gizaSunStateAt(0.12).elevation).toBeLessThanOrEqual(30.7);
    // Noon culmination unchanged at 78° (also pinned by the sky suite above).
    expect(gizaSunStateAt(0.5).elevation).toBeCloseTo(78, 5);
    // The historical note must keep owning the peret compression.
    expect(GIZA_SKY.sunPath.historicalNote.toLowerCase()).toContain('peret');
  });

  it('structures the dusk sky: dark cool zenith, warm band, pink-lit cloud banks', () => {
    // Review-board fix: dusk read as a monochrome orange wash. The zenith
    // must sit strictly below the warm horizon band in luminance (gradient
    // structure, not wash), and the cloud banks must be opaque enough to read.
    const luminance = (hex: string) => {
      const [r, g, b] = hexRgb(hex);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const dawn = GIZA_SKY.keyframes.find((keyframe) => keyframe.label === 'dawn')!;
    const dusk = GIZA_SKY.keyframes.find((keyframe) => keyframe.label === 'dusk')!;
    expect(luminance(dusk.zenith)).toBeLessThan(luminance(dusk.horizon));
    // Deepened zenith: clearly darker than dawn's soft blue-grey dome.
    expect(luminance(dusk.zenith)).toBeLessThan(luminance(dawn.zenith) / 2);
    expect(dusk.cloudOpacity).toBeGreaterThanOrEqual(0.5);
    // Clouds carry the low sun's cast: a strong red-over-blue spread keeps
    // the banks pink-lit rather than neutral white/grey.
    const [cloudR, , cloudB] = hexRgb(dusk.cloudTint);
    expect(cloudR - cloudB).toBeGreaterThanOrEqual(80);
  });
});

describe('Giza environment description (era and place grounding)', () => {
  it('documents every geography zone with a bearing and history', () => {
    const ids = environment.geography.map((zone) => zone.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'plateau',
        'nile',
        'greenbelt',
        'memphis',
        'eastern-hills',
        'western-desert',
      ]),
    );
    for (const zone of environment.geography) {
      expect(zone.description.length).toBeGreaterThan(24);
      expect(zone.historicalNote.length).toBeGreaterThan(24);
    }
    expect(environment.geography.find((zone) => zone.id === 'memphis')!.bearing)
      .toBe('south-east');
  });

  it('raises rockier hills east of the river and lowers western dunes', () => {
    const east = environment.horizonSectors.find((sector) => sector.id === 'eastern-hills')!;
    const west = environment.horizonSectors.find((sector) => sector.id === 'western-dunes')!;
    expect(east.heightMultiplier).toBeGreaterThan(west.heightMultiplier);
    for (const sector of environment.horizonSectors) {
      expect(sector.centerDegrees).toBeGreaterThanOrEqual(0);
      expect(sector.centerDegrees).toBeLessThan(360);
      expect(sector.tint).toMatch(HEX);
      expect(sector.description.length).toBeGreaterThan(24);
    }
    const easternSample = environment.horizon.samples.reduce((best, sample) =>
      Math.abs(((sample.angle * 180) / Math.PI + 360) % 360 - 270) <
      Math.abs(((best.angle * 180) / Math.PI + 360) % 360 - 270)
        ? sample
        : best,
    );
    expect(easternSample.sectorId).toBe('eastern-hills');
  });

  it('sails only era-correct river craft', () => {
    const total = environment.riverCraft.reduce((sum, craft) => sum + craft.count, 0);
    expect(total).toBe(environment.riverBoats);
    const barges = environment.riverCraft.filter((craft) => craft.kind === 'cargo-barge');
    expect(barges.length).toBeGreaterThanOrEqual(1);
    for (const barge of barges) {
      expect(barge.cargo).toBe('tura-casing-stones');
      expect(barge.heading).toBe('downstream-north');
      expect(barge.squareSail).toBe(false);
    }
    const sailed = environment.riverCraft.filter((craft) => craft.squareSail);
    expect(sailed.length).toBeGreaterThanOrEqual(1);
    for (const boat of sailed) {
      expect(boat.heading).toBe('upstream-south');
    }
    for (const craft of environment.riverCraft) {
      expect(craft.description.length).toBeGreaterThan(24);
      expect(craft.historicalNote.length).toBeGreaterThan(24);
    }
  });

  it('builds Memphis without anachronisms', () => {
    const { settlement } = environment;
    expect(settlement.id).toBe('memphis');
    expect(settlement.bearing).toBe('south-east');
    expect(settlement.features).toEqual(
      expect.arrayContaining([
        'mud-brick-homes',
        'flat-reed-roofs',
        'domed-granaries',
        'whitewashed-walls',
        'temple-pylons',
        'obelisks',
      ]),
    );
    expect(settlement.exclusions).toEqual(
      expect.arrayContaining(['minarets', 'modern-skyline', 'lateen-sails']),
    );
    expect(settlement.description.length).toBeGreaterThan(24);
    expect(settlement.historicalNote.length).toBeGreaterThan(24);
  });

  it('stays deterministic across repeated expansion', () => {
    expect(createGizaEnvironmentPlan()).toEqual(environment);
  });
});
