import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WONDERS } from '../src/data';
import { createInitialState, usePlaybackStore } from '../src/store/playback';

beforeEach(() => {
  usePlaybackStore.setState(createInitialState());
});

describe('playback store', () => {
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
});
