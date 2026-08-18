import { create } from 'zustand';

/** Spec 05 §Cinematic view: the sound preference persists across sessions. */
const STORAGE_KEY = 'wonderforge:muted';

function readStoredMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private mode / disabled storage: fall back to sound on.
    return false;
  }
}

function persistMuted(muted: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Preference is a nicety; never let storage failures break playback.
  }
}

export interface AudioState {
  muted: boolean;
  /** True once the browser has actually let us start a cue. */
  unlocked: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setUnlocked: (unlocked: boolean) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readStoredMuted(),
  unlocked: false,

  setMuted: (muted) => {
    persistMuted(muted);
    set({ muted });
  },

  toggleMuted: () => get().setMuted(!get().muted),

  setUnlocked: (unlocked) => set({ unlocked }),
}));
