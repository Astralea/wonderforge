import { create } from 'zustand';
import { WONDERS } from '../data';
import { prefersReducedMotion } from '../ui/a11y';
import { usePlaybackStore } from './playback';
import { useAudioStore } from './audio';
import { primeNarrationAudio } from '../ui/narrationAudio';

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
    if (!WONDERS.some((w) => w.id === id)) return;
    const playback = usePlaybackStore.getState();
    useAudioStore.getState().applyNarrationDefault(id);
    // A gallery click unlocks these local elements. A direct URL may still
    // need the later Play gesture; rejected priming remains quiet.
    if (useAudioStore.getState().voiceEnabled && !prefersReducedMotion()) primeNarrationAudio(id);
    playback.select(id);
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
    if (id && WONDERS.some((w) => w.id === id)) {
      const alreadyThere =
        get().view === 'watch' && usePlaybackStore.getState().wonderId === id;
      if (!alreadyThere) get().openWonder(id);
    } else if (get().view !== 'home') {
      usePlaybackStore.getState().pause();
      set({ view: 'home' });
    }
  },
}));
