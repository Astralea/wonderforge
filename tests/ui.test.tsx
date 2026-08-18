// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WONDERS, getWonder } from '../src/data';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { useUiStore } from '../src/store/ui';

// The render layer is mocked out for UI tests (pure UI contract tests).
vi.mock('../src/render/WonderCanvas', () => ({
  WonderCanvas: () => <div data-testid="wonder-canvas" />,
}));

import App from '../src/App';

// jsdom implements no media playback, so the soundtrack hook would throw on
// every mount. Stub the transport; the cue's own contract lives in
// tests/soundtrack.test.ts.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

  window.location.hash = '';
  usePlaybackStore.setState(createInitialState());
  useUiStore.setState({ view: 'home' });
});

afterEach(cleanup);

describe('home', () => {
  it('renders the brand and all 10 wonder names', () => {
    render(<App />);
    expect(screen.getByText('WonderForge')).toBeInTheDocument();
    for (const w of WONDERS) {
      expect(screen.getAllByText(w.name).length).toBeGreaterThan(0);
    }
  });

  it('clicking a gallery row opens the cinematic and starts playing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /petra/i }));
    expect(useUiStore.getState().view).toBe('watch');
    expect(usePlaybackStore.getState().wonderId).toBe('petra');
    expect(usePlaybackStore.getState().status).toBe('playing');
    expect(window.location.hash).toBe('#/wonder/petra');
  });
});

describe('cinematic view', () => {
  function openWonder(id = 'pyramids-of-giza') {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(getWonder(id).name, 'i') }));
  }

  it('shows the title card first, then the quote once construction begins', () => {
    openWonder();
    const w = getWonder('pyramids-of-giza');
    expect(screen.getByText(new RegExp(w.location))).toBeInTheDocument();
    expect(screen.queryByText(w.quote.text)).not.toBeInTheDocument();

    act(() => usePlaybackStore.getState().seek(0.5));
    expect(screen.getByText(w.quote.text)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(w.quote.author))).toBeInTheDocument();
  });

  it('transport: play/pause toggles, scrubber seeks', () => {
    openWonder();
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(usePlaybackStore.getState().status).toBe('paused');
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(usePlaybackStore.getState().status).toBe('playing');

    const scrubber = screen.getByRole('slider', { name: /seek/i });
    fireEvent.change(scrubber, { target: { value: '0.5' } });
    expect(usePlaybackStore.getState().t).toBeCloseTo(0.5, 5);
  });

  it('replay appears when the movie completes and restarts it', () => {
    openWonder();
    act(() => usePlaybackStore.getState().tick(60_000));
    expect(usePlaybackStore.getState().status).toBe('complete');
    const replay = screen.getByRole('button', { name: /replay/i });
    fireEvent.click(replay);
    expect(usePlaybackStore.getState().t).toBe(0);
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('speed toggle multiplies wall-clock advance (Spec 02)', () => {
    openWonder();
    const group = screen.getByRole('group', { name: /playback speed/i });
    expect(group).toBeInTheDocument();
    const one = screen.getByRole('button', { name: '1× speed' });
    expect(one).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '2× speed' }));
    expect(usePlaybackStore.getState().speed).toBe(2);
    act(() => usePlaybackStore.getState().tick(1_500));
    expect(usePlaybackStore.getState().t).toBeCloseTo((1_500 * 2) / 60_000, 5);

    fireEvent.click(screen.getByRole('button', { name: '4× speed' }));
    act(() => usePlaybackStore.getState().tick(1_500));
    expect(usePlaybackStore.getState().t).toBeCloseTo(
      (1_500 * 2 + 1_500 * 4) / 60_000,
      5,
    );
  });

  it('next/previous navigate the catalog in order', () => {
    openWonder(); // pyramids-of-giza is first
    fireEvent.click(screen.getByRole('button', { name: /next wonder/i }));
    expect(usePlaybackStore.getState().wonderId).toBe('stonehenge');
    fireEvent.click(screen.getByRole('button', { name: /previous wonder/i }));
    expect(usePlaybackStore.getState().wonderId).toBe('pyramids-of-giza');
    fireEvent.click(screen.getByRole('button', { name: /previous wonder/i }));
    expect(usePlaybackStore.getState().wonderId).toBe('sydney-opera-house'); // wraps
  });

  it('Escape closes back to the gallery', () => {
    openWonder();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().view).toBe('home');
    expect(usePlaybackStore.getState().status).toBe('paused');
  });

  it('space toggles playback', () => {
    openWonder();
    fireEvent.keyDown(window, { key: ' ' });
    expect(usePlaybackStore.getState().status).toBe('paused');
    fireEvent.keyDown(window, { key: ' ' });
    expect(usePlaybackStore.getState().status).toBe('playing');
  });
});

describe('deep links', () => {
  it('#/wonder/:id opens straight into the cinematic', () => {
    window.location.hash = '#/wonder/machu-picchu';
    render(<App />);
    expect(useUiStore.getState().view).toBe('watch');
    expect(usePlaybackStore.getState().wonderId).toBe('machu-picchu');
    expect(screen.getByTestId('wonder-canvas')).toBeInTheDocument();
  });

  it('unknown wonder ids fall back to home', () => {
    window.location.hash = '#/wonder/atlantis';
    render(<App />);
    expect(useUiStore.getState().view).toBe('home');
  });
});
