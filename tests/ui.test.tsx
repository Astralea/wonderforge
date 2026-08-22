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

  it('caption layer: beats appear in the chrome-free cinema frame, never in gaps, at speed, or at the reveal', () => {
    vi.useFakeTimers();
    try {
      openWonder(); // status 'playing', speed 1
      // Chrome shows on entry — and while it shows, captions stay away so
      // they can never overlap the quote/title card.
      act(() => usePlaybackStore.getState().seek(0.24));
      expect(screen.queryByText('The Quarry')).not.toBeInTheDocument();

      // After the idle window the chrome hides and the cinema frame is
      // clean: the caption fades in.
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(screen.getByText('The Quarry')).toBeInTheDocument();

      // The gap between beats (0.46–0.50) shows nothing.
      act(() => usePlaybackStore.getState().seek(0.48));
      expect(screen.queryByText('The Quarry')).not.toBeInTheDocument();
      expect(screen.queryByText('The Ramps')).not.toBeInTheDocument();

      // The reveal stays clean.
      act(() => usePlaybackStore.getState().seek(0.95));
      expect(screen.queryByText('The Horizon')).not.toBeInTheDocument();

      // At 2× the read time would compress past honesty: no captions.
      fireEvent.click(screen.getByRole('button', { name: '2× speed' }));
      act(() => usePlaybackStore.getState().seek(0.54));
      expect(screen.queryByText('The Ramps')).not.toBeInTheDocument();

      // Back at 1× the same window shows the caption again.
      fireEvent.click(screen.getByRole('button', { name: '1× speed' }));
      act(() => usePlaybackStore.getState().seek(0.54));
      expect(screen.getByText('The Ramps')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('caption voice: off by default, the toggle narrates the active caption, and off cancels', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak, cancel },
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class {
        rate = 1;
        constructor(public text: string) {}
      },
      configurable: true,
    });
    vi.useFakeTimers();
    try {
      openWonder();
      // Off by default: reaching a beat speaks nothing.
      act(() => usePlaybackStore.getState().seek(0.24));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(screen.getByText('The Quarry')).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      // Toggle on: the active caption is read aloud.
      fireEvent.click(screen.getByRole('button', { name: /caption narration on/i }));
      expect(speak).toHaveBeenCalledTimes(1);
      expect(String(speak.mock.calls[0]![0].text)).toContain('Blocks are won from the plateau');

      // The next beat speaks its own text; toggling off cancels.
      act(() => usePlaybackStore.getState().seek(0.4));
      expect(speak).toHaveBeenCalledTimes(2);
      expect(String(speak.mock.calls[1]![0].text)).toContain('Sledges run on wetted roads');
      fireEvent.click(screen.getByRole('button', { name: /caption narration off/i }));
      expect(cancel).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
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
