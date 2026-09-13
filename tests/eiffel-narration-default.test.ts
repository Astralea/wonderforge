// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useAudioStore } from '../src/store/audio';

const key = 'wonderforge:caption-voice';
beforeEach(() => {
  localStorage.clear();
  useAudioStore.setState({ voiceEnabled: false, voicePreference: null });
});
afterEach(() => vi.restoreAllMocks());

it('defaults the first Eiffel visit on without recording a choice or changing other wonder defaults', () => {
  const audio = useAudioStore.getState();
  audio.applyNarrationDefault('eiffel-tower');
  expect(useAudioStore.getState()).toMatchObject({ voiceEnabled: true, voicePreference: null });
  expect(localStorage.getItem(key)).toBeNull();
  audio.applyNarrationDefault('pyramids-of-giza');
  expect(useAudioStore.getState().voiceEnabled).toBe(false);
});

it('honors saved explicit OFF and ON on Eiffel entry', () => {
  for (const enabled of [false, true]) {
    localStorage.setItem(key, enabled ? '1' : '0');
    useAudioStore.setState({ voiceEnabled: !enabled, voicePreference: null });
    useAudioStore.getState().applyNarrationDefault('eiffel-tower');
    expect(useAudioStore.getState()).toMatchObject({ voiceEnabled: enabled, voicePreference: enabled });
  }
});

it('keeps an explicit in-session OFF even if storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable'); });
  const audio = useAudioStore.getState();
  audio.applyNarrationDefault('eiffel-tower');
  expect(useAudioStore.getState().voiceEnabled).toBe(true);
  audio.setVoiceEnabled(false);
  audio.applyNarrationDefault('eiffel-tower');
  expect(useAudioStore.getState().voiceEnabled).toBe(false);
});
