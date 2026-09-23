// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogInProgress, catalogReady, getWonder } from '../src/data';
import { captionsFor } from '../src/data/captions';
import { GIZA_NARRATION, STONEHENGE_NARRATION, SYDNEY_NARRATION, narrationClipsForWonder } from '../src/data/narration';
import { useAudioStore } from '../src/store/audio';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { useUiStore } from '../src/store/ui';
import { EIFFEL_FILM_LIFT_START_SECONDS, EIFFEL_FILM_DURATION } from '../src/engine/eiffelFilm';
import { eiffelChapterCaptionsForEdit, eiffelFactCaptionsForEdit } from '../src/ui/eiffelChapterCaptions';

// The render layer is mocked out for UI tests (pure UI contract tests).
vi.mock('../src/render/WonderCanvas', () => ({
  WonderCanvas: ({ wonder }: { wonder: { id: string } }) => (
    <div data-testid="wonder-canvas" data-wonder={wonder.id} />
  ),
}));

import App from '../src/App';
import { CinematicView } from '../src/ui/CinematicView';

// jsdom implements no media playback, so the soundtrack hook would throw on
// every mount. Stub the transport; the cue's own contract lives in
// tests/soundtrack.test.ts.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem('wf-home-wonder', 'pyramids-of-giza');
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

  window.location.hash = '';
  usePlaybackStore.setState(createInitialState());
  useAudioStore.setState({ muted: false, unlocked: false, voiceEnabled: false, voicePreference: null });
  useUiStore.setState({ view: 'home', homePlate: 'title' });
});

afterEach(cleanup);

describe('home', () => {
  it('renders the brand, then the catalog after Enter — without leaving the page', () => {
    render(<App />);
    expect(screen.getByTestId('wonder-canvas')).toHaveAttribute(
      'data-wonder',
      'pyramids-of-giza',
    );
    expect(screen.getByRole('heading', { name: 'WonderForge', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('brand-mark-hero').querySelector('img')).toHaveAttribute(
      'src',
      '/brand/wonderforge-wordmark.png',
    );
    expect(screen.queryByText('Short films about how monuments were built.')).not.toBeInTheDocument();
    expect(screen.queryByText(/world wonders, built before your eyes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('heading', { name: 'WonderForge', level: 1 }),
    );
    expect(screen.getByRole('button', { name: /choose a site/i })).toHaveClass(
      'cursor-pointer',
    );
    expect(screen.queryByRole('button', { name: /browse films/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /petra/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    expect(useUiStore.getState().homePlate).toBe('catalog');
    expect(screen.getByTestId('wonder-canvas')).toHaveAttribute(
      'data-wonder',
      'pyramids-of-giza',
    );
    expect(screen.getByRole('button', { name: /back to introduction/i })).toHaveTextContent(
      'WonderForge',
    );
    expect(screen.queryByRole('button', { name: /choose a site/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'On site' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Watch now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Experience now' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In production' })).toBeInTheDocument();
    expect(screen.queryByText('These films are still being made.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ten wonders/i })).not.toBeInTheDocument();
    for (const w of catalogReady()) {
      expect(screen.getByRole('button', { name: new RegExp(w.name, 'i') })).toBeInTheDocument();
      expect(screen.getByTestId(`wonder-glyph-${w.id}`)).toBeInTheDocument();
    }
    for (const w of catalogInProgress()) {
      expect(screen.queryByRole('button', { name: new RegExp(w.name, 'i') })).not.toBeInTheDocument();
      expect(screen.getByText(w.name)).toBeInTheDocument();
      expect(screen.getByTestId(`wonder-glyph-${w.id}`)).toBeInTheDocument();
    }
  });

  it('keeps Giza on the homepage even if a leftover session pick is Colosseum', () => {
    sessionStorage.setItem('wf-home-wonder', 'colosseum');
    render(<App />);
    expect(screen.getByTestId('wonder-canvas')).toHaveAttribute(
      'data-wonder',
      'pyramids-of-giza',
    );
  });

  it('catalog wordmark returns to the title plate', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to introduction/i }));
    expect(useUiStore.getState().homePlate).toBe('title');
    expect(screen.getByRole('button', { name: /choose a site/i })).toBeInTheDocument();
  });

  it('Escape on the catalog returns to the title plate', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().homePlate).toBe('title');
    expect(useUiStore.getState().view).toBe('home');
  });

  it('clicking a ready gallery row opens the cinematic and starts playing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    fireEvent.click(screen.getByRole('button', { name: /colosseum/i }));
    expect(useUiStore.getState().view).toBe('watch');
    expect(usePlaybackStore.getState().wonderId).toBe('colosseum');
    expect(usePlaybackStore.getState().status).toBe('playing');
    expect(window.location.hash).toBe('#/wonder/colosseum');
  });

  it('lists in-progress wonders with a dashed outline and does not open them', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    const petra = screen.getByText('Petra').closest('[aria-disabled="true"]');
    expect(petra).toHaveClass('border-dashed');
    expect(petra).not.toHaveClass('opacity-50');
    fireEvent.click(screen.getByText('Petra'));
    expect(useUiStore.getState().view).toBe('home');
    expect(window.location.hash).not.toBe('#/wonder/petra');
  });

  it('does not show a legal or fan-homage footer on the catalog', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByText(/firaxis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fan-made/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/game assets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/affiliated/i)).not.toBeInTheDocument();
  });

  it('uses the pointer cursor on every clickable home control', () => {
    render(<App />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('cursor-pointer');
    }
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('cursor-pointer');
    }
  });
});

