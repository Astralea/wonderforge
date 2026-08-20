import { describe, expect, it } from 'vitest';
import { sunScreenEffects } from '../src/render/three/RenderPipeline';

describe('sunScreenEffects (Spec 06 §Lighting and atmosphere)', () => {
  it('is fully off when the sun is behind the camera', () => {
    const { shafts, streak } = sunScreenEffects(0.2, 0.3, true, 1, 1);
    expect(shafts).toBe(0);
    expect(streak).toBe(0);
  });

  it('fades both effects out as the sun leaves the frame', () => {
    // The on-screen gate reaches zero at NDC radius 1.6.
    const inside = sunScreenEffects(0.4, 0, false, 1, 0.5);
    const farOut = sunScreenEffects(1.7, 0, false, 1, 0.5);
    expect(inside.shafts).toBeGreaterThan(0);
    expect(inside.streak).toBeGreaterThan(0);
    expect(farOut.shafts).toBe(0);
    expect(farOut.streak).toBe(0);
    // Monotonic falloff with distance from frame center.
    const mid = sunScreenEffects(0.8, 0, false, 1, 0.5);
    expect(mid.shafts).toBeLessThan(inside.shafts);
    expect(mid.streak).toBeLessThan(inside.streak);
  });

  it('shafts are a haze phenomenon: none at noon, scaling with typed haze', () => {
    // lowSun = 0 (high sun) kills shafts entirely, whatever the haze.
    expect(sunScreenEffects(0.1, 0.1, false, 0, 0.9).shafts).toBe(0);
    const thin = sunScreenEffects(0.1, 0.1, false, 1, 0.3).shafts;
    const thick = sunScreenEffects(0.1, 0.1, false, 1, 0.6).shafts;
    expect(thick).toBeCloseTo(thin * 2, 6);
  });

  it('the streak is optical: it needs the sun on screen, not haze', () => {
    // No haze dependence at all — a clear dawn still flares the lens.
    const clear = sunScreenEffects(0.2, 0.2, false, 1, 0).streak;
    const dusty = sunScreenEffects(0.2, 0.2, false, 1, 1).streak;
    expect(clear).toBeCloseTo(dusty, 6);
    // But it strengthens at low sun and never fully vanishes on screen.
    const noon = sunScreenEffects(0.2, 0.2, false, 0, 0).streak;
    expect(noon).toBeGreaterThan(0);
    expect(clear).toBeGreaterThan(noon);
  });

  it('keeps both terms inside sane presentation bounds', () => {
    const { shafts, streak } = sunScreenEffects(0, 0, false, 1, 1);
    expect(shafts).toBeLessThanOrEqual(2.4);
    expect(streak).toBeLessThanOrEqual(0.5);
  });
});
