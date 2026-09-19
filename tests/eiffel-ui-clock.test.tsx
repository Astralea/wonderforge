// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getWonder } from '../src/data';
import { captionsFor } from '../src/data/captions';
import { narrationClipFor } from '../src/data/narration';
import {
  EIFFEL_FILM_DURATION, EIFFEL_FILM_FIRST_FLOOR_END_SECONDS, EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS,
  eiffelFilmTimeForProduction, sampleEiffelFilm,
} from '../src/engine/eiffelFilm';
import { eiffelFilmEditSourceTAt, eiffelFilmEditTimeForSource } from '../src/engine/eiffelFilmEdit';
import { scheduleEiffelKitTiming } from '../src/engine/eiffelConstructionTiming';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { CaptionBeatIndex } from '../src/ui/CaptionBeatIndex';
import { CaptionLayer } from '../src/ui/CaptionLayer';
import { QuoteOverlay } from '../src/ui/QuoteOverlay';
import {
  EIFFEL_CHAPTER_CAPTIONS, eiffelChapterCaptionsForEdit, eiffelFactCaptionsForEdit,
  eiffelNavigationBeatsForEdit,
} from '../src/ui/eiffelChapterCaptions';
import { useCaptionVoice } from '../src/ui/useCaptionVoice';

vi.mock('../src/ui/useCaptionVoice', () => ({ useCaptionVoice: vi.fn() }));
vi.mock('../src/ui/a11y', () => ({ prefersReducedMotion: () => false }));
const wonder = getWonder('eiffel-tower');
const seekSource = (seconds: number) => act(() => usePlaybackStore.getState().seek(
  eiffelFilmEditTimeForSource('detailed', seconds / EIFFEL_FILM_DURATION)));

beforeEach(() => {
  usePlaybackStore.setState({ ...createInitialState(), eiffelEdit: 'detailed', wonderId: wonder.id, status: 'playing', durationMs: EIFFEL_FILM_DURATION * 1000 });
  vi.mocked(useCaptionVoice).mockClear();
});
afterEach(cleanup);

it('maps every Detailed story start through the inverse and retains complete local clips', () => {
  const cues = eiffelChapterCaptionsForEdit('detailed');
  for (const [i, cue] of cues.entries()) {
    const source = EIFFEL_CHAPTER_CAPTIONS[i]!;
    expect(eiffelFilmEditSourceTAt('detailed', cue.fromSeconds / EIFFEL_FILM_DURATION) * EIFFEL_FILM_DURATION)
      .toBeCloseTo(source.fromSeconds, 8);
    expect(cue.toSeconds - cue.fromSeconds).toBeGreaterThanOrEqual(8 - 1e-9);
    const clip = narrationClipFor(wonder.id, cue.id)!;
    expect(clip.captionText).toBe(cue.text);
    expect(cue.toSeconds - cue.fromSeconds).toBeGreaterThan(clip.duration + .6);
    if (i) expect(cue.fromSeconds).toBeGreaterThan(cues[i - 1]!.toSeconds);
  }
});

it('uses viewer seconds for a stretched fact sentence, not its old production-clock fraction', () => {
  const fact = eiffelFactCaptionsForEdit(captionsFor(wonder), 'detailed').find(beat => beat.id === 'eiffel-champ')!;
  const expectedSource = eiffelFilmTimeForProduction(captionsFor(wonder)[0]!.from);
  expect(eiffelFilmEditSourceTAt('detailed', fact.from)).toBeCloseTo(expectedSource, 10);
  render(<CaptionLayer wonder={wonder} />);
  act(() => usePlaybackStore.getState().seek(fact.from + 2.5 / EIFFEL_FILM_DURATION));
  expect(screen.getByTestId('live-caption')).toHaveTextContent(fact.text);
  const call = vi.mocked(useCaptionVoice).mock.calls.at(-1)!;
  expect(call[1]).toBe(fact.id);
  expect((call[4]! - call[5]!) * 60).toBeCloseTo(2.5, 8);
  expect(screen.getByTestId('live-caption').style.opacity).toBe('1');
});

