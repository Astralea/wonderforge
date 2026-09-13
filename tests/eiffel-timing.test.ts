import { describe, expect, it } from 'vitest';
import { scheduleEiffelKitTiming } from '../src/engine/eiffelConstructionTiming';

describe('Eiffel stage and hero timing', () => {
  it('keeps dependent pieces in distinct completed waves with at most four active lifts', () => {
    const parts = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      stage: 1,
    }));
    const deps = new Map(parts.map((p, i) => [p.id, i ? [`p${i - 1}`] : []]));
    const times = scheduleEiffelKitTiming(parts, deps);
    for (let i = 1; i < parts.length; i++)
      expect(times.get(`p${i}`)!.start).toBeGreaterThanOrEqual(
        times.get(`p${i - 1}`)!.end,
      );
    for (const timing of times.values())
      expect(timing.end).toBeGreaterThan(timing.start);
    expect([...times.values()].filter((t) => t.hero)).toHaveLength(1);
  });
  it('matches floor milestones, exposes readable hero waves and rejects future support dependencies', () => {
    const parts = [1, 9, 23, 34, 54, 63].flatMap((stage) =>
      Array.from({ length: 40 }, (_, i) => ({ id: `s${stage}-${i}`, stage })),
    );
    const times = scheduleEiffelKitTiming(parts, new Map());
    for (const [stage, end] of [
      [9, 0.15466666666666667],
      [23, 0.3152],
      [34, 0.4298666666666666],
      [54, 0.6477333333333334],
      [63, 0.9],
    ]) {
      expect(
        Math.max(
          ...parts
            .filter((p) => p.stage === stage)
            .map((p) => times.get(p.id)!.end),
        ),
      ).toBeCloseTo(end, 12);
    }
    for (const t of times.values())
      if (t.hero) expect((t.end - t.start) * 60).toBeGreaterThan(0.3);
    const waves = new Map<number, number>();
    for (const t of times.values())
      waves.set(t.wave, (waves.get(t.wave) ?? 0) + 1);
    expect(Math.max(...waves.values())).toBeLessThanOrEqual(4);
    expect(() =>
      scheduleEiffelKitTiming(
        [{ id: 'a', stage: 1 }],
        new Map([['a', ['missing']]]),
      ),
    ).toThrow('Unscheduled');
  });
});
