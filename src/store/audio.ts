import { create } from 'zustand';

/** Spec 05 §Cinematic view: the sound preference persists across sessions. */
const STORAGE_KEY = 'wonderforge:muted';
/** Caption narration preference (Spec 05 §Caption voice); default OFF. */
const VOICE_KEY = 'wonderforge:caption-voice';

function readStoredMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private mode / disabled storage: fall back to sound on.
    return false;
  }
}

function readStoredVoice(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(VOICE_KEY) === '1';
  } catch {
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

function persistVoice(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(VOICE_KEY, enabled ? '1' : '0');
  } catch {
    // Same courtesy as the soundtrack preference.
  }
}

export interface AudioState {
  muted: boolean;
  /** True once the browser has actually let us start a cue. */
  unlocked: boolean;
  /** Caption narration preference — default off, persists across sessions. */
  voiceEnabled: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setUnlocked: (unlocked: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  toggleVoice: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readStoredMuted(),
  unlocked: false,
  voiceEnabled: readStoredVoice(),

  setMuted: (muted) => {
    persistMuted(muted);
    set({ muted });
  },

  toggleMuted: () => get().setMuted(!get().muted),

  setUnlocked: (unlocked) => set({ unlocked }),

  setVoiceEnabled: (enabled) => {
    persistVoice(enabled);
    set({ voiceEnabled: enabled });
  },

  toggleVoice: () => get().setVoiceEnabled(!get().voiceEnabled),
}));
