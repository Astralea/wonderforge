import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WONDERS } from '../src/data';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { eiffelFilmEditDuration } from '../src/engine/eiffelFilmEdit';

beforeEach(() => {
  usePlaybackStore.setState(createInitialState());
});

describe('playback store', () => {
  it('does not consume the opening while scene assets load', () => {
    const s=usePlaybackStore.getState();s.play();
    usePlaybackStore.setState({assetsReady:false});s.tick(15000);
    expect(usePlaybackStore.getState().t).toBe(0);
    usePlaybackStore.setState({assetsReady:true});s.tick(1000);
    expect(usePlaybackStore.getState().t).toBeCloseTo(1/60);
  });
  it('starts idle at t=0 on the first wonder, 60s duration at 1× speed', () => {
    const s = usePlaybackStore.getState();
    expect(s.status).toBe('idle');
    expect(s.t).toBe(0);
    expect(s.wonderId).toBe(WONDERS[0]!.id);
    expect(s.durationMs).toBe(60_000);
    expect(s.speed).toBe(1);
  });

  it('play/pause transitions', () => {
    const s = usePlaybackStore.getState();
    s.play();
    expect(usePlaybackStore.getState().status).toBe('playing');
    s.pause();
    expect(usePlaybackStore.getState().status).toBe('paused');
    s.play();
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('tick advances time only while playing', () => {
    const s = usePlaybackStore.getState();
    s.tick(3000);
    expect(usePlaybackStore.getState().t).toBe(0); // idle: no-op
    s.play();
    s.tick(3000);
    expect(usePlaybackStore.getState().t).toBeCloseTo(0.05, 5); // 3s of 60s
    s.pause();
    s.tick(3000);
    expect(usePlaybackStore.getState().t).toBeCloseTo(0.05, 5); // paused: no-op
  });

  it('tick past the end clamps to t=1 and completes', () => {
    const s = usePlaybackStore.getState();
    s.play();
    s.tick(60_000);
    expect(usePlaybackStore.getState().t).toBe(1);
    expect(usePlaybackStore.getState().status).toBe('complete');
  });

  it('seek clamps and pulls a completed movie back to paused', () => {
    const s = usePlaybackStore.getState();
    s.play();
    s.tick(60_000);
    expect(usePlaybackStore.getState().status).toBe('complete');
    s.seek(0.5);
    expect(usePlaybackStore.getState().t).toBe(0.5);
    expect(usePlaybackStore.getState().status).toBe('paused');
    s.seek(-1);
    expect(usePlaybackStore.getState().t).toBe(0);
    s.seek(2);
    expect(usePlaybackStore.getState().t).toBe(1);
  });

  it('replay restarts from 0, playing', () => {
    const s = usePlaybackStore.getState();
    s.play();
    s.tick(60_000);
    s.replay();
    expect(usePlaybackStore.getState().t).toBe(0);
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('select switches wonder and resets playback; unknown ids throw', () => {
    const s = usePlaybackStore.getState();
    s.play();
    s.tick(5000);
    s.select('petra');
    const after = usePlaybackStore.getState();
    expect(after.wonderId).toBe('petra');
    expect(after.status).toBe('idle');
    expect(after.t).toBe(0);
    expect(() => s.select('atlantis')).toThrow();
  });

  it('defaults to the three-minute Eiffel film and retains programmatic detailed playback', () => {
    const s = usePlaybackStore.getState();
    s.select('eiffel-tower');
    expect(usePlaybackStore.getState().eiffelEdit).toBe('cinematic');
    expect(usePlaybackStore.getState().durationMs).toBe(180000);
    s.play();
    s.tick(1000);
    expect(usePlaybackStore.getState().t).toBeCloseTo(1 / 180, 10);
    s.setEiffelEdit('detailed');
    expect(usePlaybackStore.getState()).toMatchObject({ eiffelEdit: 'detailed', t: 0, status: 'playing' });
    expect(usePlaybackStore.getState().durationMs).toBe(eiffelFilmEditDuration('detailed') * 1000);
    s.seek(.5); s.setEiffelEdit('cinematic');
    expect(usePlaybackStore.getState()).toMatchObject({ eiffelEdit: 'cinematic', t: 0, durationMs: 180000, status: 'playing' });
    s.pause(); s.setEiffelEdit('detailed');
    expect(usePlaybackStore.getState()).toMatchObject({ eiffelEdit: 'detailed', t: 0, status: 'paused' });
    expect(usePlaybackStore.getState().durationMs).toBe(eiffelFilmEditDuration('detailed') * 1000);
  });

  it('keeps the chosen edition across wonder visits without changing their clocks', () => {
    const s = usePlaybackStore.getState();
    s.select('eiffel-tower'); s.setEiffelEdit('cinematic'); s.select('petra');
    expect(usePlaybackStore.getState()).toMatchObject({ durationMs: 60000, eiffelEdit: 'cinematic' });
    s.select('eiffel-tower');
    expect(usePlaybackStore.getState().durationMs).toBe(180000);
    s.play(); s.tick(180000); s.setEiffelEdit('detailed');
    expect(usePlaybackStore.getState()).toMatchObject({ status: 'paused', t: 0 });
  });
});

describe('playback store under prefers-reduced-motion', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('play seeks to the completed still instead of a dead playing state', () => {
    const s = usePlaybackStore.getState();
    s.play();
    const after = usePlaybackStore.getState();
    expect(after.status).toBe('complete');
    expect(after.t).toBe(1);
  });

  it('play from paused also lands on the completed still', () => {
    const s = usePlaybackStore.getState();
    s.seek(0.4);
    usePlaybackStore.setState({ status: 'paused' });
    s.play();
    const after = usePlaybackStore.getState();
    expect(after.status).toBe('complete');
    expect(after.t).toBe(1);
  });

  it('replay jumps to the completed still, matching openWonder', () => {
    const s = usePlaybackStore.getState();
    s.replay();
    const after = usePlaybackStore.getState();
    expect(after.status).toBe('complete');
    expect(after.t).toBe(1);
  });

  it('keeps the completed still when changing Eiffel edition', () => {
    const s = usePlaybackStore.getState();
    s.select('eiffel-tower'); s.setEiffelEdit('detailed'); s.setEiffelEdit('cinematic');
    expect(usePlaybackStore.getState()).toMatchObject({ status: 'complete', t: 1, durationMs: 180000 });
  });
});
