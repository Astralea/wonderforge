import { create } from 'zustand';
import { WONDERS } from '../data';
import { prefersReducedMotion } from '../ui/a11y';
import { usePlaybackStore } from './playback';

/** Spec 05 §Views & routing. */
export type View = 'home' | 'watch';

interface UiState {
  view: View;
  openWonder: (id: string) => void;
  closeWonder: () => void;
  syncFromHash: () => void;
}

const hashFor = (id: string) => `#/wonder/${id}`;

export const useUiStore = create<UiState>((set, get) => ({
  view: 'home',

  openWonder: (id) => {
    if (!WONDERS.some((w) => w.id === id)) return;
    const playback = usePlaybackStore.getState();
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
