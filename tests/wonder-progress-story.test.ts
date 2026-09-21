import { describe, expect, it } from 'vitest';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import {
  activeColosseumOperationsAt,
  colosseumPartStateAt,
  seatedColosseumCountAt,
} from '../src/engine/colosseumConstruction';
import { STONEHENGE_CONSTRUCTION } from '../src/data/stonehengeConstruction';
import {
  activeStonehengeOperationsAt,
  settledStonehengeCountAt,
} from '../src/engine/stonehengeConstruction';
import { PETRA_CONSTRUCTION } from '../src/data/petraConstruction';
import {
  activePetraOperationsAt,
  revealedPetraMemberCountAt,
} from '../src/engine/petraConstruction';

describe('Wonder progress stories stay cinematic (no frozen mid-build)', () => {
  it('Colosseum exterior storeys rise continuously through the middle third', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    const seatedAt = (t: number) => {
      const byStorey: Record<number, number> = {};
      for (const part of COLOSSEUM_CONSTRUCTION.parts) {
        if (part.group !== 'arcade' && part.group !== 'attic') continue;
        const state = colosseumPartStateAt(part, route, t);
        if (state.phase !== 'seated') continue;
        byStorey[part.storey] = (byStorey[part.storey] ?? 0) + 1;
      }
      return byStorey;
    };

    const early = seatedAt(0.28);
    const mid = seatedAt(0.48);
    const late = seatedAt(0.68);
    expect(early[0] ?? 0).toBeGreaterThan(20);
    // Mid film must already show second-storey arches, not a frozen ground arcade.
    expect(mid[1] ?? 0).toBeGreaterThan(15);
    expect((mid[1] ?? 0) + (mid[2] ?? 0)).toBeGreaterThan((early[1] ?? 0) + (early[2] ?? 0) + 20);
    expect((late[2] ?? 0) + (late[3] ?? 0)).toBeGreaterThan((mid[2] ?? 0) + 10);

    const counts = [0.2, 0.32, 0.48, 0.58, 0.72].map((t) => seatedColosseumCountAt(COLOSSEUM_CONSTRUCTION, t));
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]!).toBeGreaterThan(counts[i - 1]! + 8);
    }

    let peak = 0;
    for (let t = 0.15; t <= 0.85; t += 0.02) {
      peak = Math.max(peak, activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, t).length);
    }
    expect(peak).toBeGreaterThanOrEqual(8);
  });

  it('Stonehenge seats stones before the long early freeze and keeps settling mid-film', () => {
    expect(settledStonehengeCountAt(STONEHENGE_CONSTRUCTION, 0.15)).toBeGreaterThan(0);
    expect(settledStonehengeCountAt(STONEHENGE_CONSTRUCTION, 0.28)).toBeGreaterThan(8);
    const a = settledStonehengeCountAt(STONEHENGE_CONSTRUCTION, 0.4);
    const b = settledStonehengeCountAt(STONEHENGE_CONSTRUCTION, 0.55);
    const c = settledStonehengeCountAt(STONEHENGE_CONSTRUCTION, 0.7);
    expect(b).toBeGreaterThan(a + 4);
    expect(c).toBeGreaterThan(b + 4);
    let activePeak = 0;
    for (let t = 0.15; t <= 0.85; t += 0.02) {
      activePeak = Math.max(activePeak, activeStonehengeOperationsAt(STONEHENGE_CONSTRUCTION, t).length);
    }
    expect(activePeak).toBeGreaterThanOrEqual(6);
  });

  it('Petra keeps revealing facade members with active spoil work mid-film', () => {
    const early = revealedPetraMemberCountAt(PETRA_CONSTRUCTION, 0.25);
    const mid = revealedPetraMemberCountAt(PETRA_CONSTRUCTION, 0.55);
    const late = revealedPetraMemberCountAt(PETRA_CONSTRUCTION, 0.85);
    expect(mid).toBeGreaterThan(early);
    expect(late).toBeGreaterThan(mid);
    let activePeak = 0;
    for (let t = 0.2; t <= 0.8; t += 0.02) {
      activePeak = Math.max(activePeak, activePetraOperationsAt(PETRA_CONSTRUCTION, t).length);
    }
    expect(activePeak).toBeGreaterThan(0);
  });
});
