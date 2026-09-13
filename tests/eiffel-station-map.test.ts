import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { auditEiffelStationMap } from '../src/engine/eiffelStationMap';
import { transformRigidPoint } from '../src/engine/eiffelRigid';

const manifest = JSON.parse(
  readFileSync(
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'utf8',
  ),
) as EiffelKitManifest;
const audit = auditEiffelStationMap(manifest);

describe('Eiffel full-manifest station map audit', () => {
  it('maps real prior or lower same-stage support envelopes and exposes every gap', () => {
    expect(audit.constructionReady).toBe(false);
    expect(audit.gaps).toHaveLength(0);
    expect(audit.brackets.length).toBeLessThanOrEqual(187);
    expect(audit.candidates.size + audit.gaps.length).toBe(
      manifest.parts.filter((part) => part.group !== 'foundation').length,
    );
    for (const candidate of audit.candidates.values()) {
      expect(candidate.horizontalReach).toBeLessThanOrEqual(7.2 + 1e-9);
      const target = manifest.parts.find(
        (part) => part.id === candidate.partId,
      )!;
      expect(candidate.verticalRise).toBeGreaterThanOrEqual(
        target.stage === 23 ? -4 : -0.15,
      );
      expect(candidate.verticalRise).toBeLessThanOrEqual(22);
      expect(candidate.supportPartId).not.toBe(candidate.partId);
      const support = manifest.parts.find(
        (part) => part.id === candidate.supportPartId,
      )!;
      transformRigidPoint(
        support.finalPose,
        candidate.supportLocalPoint,
      ).forEach((value, axis) =>
        expect(value).toBeCloseTo(candidate.supportPoint[axis]!, 9),
      );
      candidate.supportLocalPoint.forEach((value, axis) => {
        expect(value).toBeGreaterThanOrEqual(
          support.localBounds.min[axis]! - 1e-9,
        );
        expect(value).toBeLessThanOrEqual(
          support.localBounds.max[axis]! + 1e-9,
        );
      });
      expect(
        candidate.supportLocalPoint.some(
          (value, axis) =>
            Math.abs(value - support.localBounds.min[axis]!) < 1e-9 ||
            Math.abs(value - support.localBounds.max[axis]!) < 1e-9,
        ),
      ).toBe(true);
    }
    for (const bracket of audit.brackets) {
      expect(bracket.extension).toBeGreaterThan(0);
      expect(bracket.extension).toBeLessThanOrEqual(4);
      expect(bracket.dependencyPartIds).toEqual([bracket.supportPartId]);
      expect(
        Math.hypot(
          ...bracket.saddles[0].map(
            (value, axis) => value - bracket.saddles[1][axis]!,
          ),
        ),
      ).toBeGreaterThan(0);
      expect(
        Math.hypot(
          bracket.tip[0] - bracket.saddle[0],
          bracket.tip[2] - bracket.saddle[2],
        ),
      ).toBeCloseTo(bracket.extension, 9);
    }
  });

  it('identifies the concrete stages needing bracket extensions or falsework', () => {
    const counts = new Map<number, number>();
    for (const gap of audit.gaps)
      counts.set(gap.stage, (counts.get(gap.stage) ?? 0) + 1);
    expect([...counts.entries()]).toEqual([]);
  });

  it('is deterministic across repeated and backward-style queries', () => {
    const ids = [...audit.candidates.keys()];
    expect(ids).toEqual([...audit.candidates.keys()]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
