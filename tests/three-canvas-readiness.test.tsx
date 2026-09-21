// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWonder } from '../src/data';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { ThreeCanvas } from '../src/render/three/ThreeCanvas';
import { WorldScene } from '../src/render/three/WorldScene';
import { EiffelLoading } from '../src/render/three/EiffelLoading';
import { eiffelFilmEditSourceTAt } from '../src/engine/eiffelFilmEdit';

const scene = vi.hoisted(() => ({
  ready: Promise.resolve(),
  loadProgress: 0,
  loadStage: 'City',
  update: vi.fn(),
  updateAmbient: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../src/render/three/WorldScene', () => ({
  WorldScene: vi.fn(function () {
    return scene;
  }),
}));
let resolve: () => void;
let reject: (error: Error) => void;
let frame: FrameRequestCallback;
beforeEach(() => {
  scene.ready = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  scene.loadProgress = 0;
  vi.spyOn(performance, 'now').mockReturnValue(0);
  scene.loadStage = 'City';
  vi.mocked(WorldScene).mockClear();
  scene.update.mockClear();
  scene.updateAmbient.mockClear();
  scene.dispose.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  usePlaybackStore.setState({
    ...createInitialState(),
    status: 'paused',
    t: 0.58,
    eiffelEdit: 'detailed',
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const startEiffel = () => {
  act(() => frame(performance.now()));
  act(() => frame(performance.now()));
};

describe('async scene readiness', () => {
  it('holds cached-film playback through the 600 ms fill and visible 100% frame', async () => {
    usePlaybackStore.setState({ status: 'playing', t: 0 });
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    startEiffel();
    await act(async () => resolve());
    act(() => frame(300));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(usePlaybackStore.getState().assetsReady).toBe(false);
    expect(usePlaybackStore.getState().t).toBe(0);
    act(() => frame(600));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(usePlaybackStore.getState().assetsReady).toBe(false);
    act(() => frame(700));
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(usePlaybackStore.getState().assetsReady).toBe(true);
    expect(usePlaybackStore.getState().t).toBe(0);
    act(() => frame(716));
    expect(usePlaybackStore.getState().t).toBeGreaterThan(0);
  });
  it('stops reduced-motion frames after readiness and repaints on an explicit seek', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    usePlaybackStore.setState({ status: 'playing' });
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    startEiffel();
    await act(async () => resolve());
    act(() => frame(600));
    act(() => frame(700));
    const pending = vi.mocked(requestAnimationFrame).mock.calls.length;
    act(() => frame(performance.now()));
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(pending);
    expect(usePlaybackStore.getState().t).toBe(.58);
    act(() => usePlaybackStore.getState().seek(.3));
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(pending + 1);
    act(() => frame(performance.now()));
    expect(scene.update).toHaveBeenLastCalledWith(...Array(3).fill(eiffelFilmEditSourceTAt('detailed', .3)));
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(pending + 1);
  });
  it('repaints the same mapped detailed source frame when the model becomes ready', async () => {
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    expect(vi.mocked(WorldScene)).not.toHaveBeenCalled();
    expect(screen.getByRole('img').getAttribute('data-assets')).toBe('loading');
    startEiffel();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '0',
    );
    scene.loadProgress = 0.4;
    act(() => frame(1000));
    expect(scene.update).toHaveBeenLastCalledWith(
      ...Array(3).fill(eiffelFilmEditSourceTAt('detailed', 0.58)),
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '40',
    );
    const scheduledBefore = vi.mocked(requestAnimationFrame).mock.calls.length;
    await act(async () => resolve());
    expect(screen.getByRole('img').getAttribute('data-assets')).toBe('ready');
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(
      scheduledBefore,
    );
    act(() => frame(1000));
    expect(scene.update).toHaveBeenLastCalledWith(
      ...Array(3).fill(eiffelFilmEditSourceTAt('detailed', 0.58)),
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    act(() => frame(1100));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
  it('cancels initialization when navigation happens before the first paint', () => {
    const view = render(
      <ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />,
    );
    view.unmount();
    act(() => frame(performance.now()));
    expect(WorldScene).not.toHaveBeenCalled();
  });
  it('fills the Eiffel outline from measured readiness and announces the pending stage', () => {
    const view = render(<EiffelLoading percent={0} stage="City" />);
    expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe(
      'translate(0 224)',
    );
    view.rerender(
      <EiffelLoading percent={50} stage="Upper platforms" />,
    );
    expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe(
      'translate(0 120)',
    );
    expect(
      screen.getByRole('progressbar').getAttribute('aria-valuetext'),
    ).toContain('50% prepared');
    expect(screen.getByRole('status').textContent).toContain(
      'Upper platforms',
    );
    view.rerender(
      <EiffelLoading percent={100} stage="Starting film…" />,
    );
    expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe(
      'translate(0 0)',
    );
  });
  it('ignores late readiness after the world is disposed', async () => {
    const view = render(
      <ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />,
    );
    startEiffel();
    view.unmount();
    const scheduledBefore = vi.mocked(requestAnimationFrame).mock.calls.length;
    await act(async () => resolve());
    expect(scene.dispose).toHaveBeenCalledOnce();
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(
      scheduledBefore,
    );
  });
  it('shows a recovery action when an asset fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    startEiffel();
    await act(async () => reject(new Error('asset fetch failed')));
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'We couldn’t load this scene.',
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
  });
  it('stops rendering after a playing scene fails, including subsequent control events', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    usePlaybackStore.setState({ status: 'playing' });
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    startEiffel();
    await act(async () => reject(new Error('asset fetch failed')));
    const requested = vi.mocked(requestAnimationFrame).mock.calls.length;
    const rendered = scene.update.mock.calls.length;
    act(() => { frame(1000); usePlaybackStore.getState().seek(.3); });
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(requested);
    expect(scene.update.mock.calls.length).toBe(rendered);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('maps a short edit once for construction and light while passing its own camera clock', () => {
    usePlaybackStore.setState({
      wonderId: 'eiffel-tower',
      eiffelEdit: 'cinematic',
      t: 0.58,
      durationMs: 180000,
    });
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    act(() => frame(performance.now()));
    startEiffel();
    act(() => frame(performance.now()));
    const sourceT = eiffelFilmEditSourceTAt('cinematic', 0.58);
    expect(sourceT).not.toBeCloseTo(0.58, 3);
    expect(scene.update).toHaveBeenLastCalledWith(sourceT, sourceT, sourceT, {
      edit: 'cinematic',
      t: 0.58,
    });
    act(() => usePlaybackStore.getState().setEiffelEdit('detailed'));
    act(() => frame(performance.now()));
    expect(scene.update).toHaveBeenLastCalledWith(0, 0, 0);
    expect(scene.dispose).not.toHaveBeenCalled();
  });
  it('leaves another wonder on its own clock when the remembered Eiffel edition is short', () => {
    usePlaybackStore.setState({ eiffelEdit: 'cinematic' });
    render(
      <ThreeCanvas wonder={getWonder('pyramids-of-giza')} mode="cinematic" />,
    );
    act(() => frame(performance.now()));
    act(() => frame(performance.now()));
    act(() => frame(performance.now()));
    expect(scene.update).toHaveBeenLastCalledWith(0.58, 0.58, 0.58);
  });
  it('prepares ambient home without a loading overlay or film playback gate', async () => {
    usePlaybackStore.setState({ assetsReady: true });
    render(
      <ThreeCanvas wonder={getWonder('pyramids-of-giza')} mode="ambient" />,
    );
    expect(screen.queryByTestId('wonder-arrival')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Loading/ })).toBeNull();
    startEiffel();
    act(() => frame(16));
    expect(scene.updateAmbient).toHaveBeenCalledOnce();
    expect(screen.getByRole('img').getAttribute('data-assets')).toBe('loading');
    expect(screen.queryByRole('progressbar')).toBeNull();
    await act(async () => resolve());
    act(() => frame(32));
    expect(screen.getByRole('img').getAttribute('data-assets')).toBe('ready');
    expect(screen.queryByTestId('wonder-arrival')).toBeNull();
    expect(usePlaybackStore.getState().assetsReady).toBe(true);
  });
  it('repaints reduced-motion home when ready without waiting or spinning for the arrival minimum', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<ThreeCanvas wonder={getWonder('pyramids-of-giza')} mode="ambient" />);
    startEiffel();
    const requested = vi.mocked(requestAnimationFrame).mock.calls.length;
    act(() => frame(16));
    expect(scene.updateAmbient).toHaveBeenLastCalledWith(31, 0.82);
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(requested);
    await act(async () => resolve());
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(requested + 1);
    act(() => frame(32));
    expect(scene.updateAmbient).toHaveBeenCalledTimes(2);
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(requested + 1);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
  it('keeps cinematic Giza on the arrival silhouette until the world is ready', () => {
    render(
      <ThreeCanvas wonder={getWonder('pyramids-of-giza')} mode="cinematic" />,
    );
    expect(screen.getByTestId('wonder-arrival')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Loading Pyramids of Giza…' })).toBeTruthy();
    expect(screen.queryByText('Loading…')).toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe(
      'Loading Pyramids of Giza',
    );
  });
});
