// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWonder } from '../src/data';
import { captionsFor } from '../src/data/captions';
import { COLOSSEUM_WORK_END } from '../src/engine/colosseumFilm';
import { useAudioStore } from '../src/store/audio';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { CaptionBeatIndex } from '../src/ui/CaptionBeatIndex';
import { CaptionLayer } from '../src/ui/CaptionLayer';
import { QuoteOverlay } from '../src/ui/QuoteOverlay';
import { TransportBar } from '../src/ui/TransportBar';

const HISTORICAL_FILMS = [
  { id: 'pyramids-of-giza', chapterCount: 6 },
  { id: 'stonehenge', chapterCount: 6 },
  { id: 'colosseum', chapterCount: 6 },
] as const;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  usePlaybackStore.setState(createInitialState());
  useAudioStore.setState({ muted: false, unlocked: false, voiceEnabled: false, voicePreference: null });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function seek(t: number) {
  act(() => usePlaybackStore.getState().seek(t));
}

describe.each(HISTORICAL_FILMS)('$id historical chapters', ({ id, chapterCount }) => {
  it('exposes every chapter and can seek each one forward and backward', () => {
    const wonder = getWonder(id);
    const beats = captionsFor(wonder);
    usePlaybackStore.setState({ wonderId: id, status: 'paused' });
    render(<CaptionBeatIndex wonder={wonder} onHoldChrome={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: 'Film chapters' });
    expect(within(nav).getAllByRole('button')).toHaveLength(chapterCount);

    for (const beat of [...beats, ...[...beats].reverse()]) {
      act(() => usePlaybackStore.getState().pause());
      const button = within(nav).getByRole('button', { name: `Play from ${beat.kicker}` });
      expect(button).toHaveAccessibleDescription(beat.text);
      fireEvent.click(button);
      expect(usePlaybackStore.getState().t).toBe(beat.from);
      expect(usePlaybackStore.getState().status).toBe('playing');
      expect(button).toHaveAttribute('aria-current', 'true');
      expect(nav.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    }
  });

  it('yields its opening title to the first chapter and keeps the quote after the last chapter', () => {
    const wonder = getWonder(id);
    const beats = captionsFor(wonder);
    const first = beats[0]!;
    const last = beats.at(-1)!;
    usePlaybackStore.setState({ wonderId: id, status: 'paused' });
    render(<><QuoteOverlay wonder={wonder} /><CaptionLayer wonder={wonder} /></>);

    seek(first.from - 0.001);
    expect(screen.getByTestId('cinematic-title-card')).toHaveTextContent(wonder.name);
    expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();

    seek(first.from);
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('live-caption')).toHaveTextContent(first.text);

    for (const beat of beats) {
      seek((beat.from + beat.until) / 2);
      expect(screen.getByTestId('live-caption')).toHaveTextContent(beat.text);
      expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
      expect(screen.queryByText(wonder.quote.text)).not.toBeInTheDocument();
    }

    seek(last.until - 0.001);
    expect(screen.getByTestId('live-caption')).toHaveTextContent(last.text);
    expect(screen.queryByText(wonder.quote.text)).not.toBeInTheDocument();
    seek(last.until);
    expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
    expect(screen.getByTestId('cinematic-title-card')).toHaveTextContent(wonder.quote.text);

    seek((last.from + last.until) / 2);
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('live-caption')).toHaveTextContent(last.text);
  });
});

it('scrolls the chapter panel to the active last chapter and back without scrolling the page', () => {
  const wonder = getWonder('colosseum');
  const beats = captionsFor(wonder);
  render(<CaptionBeatIndex wonder={wonder} onHoldChrome={vi.fn()} />);
  const nav = screen.getByRole('navigation', { name: 'Film chapters' });
  const buttons = within(nav).getAllByRole('button');
  const scrollPage = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  // jsdom has no layout. Supply a clipped viewport and rows whose screen
  // positions move with the panel's real scrollTop, then inspect containment.
  Object.defineProperty(nav, 'clientHeight', { configurable: true, value: 100 });
  vi.spyOn(nav, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 50, 200, 100));
  for (const [index, button] of buttons.entries()) {
    vi.spyOn(button, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 50 + index * 40 - nav.scrollTop, 200, 32),
    );
  }

  seek(beats.at(-1)!.from);
  const panel = nav.getBoundingClientRect();
  const last = buttons.at(-1)!.getBoundingClientRect();
  expect(nav.scrollTop).toBeGreaterThan(0);
  expect(last.top).toBeGreaterThanOrEqual(panel.top);
  expect(last.bottom).toBeLessThanOrEqual(panel.bottom);

  seek(beats[0]!.from);
  const first = buttons[0]!.getBoundingClientRect();
  expect(nav.scrollTop).toBe(0);
  expect(first.top).toBeGreaterThanOrEqual(panel.top);
  expect(first.bottom).toBeLessThanOrEqual(panel.bottom);
  expect(scrollPage).not.toHaveBeenCalled();
});

function renderTransport(wonderId: string) {
  return render(<TransportBar wonderId={wonderId} onPrev={vi.fn()} onNext={vi.fn()}
    onToggleFacts={vi.fn()} factsOpen={false} />);
}

it('marks Colosseum construction complete at 80% while the final construction milestone keeps playing', () => {
  const completion = captionsFor(getWonder('colosseum')).at(-1)!;
  usePlaybackStore.setState({ wonderId: 'colosseum', status: 'playing', t: COLOSSEUM_WORK_END - 0.001 });
  renderTransport('colosseum');
  const controls = screen.getByRole('group', { name: 'Cinematic controls' });
  expect(within(controls).getByText('Construction')).toBeInTheDocument();

  for (const t of [COLOSSEUM_WORK_END, (completion.from + completion.until) / 2]) {
    seek(t);
    expect(within(controls).getByText('Complete')).toBeInTheDocument();
    expect(within(controls).getByRole('slider', { name: 'Film position' })).toHaveValue(String(t));
    expect(within(controls).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(within(controls).queryByRole('button', { name: 'Replay film' })).not.toBeInTheDocument();
    expect(usePlaybackStore.getState().status).toBe('playing');
  }

  seek(COLOSSEUM_WORK_END - 0.001);
  expect(within(controls).getByText('Construction')).toBeInTheDocument();
  seek(1);
  expect(within(controls).getByRole('button', { name: 'Replay film' })).toBeInTheDocument();
});

it.each(['pyramids-of-giza', 'stonehenge'])('keeps %s construction active at the Colosseum work cutoff', id => {
  usePlaybackStore.setState({ wonderId: id, status: 'playing', t: COLOSSEUM_WORK_END });
  renderTransport(id);
  expect(screen.getByText('Construction')).toBeInTheDocument();
  expect(screen.queryByText('Complete')).not.toBeInTheDocument();
});
