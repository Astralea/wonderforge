import { describe, expect, it } from 'vitest';
import { selectEiffelCrowdDetail } from '../src/engine/eiffelCrowdDetail';

describe('camera-selected Eiffel pedestrian detail', () => {
  it('promotes visible size before ID or an enormous offscreen actor and keeps kind budgets', () => {
    const actors = [
      { id: 'old-near', kind: 'man', inFrustum: false, projectedHeight: 100 },
      { id: 'small', kind: 'man', inFrustum: true, projectedHeight: .01 },
      { id: 'new-close', kind: 'man', inFrustum: true, projectedHeight: .2 },
      { id: 'woman', kind: 'woman', inFrustum: true, projectedHeight: .05 },
    ];
    expect([...selectEiffelCrowdDetail(actors, { man: 1, woman: 1 })]).toEqual(['new-close', 'woman']);
    expect(actors.map(a => a.id)).toEqual(['old-near', 'small', 'new-close', 'woman']);
  });
  it('reserves remaining slots offscreen rather than spending detail on subpixel people', () => {
    const actors = [
      { id: 'tiny', kind: 'man', inFrustum: true, projectedHeight: 2 },
      { id: 'near', kind: 'man', inFrustum: true, projectedHeight: 24 },
      { id: 'offscreen', kind: 'man', inFrustum: false, projectedHeight: 0 },
    ];
    expect([...selectEiffelCrowdDetail(actors, { man: 2 }, 12)]).toEqual(['near', 'offscreen']);
  });
  it('uses stable ties, retains offscreen fill, and has no input-order or seek history', () => {
    const actors = ['z', 'a', 'b'].map(id => ({ id, kind: 'man', inFrustum: false, projectedHeight: NaN }));
    const first = [...selectEiffelCrowdDetail(actors, { man: 2 })];
    selectEiffelCrowdDetail([{ ...actors[0]!, inFrustum: true }], { man: 1 });
    expect([...selectEiffelCrowdDetail([...actors].reverse(), { man: 2 })]).toEqual(first);
    expect(first).toEqual(['a', 'b']);
  });
});
