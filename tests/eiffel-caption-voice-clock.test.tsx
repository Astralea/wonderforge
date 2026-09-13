// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { useAudioStore } from '../src/store/audio';
import { useCaptionVoice } from '../src/ui/useCaptionVoice';
import { EIFFEL_FILM_DURATION } from '../src/engine/eiffelFilm';

const { audio } = vi.hoisted(() => ({ audio: {
  currentTime: 0, muted: false, volume: 1, preservesPitch: false,
  play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
} }));
vi.mock('../src/ui/narrationAudio', () => ({
  narrationAudioFor: () => audio, markNarrationIdle: vi.fn(), markNarrationPlaying: vi.fn(), stopNarrationAudio: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); usePlaybackStore.setState(createInitialState()); });

it('seeks an existing sentence exactly once per explicit revision, never on speed changes or ticks', () => {
  useAudioStore.setState({ voiceEnabled: true });
  usePlaybackStore.setState({ ...createInitialState(), eiffelEdit: 'detailed', wonderId: 'eiffel-tower', t: .2, durationMs: EIFFEL_FILM_DURATION * 1000, status: 'playing' });
  renderHook(() => {
    const state = usePlaybackStore();
    useCaptionVoice('eiffel-tower', 'eiffel-champ', 'The Champ', state.status === 'playing',
      state.t * EIFFEL_FILM_DURATION / 60, .2 * EIFFEL_FILM_DURATION / 60);
  });
  expect(audio.play).toHaveBeenCalledTimes(1);
  act(() => { usePlaybackStore.getState().tick(500); usePlaybackStore.getState().setSpeed(2); usePlaybackStore.getState().tick(500); });
  expect(audio.play).toHaveBeenCalledTimes(1);
  act(() => usePlaybackStore.getState().seek(.2 + 2.5 / EIFFEL_FILM_DURATION));
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(audio.currentTime).toBeCloseTo(2.5, 8);
  act(() => usePlaybackStore.getState().seek(.2 + 1 / EIFFEL_FILM_DURATION));
  expect(audio.play).toHaveBeenCalledTimes(3);
  expect(audio.currentTime).toBeCloseTo(1, 8);
  act(() => usePlaybackStore.getState().pause());
  expect(audio.currentTime).toBe(0);
  act(() => usePlaybackStore.getState().play());
  expect(audio.play).toHaveBeenCalledTimes(4);
  expect(audio.currentTime).toBeCloseTo(1, 8);
});
