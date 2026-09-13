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
  loadStage: 'Preparing Paris',
  update: vi.fn(),
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
  scene.loadStage = 'Preparing Paris';
  vi.mocked(WorldScene).mockClear();
  scene.update.mockClear();
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
  it('repaints the same mapped detailed source frame when the model becomes ready', async () => {
    render(<ThreeCanvas wonder={getWonder('eiffel-tower')} mode="cinematic" />);
    expect(vi.mocked(WorldScene)).not.toHaveBeenCalled();
    expect(screen.getByRole('img').getAttribute('data-assets')).toBe('loading');
    startEiffel();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '0',
    );
    scene.loadProgress = 0.4;
    act(() => frame(performance.now()));
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
    act(() => frame(performance.now()));
    expect(scene.update).toHaveBeenLastCalledWith(
      ...Array(3).fill(eiffelFilmEditSourceTAt('detailed', 0.58)),
    );
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
    const view = render(<EiffelLoading percent={0} stage="Preparing Paris" />);
    expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe(
      'translate(0 224)',
    );
    view.rerender(
      <EiffelLoading percent={50} stage="Preparing the upper platforms" />,
    );
    expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe(
      'translate(0 120)',
    );
    expect(
      screen.getByRole('progressbar').getAttribute('aria-valuetext'),
    ).toContain('50% prepared');
    expect(screen.getByRole('status').textContent).toContain(
      'Preparing the upper platforms',
    );
    view.rerender(
      <EiffelLoading percent={100} stage="Preparing the first view" />,
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
      'Eiffel Tower model could not be loaded',
    );
    expect(screen.getByRole('button', { name: 'Reload scene' })).toBeTruthy();
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
    expect(scene.update).toHaveBeenLastCalledWith(0.58, 0.58, 0.58);
  });
});