describe('cinematic view', () => {
  function openWonder(id = 'pyramids-of-giza') {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /choose a site/i }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(getWonder(id).name, 'i') }));
  }

  function mountUnlisted(id: string) {
    usePlaybackStore.getState().select(id);
    usePlaybackStore.getState().play();
    useUiStore.setState({ view: 'watch' });
    render(<CinematicView />);
  }

  it('keeps construction clear, preserves the full quote in facts, and shows it at the reveal', () => {
    openWonder();
    const w = getWonder('pyramids-of-giza');
    expect(screen.getByText(new RegExp(w.location))).toBeInTheDocument();
    expect(screen.queryByText(w.quote.text)).not.toBeInTheDocument();

    act(() => usePlaybackStore.getState().seek(0.5));
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
    expect(screen.queryByText(w.quote.text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'About this wonder' }));
    expect(screen.getByText(w.quote.text)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(w.quote.author))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close information panel' }));
    act(() => usePlaybackStore.getState().seek(captionsFor(w).at(-1)!.until + 0.005));
    expect(screen.getByText(w.quote.text)).toBeInTheDocument();
  });

  it('transport: play/pause toggles, scrubber seeks', () => {
    openWonder();
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(usePlaybackStore.getState().status).toBe('paused');
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(usePlaybackStore.getState().status).toBe('playing');

    const scrubber = screen.getByRole('slider', { name: /film position/i });
    fireEvent.change(scrubber, { target: { value: '0.5' } });
    expect(usePlaybackStore.getState().t).toBeCloseTo(0.5, 5);
  });

  it('leaves cinematic assets unready so the score cannot start over the loader', () => {
    openWonder('eiffel-tower');
    expect(usePlaybackStore.getState()).toMatchObject({
      wonderId: 'eiffel-tower',
      status: 'playing',
      assetsReady: false,
    });
  });

  it('keeps every global cinematic control together in the bottom control rail', () => {
    openWonder();
    const controls = screen.getByRole('group', { name: /cinematic controls/i });

    expect(within(controls).getByRole('button', { name: /previous wonder/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /^pause$/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /next wonder/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /mute soundtrack/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /turn narration on/i })).toHaveTextContent(
      'Narration off',
    );
    expect(within(controls).getByRole('button', { name: /about this wonder/i })).toBeInTheDocument();
    expect(within(controls).queryByRole('button', { name: /back to gallery/i })).not.toBeInTheDocument();
    const scrubber = within(controls).getByRole('slider', { name: /film position/i });
    expect(scrubber).toHaveClass('w-full', 'h-12');
    expect(within(controls).getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WonderForge, back to films' })).toHaveTextContent(
      'WonderForge',
    );
    expect(screen.queryByTestId('brand-mark-hero')).not.toBeInTheDocument();
  });

  it('uses the pointer cursor on every clickable cinematic control', () => {
    openWonder();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('cursor-pointer');
    }
    expect(screen.getByRole('slider', { name: /film position/i })).toHaveClass('cursor-pointer');
    fireEvent.click(screen.getByRole('button', { name: /about this wonder/i }));
    expect(screen.getByRole('button', { name: /close information panel/i })).toHaveClass(
      'cursor-pointer',
    );
  });

  it('replay appears when the movie completes and restarts it', () => {
    openWonder();
    act(() => usePlaybackStore.setState({ assetsReady: true }));
    act(() => usePlaybackStore.getState().tick(60_000));
    expect(usePlaybackStore.getState().status).toBe('complete');
    const replay = screen.getByRole('button', { name: /replay/i });
    fireEvent.click(replay);
    expect(usePlaybackStore.getState().t).toBe(0);
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('speed toggle multiplies wall-clock advance (Spec 02)', () => {
    openWonder();
    act(() => usePlaybackStore.setState({ assetsReady: true }));
    const group = screen.getByRole('group', { name: /playback speed/i });
    expect(group).toBeInTheDocument();
    const one = screen.getByRole('button', { name: 'Playback speed: 1 times' });
    expect(one).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Playback speed: 2 times' }));
    expect(usePlaybackStore.getState().speed).toBe(2);
    act(() => usePlaybackStore.getState().tick(1_500));
    expect(usePlaybackStore.getState().t).toBeCloseTo((1_500 * 2) / 60_000, 5);

    fireEvent.click(screen.getByRole('button', { name: 'Playback speed: 4 times' }));
    act(() => usePlaybackStore.getState().tick(1_500));
    expect(usePlaybackStore.getState().t).toBeCloseTo(
      (1_500 * 2 + 1_500 * 4) / 60_000,
      5,
    );
  });

  it('caption layer: beats appear at 1× during play, never in gaps, at speed, or at the reveal', () => {
    vi.useFakeTimers();
    try {
      openWonder(); // status 'playing', speed 1
      const beats = captionsFor(getWonder('pyramids-of-giza'));
      const haul = beats.find(beat => beat.id === 'giza-roads')!;
      const raising = beats.find(beat => beat.id === 'giza-ramps')!;
      const final = beats.at(-1)!;
      const index = screen.getByRole('navigation', { name: /film chapters/i });
      // Captions show even while chrome is visible so turning narration on
      // or moving the pointer does not hide the line.
      act(() => usePlaybackStore.getState().seek((haul.from + haul.until) / 2));
      expect(within(screen.getByTestId('live-caption')).getByText(haul.kicker)).toBeInTheDocument();
      expect(within(index).getByText(haul.kicker)).toBeInTheDocument();

      act(() => usePlaybackStore.getState().pause());
      expect(within(screen.getByTestId('live-caption')).getByText(haul.kicker)).toBeInTheDocument();
      act(() => usePlaybackStore.getState().play());

      // The gap between the haul and raising shows no live caption;
      // the index still lists finished and upcoming titles.
      act(() => usePlaybackStore.getState().seek((haul.until + raising.from) / 2));
      expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
      expect(within(index).getByText(haul.kicker)).toBeInTheDocument();
      expect(within(index).getByText(raising.kicker)).toBeInTheDocument();

      // The reveal stays clean of a live caption; the index keeps the last face.
      act(() => usePlaybackStore.getState().seek(final.until + 0.005));
      expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
      expect(within(index).getByText(final.kicker)).toBeInTheDocument();

      // At 2× the read time would compress past honesty: no live captions.
      fireEvent.click(screen.getByRole('button', { name: 'Playback speed: 2 times' }));
      act(() => usePlaybackStore.getState().seek((raising.from + raising.until) / 2));
      expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
      expect(within(index).getByText(raising.kicker)).toBeInTheDocument();

      // Back at 1× the same window shows the caption again.
      fireEvent.click(screen.getByRole('button', { name: 'Playback speed: 1 times' }));
      act(() => usePlaybackStore.getState().seek((raising.from + raising.until) / 2));
      expect(within(screen.getByTestId('live-caption')).getByText(raising.kicker)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('parks the wordmark in the top letterbox slot and keeps the beat index below it', () => {
    openWonder();
    expect(screen.getByTestId('cinematic-letterbox-top')).toBeInTheDocument();
    expect(screen.getByTestId('cinematic-letterbox-bottom')).toBeInTheDocument();
    expect(screen.getByTestId('cinematic-wordmark')).toHaveClass('top-0', 'h-[6vh]');
    expect(
      within(screen.getByTestId('cinematic-wordmark')).getByRole('button', {
        name: 'WonderForge, back to films',
      }),
    ).toHaveTextContent('WonderForge');
    expect(screen.queryByTestId('brand-mark-hero')).not.toBeInTheDocument();
    expect(screen.getByTestId('cinematic-top-chrome')).toHaveClass(
      'top-[calc(6vh+1rem)]',
    );
    expect(screen.getByTestId('cinematic-top-chrome')).not.toContainElement(
      screen.getByRole('button', { name: 'WonderForge, back to films' }),
    );
    expect(screen.getByTestId('cinematic-title-card')).toHaveClass(
      'bottom-[calc(6vh+14rem)]',
    );
  });

  it('a touch press wakes hidden movie controls without requiring a mouse move', () => {
    openWonder();
    expect(screen.getByTestId('cinematic-top-chrome').parentElement).toHaveClass('pointer-events-none');
    fireEvent.pointerDown(screen.getByTestId('wonder-canvas'), { pointerType: 'touch' });
    expect(screen.getByTestId('cinematic-top-chrome').parentElement).not.toHaveClass('pointer-events-none');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(usePlaybackStore.getState().status).toBe('paused');
  });

  it('caption beat index: titles stay listed and a click seeks to that face', () => {
    openWonder();
    const index = screen.getByRole('navigation', { name: /film chapters/i });
    const beats = captionsFor(getWonder('pyramids-of-giza'));
    for (const beat of beats) expect(within(index).getByRole('button', { name: `Play from ${beat.kicker}` })).toBeInTheDocument();
    const raising = beats.find(beat => beat.id === 'giza-ramps')!;

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    fireEvent.click(within(index).getByRole('button', { name: /play from raising the stone/i }));
    expect(usePlaybackStore.getState().t).toBeCloseTo(raising.from, 5);
    expect(usePlaybackStore.getState().status).toBe('playing');
    expect(within(index).getByRole('button', { name: /play from raising the stone/i })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('caption voice: Giza uses bundled Charles clips and stops them when turned off', () => {
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
      expect(within(screen.getByTestId('live-caption')).getByText(captionsFor(getWonder('pyramids-of-giza')).find(beat => beat.id === 'giza-roads')!.kicker)).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      const play = vi.mocked(HTMLMediaElement.prototype.play);
      const pause = vi.mocked(HTMLMediaElement.prototype.pause);
      play.mockClear();
      pause.mockClear();

      // Toggle on: the active caption uses its prerecorded clip.
      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      // Enabling primes every Giza clip in the immediate click gesture, then
      // the active beat starts its own (reused) element.
      expect(play).toHaveBeenCalledTimes(GIZA_NARRATION.length + 1);
      expect(speak).not.toHaveBeenCalled();

      // The next beat starts its own clip; toggling off stops it.
      act(() => usePlaybackStore.getState().seek(0.4));
      // jsdom keeps the soundtrack element's `paused` flag true, so its
      // store subscriber may also retry play on seek. At least two calls are
      // the two narration beats; the data contract pins their exact sources.
      expect(play.mock.calls.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(screen.getByRole('button', { name: /turn narration off/i }));
      expect(pause).toHaveBeenCalled();
      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  it('caption voice: Stonehenge uses bundled Oliver clips, not browser speech', () => {
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
      openWonder('stonehenge');
      act(() => usePlaybackStore.getState().seek(0.22));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(within(screen.getByTestId('live-caption')).getByText(captionsFor(getWonder('stonehenge')).find(beat => beat.id === 'stonehenge-sarsens')!.kicker)).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      expect(play).toHaveBeenCalledTimes(STONEHENGE_NARRATION.length + 1);
      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  it('caption voice still plays when the browser rejects an early seek', async () => {
    vi.useFakeTimers();
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    try {
      const beat = captionsFor(getWonder('pyramids-of-giza')).find(candidate => candidate.id === 'giza-roads')!;
      openWonder('pyramids-of-giza');
      act(() => usePlaybackStore.getState().seek(beat.from + 0.005));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(within(screen.getByTestId('live-caption')).getByText(beat.kicker)).toBeInTheDocument();

      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        configurable: true,
        get() {
          return 0;
        },
        set() {
          throw new DOMException('The element has no supported sources.', 'InvalidStateError');
        },
      });

      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(play.mock.calls.length).toBeGreaterThanOrEqual(GIZA_NARRATION.length + 1);
    } finally {
      vi.useRealTimers();
      if (descriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', descriptor);
      }
    }
  });

  it('caption voice stays silent if a bundled clip is rejected', async () => {
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak, cancel: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class {
        rate = 1;
        constructor(public text: string) {}
      },
      configurable: true,
    });
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('playback blocked'));
    vi.useFakeTimers();
    try {
      openWonder();
      act(() => usePlaybackStore.getState().seek(0.24));
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  it('caption voice stays silent for a wonder without ElevenLabs clips', () => {
    expect(narrationClipsForWonder('petra')).toHaveLength(0);
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak, cancel: vi.fn() },
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
      mountUnlisted('petra');
      act(() => usePlaybackStore.getState().seek(0.27));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  it('caption voice: Sydney uses bundled Alice clips, not browser speech', () => {
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak, cancel: vi.fn() },
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
      mountUnlisted('sydney-opera-house');
      act(() => usePlaybackStore.getState().seek(0.18));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(within(screen.getByTestId('live-caption')).getByText('The Point')).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      expect(play).toHaveBeenCalledTimes(SYDNEY_NARRATION.length + 1);
      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  it('caption voice: Eiffel uses bundled Adam clips, not browser speech', () => {
    useAudioStore.getState().setVoiceEnabled(false); // explicit saved OFF remains respected
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak, cancel: vi.fn() },
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
      openWonder('eiffel-tower');
      act(() => usePlaybackStore.getState().setEiffelEdit('detailed'));
      const champ = eiffelFactCaptionsForEdit(captionsFor(getWonder('eiffel-tower')), 'detailed')[0]!;
      act(() => usePlaybackStore.getState().seek(champ.from + 2.5 / EIFFEL_FILM_DURATION));
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(within(screen.getByTestId('live-caption')).getByText('The Champ')).toBeInTheDocument();
      expect(speak).not.toHaveBeenCalled();

      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /turn narration on/i }));
      expect(play).toHaveBeenCalledTimes(narrationClipsForWonder('eiffel-tower').length + 1);
      expect(speak).not.toHaveBeenCalled();
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
    expect(usePlaybackStore.getState().wonderId).toBe('sydney-opera-house'); // wraps Ready only
  });

  it('Escape closes back to the gallery', () => {
    openWonder();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().view).toBe('home');
    expect(usePlaybackStore.getState().status).toBe('paused');
  });

  it('floats the construction story over the uninterrupted ground lift, free of quote cards', () => {
    openWonder('eiffel-tower');
    act(() => usePlaybackStore.getState().setEiffelEdit('detailed'));
    act(() => usePlaybackStore.getState().seek((EIFFEL_FILM_LIFT_START_SECONDS-1)/EIFFEL_FILM_DURATION));
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveTextContent('A lifting frame raises an iron section from the ground.');
    expect(screen.queryByTestId('eiffel-editorial-cut')).not.toBeInTheDocument();
    expect(usePlaybackStore.getState().status).toBe('playing');
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
    act(() => usePlaybackStore.getState().seek((EIFFEL_FILM_LIFT_START_SECONDS+6.1)/EIFFEL_FILM_DURATION));
    expect(screen.queryByTestId('eiffel-chapter-caption')).not.toBeInTheDocument();
    expect(screen.getByTestId('eiffel-ground-lift-caption')).toHaveTextContent('Bring the iron section');
    expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
  });

  it('space toggles playback', () => {
    openWonder();
    fireEvent.keyDown(window, { key: ' ' });
    expect(usePlaybackStore.getState().status).toBe('paused');
    fireEvent.keyDown(window, { key: ' ' });
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('opens the three-minute Eiffel film without an edition picker and navigates its own clock', () => {
    openWonder('eiffel-tower');
    expect(screen.queryByRole('combobox', { name: 'Eiffel film version' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Detailed.*14 min/)).not.toBeInTheDocument();
    expect(screen.getByText('3 min film')).toBeInTheDocument();
    expect(usePlaybackStore.getState()).toMatchObject({ eiffelEdit: 'cinematic', durationMs: 180000, status: 'playing', t: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Play from Aligning the iron' }));
    expect(usePlaybackStore.getState().t).toBeCloseTo(eiffelChapterCaptionsForEdit('cinematic').find(cue => cue.id === 'eiffel-joint-prepared')!.fromSeconds / 180, 10);
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveTextContent('A crane turns the next iron section');
    expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next wonder/i }));
    expect(screen.queryByRole('combobox', { name: 'Eiffel film version' })).not.toBeInTheDocument();
    expect(screen.queryByText('3 min film')).not.toBeInTheDocument();
    expect(usePlaybackStore.getState().durationMs).toBe(60000);
  });

  it('clears the short-film closeup for captions while retaining chapter navigation and every control', () => {
    openWonder('eiffel-tower');
    act(() => usePlaybackStore.getState().seek(74 / 180));
    const scene = screen.getByTestId('wonder-canvas').closest('section')!;
    expect(scene).toHaveClass('eiffel-story-focus');
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveTextContent('An iron section arrives at the first platform');
    const toggle = screen.getByRole('button', { name: 'Chapters' });
    const navigation = screen.getByRole('navigation', { name: 'Film chapters' });
    expect(toggle).toHaveAttribute('aria-controls', navigation.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(navigation).toHaveClass('eiffel-compact-index-nav');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(scene).toHaveAttribute('data-chapters-open', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Play from Aligning the iron' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scene).toHaveAttribute('data-chapters-open', 'false');
    expect(toggle).toHaveFocus();
    expect(usePlaybackStore.getState().t).toBeCloseTo(eiffelChapterCaptionsForEdit('cinematic').find(cue => cue.id === 'eiffel-joint-prepared')!.fromSeconds / 180, 10);
    const controls = screen.getByRole('group', { name: 'Cinematic controls' });
    for (const name of ['Previous wonder', 'Pause', 'Next wonder', 'About this wonder', 'Playback speed: 1 times', 'Playback speed: 2 times', 'Playback speed: 4 times']) {
      expect(within(controls).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(controls).getByRole('slider', { name: 'Film position' })).toHaveClass('h-12');
  });

  it('retains compact chapter access outside Eiffel captions and on every other film', () => {
    openWonder('eiffel-tower');
    const scene = screen.getByTestId('wonder-canvas').closest('section')!;
    act(() => usePlaybackStore.getState().seek(74 / 180));
    expect(scene).toHaveClass('eiffel-story-focus');
    act(() => usePlaybackStore.getState().seek(88 / 180));
    expect(scene).not.toHaveClass('eiffel-story-focus');
    expect(screen.getByRole('button', { name: 'Chapters' })).toHaveAttribute('aria-expanded', 'false');
    act(() => { usePlaybackStore.getState().setEiffelEdit('detailed'); usePlaybackStore.getState().seek(74 / 180); });
    expect(scene).not.toHaveClass('eiffel-story-focus');
    fireEvent.click(screen.getByRole('button', { name: 'Next wonder' }));
    expect(scene).not.toHaveClass('eiffel-story-focus');
    expect(screen.getByRole('button', { name: 'Chapters' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores captions when switching films with the chapter drawer open', () => {
    openWonder('eiffel-tower');
    fireEvent.click(screen.getByRole('button', { name: 'Chapters' }));
    const section = screen.getByTestId('wonder-canvas').closest('section')!;
    expect(section).toHaveAttribute('data-chapters-open', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next wonder' }));
    expect(section).toHaveAttribute('data-chapters-open', 'false');
    expect(screen.getByRole('button', { name: 'Chapters' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('deep links', () => {
  it('#/wonder/:id opens a Ready cinematic and ignores unpublished ids', () => {
    window.location.hash = '#/wonder/colosseum';
    render(<App />);
    expect(useUiStore.getState().view).toBe('watch');
    expect(usePlaybackStore.getState().wonderId).toBe('colosseum');
    expect(screen.getByTestId('wonder-canvas')).toBeInTheDocument();
    cleanup();
    window.location.hash = '#/wonder/machu-picchu';
    useUiStore.setState({ view: 'home', homePlate: 'title' });
    usePlaybackStore.setState(createInitialState());
    render(<App />);
    expect(useUiStore.getState().view).toBe('home');
    expect(usePlaybackStore.getState().wonderId).not.toBe('machu-picchu');
  });

  it('unknown wonder ids fall back to home', () => {
    window.location.hash = '#/wonder/atlantis';
    render(<App />);
    expect(useUiStore.getState().view).toBe('home');
  });
});

it('opens an unpublished film only through the explicit debug film route', () => {
  expect(catalogReady().some((w) => w.id === 'petra')).toBe(false);
  window.location.hash = '#/debug/film/petra';
  act(() => useUiStore.getState().syncFromHash());
  expect(useUiStore.getState().view).toBe('watch');
  expect(usePlaybackStore.getState().wonderId).toBe('petra');
  expect(window.location.hash).toBe('#/debug/film/petra');
  act(() => useUiStore.getState().closeWonder());
  window.location.hash = '#/wonder/petra';
  act(() => useUiStore.getState().syncFromHash());
  expect(useUiStore.getState().view).toBe('home');
});

it('publishes the Sydney Opera House film on its public route', () => {
  expect(catalogReady().map((w) => w.id).at(-1)).toBe('sydney-opera-house');
  window.location.hash = '#/wonder/sydney-opera-house';
  act(() => useUiStore.getState().syncFromHash());
  expect(useUiStore.getState().view).toBe('watch');
  expect(usePlaybackStore.getState().wonderId).toBe('sydney-opera-house');
  act(() => useUiStore.getState().closeWonder());
});
