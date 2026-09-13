// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { getWonder } from '../src/data';
import { QuoteOverlay } from '../src/ui/QuoteOverlay';
import { TransportBar } from '../src/ui/TransportBar';
import { createInitialState, usePlaybackStore } from '../src/store/playback';
import { EIFFEL_FILM_DURATION, EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS as START, EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS as END } from '../src/engine/eiffelFilm';
afterEach(() => { cleanup(); usePlaybackStore.setState(createInitialState()); });
it('keeps the closing quote away from the active summit lift, including reverse seeking', () => {
  usePlaybackStore.setState({ ...createInitialState(), eiffelEdit: 'detailed', wonderId: 'eiffel-tower' });
  const wonder = getWonder('eiffel-tower');
  render(<QuoteOverlay wonder={wonder} />);
  for (const seconds of [START + 1, (START + END) / 2, END + 2, EIFFEL_FILM_DURATION, END - 1]) {
    act(() => usePlaybackStore.getState().seek(seconds / EIFFEL_FILM_DURATION));
    expect(Boolean(screen.queryByText(wonder.quote.text))).toBe(seconds === EIFFEL_FILM_DURATION);
  }
});
it('labels the actual completed hold correctly when scrubbing in both directions', () => {
  usePlaybackStore.setState({ ...createInitialState(), eiffelEdit: 'detailed', wonderId: 'eiffel-tower' });
  render(<TransportBar wonderId="eiffel-tower" onPrev={()=>{}} onNext={()=>{}} onToggleFacts={()=>{}} factsOpen={false} />);
  for (const seconds of [END - 1, END + 1, EIFFEL_FILM_DURATION, END - 1]) {
    act(() => usePlaybackStore.getState().seek(seconds / EIFFEL_FILM_DURATION));
    expect(Boolean(screen.queryByText('Complete', { exact: true }))).toBe(seconds >= END);
  }
});
