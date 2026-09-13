// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getWonder } from '../src/data';
import { EIFFEL_FILM_DURATION, sampleEiffelFilm } from '../src/engine/eiffelFilm';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { CaptionLayer } from '../src/ui/CaptionLayer';
import { eiffelChapterCaptionAt, eiffelChapterCaptionsForEdit, eiffelChapterCaptionOpacityAt } from '../src/ui/eiffelChapterCaptions';
import { useCaptionVoice } from '../src/ui/useCaptionVoice';

vi.mock('../src/ui/useCaptionVoice', () => ({ useCaptionVoice: vi.fn() }));

beforeEach(() => {
  usePlaybackStore.setState({ ...createInitialState(), eiffelEdit: 'detailed', wonderId: 'eiffel-tower', status: 'playing', durationMs: EIFFEL_FILM_DURATION * 1000 });
  vi.mocked(useCaptionVoice).mockClear();
});
afterEach(cleanup);
const detailedCaptions = eiffelChapterCaptionsForEdit('detailed');
const seekSeconds = (seconds: number) => act(() => usePlaybackStore.getState().seek(seconds / EIFFEL_FILM_DURATION));

it('provides six disjoint reading windows around actual insertion boundaries', () => {
  expect(detailedCaptions).toHaveLength(6);
  expect(new Set(detailedCaptions.map(cue => cue.id)).size).toBe(6);
  for (const [i, cue] of detailedCaptions.entries()) {
    expect(cue.toSeconds - cue.fromSeconds).toBeGreaterThanOrEqual(8);
    if (i) expect(cue.fromSeconds).toBeGreaterThanOrEqual(detailedCaptions[i-1]!.toSeconds);
    expect(eiffelChapterCaptionAt(cue.fromSeconds + 1e-5)?.id).toBe(cue.id);
    expect(eiffelChapterCaptionAt(cue.toSeconds)).not.toEqual(cue);
  }
});

it('keeps the caption and film-clock voice continuous across the formerly opaque preparation boundary', () => {
  const cue = detailedCaptions[0]!;
  render(<CaptionLayer wonder={getWonder('eiffel-tower')} />);
  for (const elapsed of [1, 2.999, 3.001, 5, 2]) {
    seekSeconds(cue.fromSeconds + elapsed);
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveTextContent(cue.text);
    expect(screen.getByTestId('eiffel-chapter-caption')).not.toHaveClass('inset-0');
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByTestId('eiffel-chapter-caption').parentElement).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByTestId('eiffel-editorial-cut')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eiffel-ground-lift-caption')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
    expect(usePlaybackStore.getState().status).toBe('playing');
    const call = vi.mocked(useCaptionVoice).mock.calls.at(-1)!;
    expect(call.slice(0, 4)).toEqual(['eiffel-tower', cue.id, cue.text, true]);
    expect((call[4]! - call[5]!) * 60).toBeCloseTo(elapsed, 8);
  }
  expect(sampleEiffelFilm((cue.fromSeconds + 1) / EIFFEL_FILM_DURATION).cutOpacity).toBe(1);
  expect(sampleEiffelFilm((cue.fromSeconds + 5) / EIFFEL_FILM_DURATION).cutOpacity).toBe(0);
});

it('retains paused text, resumes at elapsed time, and suppresses accelerated narration', () => {
  const cue = detailedCaptions[2]!;
  render(<CaptionLayer wonder={getWonder('eiffel-tower')} />);
  seekSeconds(cue.fromSeconds + 4.5);
  act(() => usePlaybackStore.getState().pause());
  expect(screen.getByTestId('eiffel-chapter-caption')).toHaveTextContent(cue.text);
  expect(vi.mocked(useCaptionVoice).mock.calls.at(-1)![3]).toBe(false);
  act(() => usePlaybackStore.getState().play());
  const resumed = vi.mocked(useCaptionVoice).mock.calls.at(-1)!;
  expect(resumed[3]).toBe(true);
  expect((resumed[4]! - resumed[5]!) * 60).toBeCloseTo(4.5, 8);
  act(() => usePlaybackStore.getState().setSpeed(2));
  expect(screen.queryByTestId('eiffel-chapter-caption')).not.toBeInTheDocument();
  expect(screen.queryByTestId('eiffel-joint-campaign-caption')).not.toBeInTheDocument();
  expect(vi.mocked(useCaptionVoice).mock.calls.at(-1)![3]).toBe(false);
});

it('selects later-work cues in both directions and returns to the original phase caption', () => {
  render(<CaptionLayer wonder={getWonder('eiffel-tower')} />);
  for (const cue of [...detailedCaptions, ...[...detailedCaptions].reverse()]) {
    seekSeconds(cue.fromSeconds + .5);
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveAttribute('data-caption-id', cue.id);
  }
  seekSeconds(detailedCaptions[0]!.toSeconds + .1);
  expect(screen.queryByTestId('eiffel-chapter-caption')).not.toBeInTheDocument();
  expect(screen.getByTestId('eiffel-ground-lift-caption')).toHaveTextContent('Bring the iron section');
});

it('uses the cinematic edit clock for every story clip and suppresses compressed fact clips', () => {
  act(() => usePlaybackStore.getState().setEiffelEdit('cinematic'));
  render(<CaptionLayer wonder={getWonder('eiffel-tower')} />);
  for (const cue of eiffelChapterCaptionsForEdit('cinematic')) {
    act(() => usePlaybackStore.getState().seek((cue.fromSeconds + 2.5) / 180));
    expect(screen.getByTestId('eiffel-chapter-caption')).toHaveAttribute('data-caption-id', cue.id);
    const call = vi.mocked(useCaptionVoice).mock.calls.at(-1)!;
    expect(call[1]).toBe(cue.id);
    expect((call[4]! - call[5]!) * 60).toBeCloseTo(2.5, 8);
  }
  act(() => usePlaybackStore.getState().seek(60 / 180));
  expect(screen.queryByTestId('live-caption')).not.toBeInTheDocument();
  expect(screen.queryByTestId('eiffel-ground-lift-caption')).not.toBeInTheDocument();
  expect(vi.mocked(useCaptionVoice).mock.calls.at(-1)![3]).toBe(false);
});

it('fades from absolute edit time and restores the same half-fade after pause and reverse seeking', () => {
  const cue = detailedCaptions[0]!;
  expect(eiffelChapterCaptionOpacityAt(cue, cue.fromSeconds)).toBe(0);
  expect(eiffelChapterCaptionOpacityAt(cue, cue.fromSeconds + .3)).toBeCloseTo(.5, 10);
  expect(eiffelChapterCaptionOpacityAt(cue, cue.fromSeconds + .6)).toBe(1);
  expect(eiffelChapterCaptionOpacityAt(cue, cue.toSeconds - .3)).toBeCloseTo(.5, 10);
  expect(eiffelChapterCaptionOpacityAt(cue, cue.toSeconds)).toBe(0);
  render(<CaptionLayer wonder={getWonder('eiffel-tower')} />);
  seekSeconds(cue.fromSeconds + .3);
  const first = screen.getByTestId('eiffel-chapter-caption').style.opacity;
  act(() => usePlaybackStore.getState().pause());
  expect(screen.getByTestId('eiffel-chapter-caption').style.opacity).toBe(first);
  seekSeconds(cue.fromSeconds + 2);
  seekSeconds(cue.fromSeconds + .3);
  expect(screen.getByTestId('eiffel-chapter-caption').style.opacity).toBe(first);
});
