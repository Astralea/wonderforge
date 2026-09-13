import { create } from 'zustand';

/** Spec 05 §Cinematic view: the sound preference persists across sessions. */
const STORAGE_KEY = 'wonderforge:muted';
/** Explicit caption preference. Eiffel defaults on only when this is absent. */
const VOICE_KEY = 'wonderforge:caption-voice';

function readStoredMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private mode / disabled storage: fall back to sound on.
    return false;
  }
}

function readStoredVoice(): boolean | null {
  try {
    const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(VOICE_KEY);
    return value === '1' ? true : value === '0' ? false : null;
  } catch {
    return null;
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
  /** Effective choice for the current wonder. */
  voiceEnabled: boolean;
  /** null means no explicit choice; never mistake the old default for OFF. */
  voicePreference: boolean | null;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setUnlocked: (unlocked: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  toggleVoice: () => void;
  applyNarrationDefault: (wonderId: string) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readStoredMuted(),
  unlocked: false,
  voiceEnabled: readStoredVoice() ?? false,
  voicePreference: readStoredVoice(),

  setMuted: (muted) => {
    persistMuted(muted);
    set({ muted });
  },

  toggleMuted: () => get().setMuted(!get().muted),

  setUnlocked: (unlocked) => set({ unlocked }),

  setVoiceEnabled: (enabled) => {
    persistVoice(enabled);
    set({ voiceEnabled: enabled, voicePreference: enabled });
  },

  toggleVoice: () => get().setVoiceEnabled(!get().voiceEnabled),

  applyNarrationDefault: (wonderId) => {
    const preference = get().voicePreference ?? readStoredVoice();
    set({ voicePreference: preference, voiceEnabled: preference ?? wonderId === 'eiffel-tower' });
  },
}));
