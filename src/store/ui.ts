import { create } from 'zustand';
import { WONDERS, isReadyWonder } from '../data';
import { prefersReducedMotion } from '../ui/a11y';
import { usePlaybackStore } from './playback';
import { useAudioStore } from './audio';
import { primeNarrationAudio } from '../ui/narrationAudio';
import { primeSoundtrack } from '../ui/useSoundtrack';

/** Spec 05 §Views & routing. */
export type View = 'home' | 'watch';

/** Spec 05 §Home: title card vs catalog, same diorama. */
export type HomePlate = 'title' | 'catalog';

interface UiState {
  view: View;
  homePlate: HomePlate;
  enterCatalog: () => void;
  showTitle: () => void;
  openWonder: (id: string) => void;
  closeWonder: () => void;
  syncFromHash: () => void;
}

const hashFor = (id: string) => `#/wonder/${id}`;

export const useUiStore = create<UiState>((set, get) => ({
  view: 'home',
  homePlate: 'title',

  enterCatalog: () => set({ homePlate: 'catalog' }),
  showTitle: () => set({ homePlate: 'title' }),

  openWonder: (id) => {
    if (!WONDERS.some((w) => w.id === id) || !isReadyWonder(id)) return;
    const playback = usePlaybackStore.getState();
    useAudioStore.getState().applyNarrationDefault(id);
    playback.select(id);
    // Clock and score wait for the first ready frame. Select still claims
    // assetsReady so unit tests without a canvas can tick; the catalog path
    // must not start BGM over the loader.
    usePlaybackStore.setState({ assetsReady: false });
    // Gallery click is the user gesture. Prime the cinematic cue here so a
    // later effect-driven play() is not blocked as autoplay (same pattern as
    // caption voice). Missing cues stay silent.
    if (!prefersReducedMotion()) primeSoundtrack(id, 'cinematic');
    if (useAudioStore.getState().voiceEnabled && !prefersReducedMotion()) primeNarrationAudio(id);
    if (prefersReducedMotion()) {
      playback.seek(1); // completed still, scrubbable — no auto-play
    } else {
      playback.play();
    }
    set({ view: 'watch' });
    if (window.location.hash !== hashFor(id)) {
      window.location.hash = hashFor(id);
    }
  },

  closeWonder: () => {
    usePlaybackStore.getState().pause();
    set({ view: 'home' });
    if (window.location.hash !== '#/') window.location.hash = '#/';
  },

  syncFromHash: () => {
    const match = window.location.hash.match(/^#\/wonder\/([a-z0-9-]+)$/);
    const id = match?.[1];
    if (id && isReadyWonder(id)) {
      const alreadyThere =
        get().view === 'watch' && usePlaybackStore.getState().wonderId === id;
      if (!alreadyThere) get().openWonder(id);
    } else if (get().view !== 'home') {
      usePlaybackStore.getState().pause();
      set({ view: 'home' });
    }
  },
}));