it('navigation follows actual platform schedule ranges and remains available in the relay', () => {
  const stages = [{ id: 'first', stage: 23 }, { id: 'second', stage: 34 }, { id: 'upper', stage: 54 }];
  const schedule = scheduleEiffelKitTiming(stages, new Map());
  const beats = eiffelNavigationBeatsForEdit('detailed');
  for (const name of ['first', 'second', 'upper']) {
    const beat = beats.find(beat => beat.id === `eiffel-index-${name}-platform`)!;
    const sourceT = eiffelFilmEditSourceTAt('detailed', beat.from);
    expect(sampleEiffelFilm(sourceT).productionT).toBeCloseTo(schedule.get(name)!.start, 10);
  }
  expect(beats.length).toBe(10);
  expect(beats.every((beat, i) => i === 0 || beat.from > beats[i - 1]!.from)).toBe(true);
  expect(beats.find(beat => beat.id === 'eiffel-index-first-platform')!.from).toBeGreaterThan(.3);
  expect(beats.at(-2)!.from).toBeGreaterThan(.8);
  render(<CaptionBeatIndex wonder={wonder} onHoldChrome={() => {}} />);
  seekSource(EIFFEL_FILM_FIRST_FLOOR_END_SECONDS + 20);
  expect(screen.getByTestId('caption-beat-index')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play from The second-floor lift' })).toHaveAttribute('aria-current', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Play from The first platform' }));
  expect(usePlaybackStore.getState().t).toBeCloseTo(beats.find(beat => beat.id === 'eiffel-index-first-platform')!.from, 12);
  expect(screen.getByRole('button', { name: 'Play from The first platform' })).toHaveAttribute('aria-current', 'true');
});

it('keeps the quote and opening-night voice out of unfinished frames, then shows them sequentially', () => {
  render(<><CaptionLayer wonder={wonder} /><QuoteOverlay wonder={wonder} /></>);
  expect(screen.getByTestId('cinematic-title-card')).toHaveTextContent(wonder.name);
  for (const sourceSeconds of [220, 350, 720, EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS - .01]) {
    seekSource(sourceSeconds);
    expect(screen.queryByText(wonder.quote.text)).not.toBeInTheDocument();
    expect(screen.queryByText('The Beacon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-title-card')).not.toBeInTheDocument();
  }
  for (const offset of [.1, 4.5, 7.9]) {
    seekSource(EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS + offset);
    expect(screen.getByTestId('live-caption')).toHaveTextContent('The Beacon');
    expect(screen.queryByText(wonder.quote.text)).not.toBeInTheDocument();
  }
  seekSource(EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS + 8.1);
  expect(screen.getByText(wonder.quote.text)).toBeInTheDocument();
  expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
  seekSource(EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS - 1);
  expect(screen.queryByText(wonder.quote.text)).not.toBeInTheDocument();
});

it('caps the mobile index and scrolls only its own viewport when the active chapter changes', () => {
  render(<CaptionBeatIndex wonder={wonder} onHoldChrome={() => {}} />);
  const nav = screen.getByTestId('caption-beat-index');
  expect(nav).toHaveClass('max-h-[18dvh]', 'md:max-h-[min(22rem,32dvh)]');
  Object.defineProperty(nav, 'clientHeight', { value: 120 });
  vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({ top: 50 } as DOMRect);
  const target = screen.getByRole('button', { name: 'Play from The second-floor lift' });
  vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => ({ top: 350 - nav.scrollTop, height: 30 } as DOMRect));
  const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  seekSource(EIFFEL_FILM_FIRST_FLOOR_END_SECONDS + 10);
  expect(nav.scrollTop).toBe(210);
  nav.scrollTop = 75;
  act(() => usePlaybackStore.getState().tick(100));
  expect(nav.scrollTop).toBe(75);
  expect(pageScroll).not.toHaveBeenCalled();
  pageScroll.mockRestore();
});

it('aligns all six Cinematic navigation windows with the revised work passages and preserves other wonders’ quotes', () => {
  expect(eiffelNavigationBeatsForEdit('cinematic').map(beat => beat.from * 180)).toEqual([15, 24, 34, 44, 72, 144]);
  expect(eiffelFactCaptionsForEdit(captionsFor(wonder), 'cinematic')).toEqual([]);
  const giza = getWonder('pyramids-of-giza');
  render(<QuoteOverlay wonder={giza} />);
  act(() => usePlaybackStore.getState().seek(.2));
  expect(screen.getByText(giza.quote.text)).toBeInTheDocument();
});
