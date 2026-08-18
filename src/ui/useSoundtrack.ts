import { useEffect, useRef } from 'react';
import { trackFor, type TrackRole } from '../data/soundtrack';
import { useAudioStore } from '../store/audio';
import { usePlaybackStore } from '../store/playback';
import { prefersReducedMotion } from './a11y';

/** Resync only when the cue has genuinely drifted (a seek), not every frame. */
const DRIFT_TOLERANCE_SECONDS = 0.35;

/**
 * Attempt playback, and if the browser's autoplay policy refuses, retry once
 * on the next user gesture. Returns a cleanup for any pending listener.
 */
function playWhenAllowed(audio: HTMLAudioElement): () => void {
  let retry: (() => void) | null = null;

  const cleanup = () => {
    if (!retry) return;
    window.removeEventListener('pointerdown', retry);
    window.removeEventListener('keydown', retry);
    retry = null;
  };

  const attempt = () => {
    // `play()` predates promises and still returns undefined in some engines
    // and test environments; treat that as "started" rather than throwing.
    const started = audio.play() as Promise<void> | undefined;
    if (!started?.then) {
      useAudioStore.getState().setUnlocked(true);
      return;
    }
    void started
      .then(() => {
        useAudioStore.getState().setUnlocked(true);
        cleanup();
      })
      .catch(() => {
        if (retry) return;
        retry = () => {
          retry = null;
          attempt();
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
  };

  attempt();
  return cleanup;
}

/**
 * Drives one soundtrack cue (Spec 05 §Cinematic view).
 *
 * `cinematic` follows the playback store: the store's normalized `t` stays
 * authoritative and the cue is corrected toward it, never the other way
 * around. `ambient` is a seamless loop for the home hero.
 *
 * The store subscription is imperative on purpose — `t` changes every frame,
 * and a React subscription would re-render the whole view at frame rate.
 * Muting toggles the element's `muted` property rather than pausing, so the
 * cue stays aligned with `t` and unmuting is instant.
 */
export function useSoundtrack(role: TrackRole): void {
  const muted = useAudioStore((s) => s.muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Under reduced motion the movie never advances, so a score synced to `t`
    // would sit frozen on one bar. Stay silent instead.
    if (role === 'cinematic' && prefersReducedMotion()) return;

    const track = trackFor(role);
    const audio = new Audio(track.src);
    audio.loop = track.loop;
    audio.volume = track.volume;
    audio.preload = 'auto';
    audio.preservesPitch = true;
    audio.muted = useAudioStore.getState().muted;
    audioRef.current = audio;

    let cancelPending: (() => void) | null = null;
    const stopPending = () => {
      cancelPending?.();
      cancelPending = null;
    };

    const release = () => {
      stopPending();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };

    if (role === 'ambient') {
      cancelPending = playWhenAllowed(audio);
      return release;
    }

    const sync = (state: ReturnType<typeof usePlaybackStore.getState>) => {
      const target = state.t * track.duration;
      if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE_SECONDS) {
        audio.currentTime = target;
      }
      if (audio.playbackRate !== state.speed) audio.playbackRate = state.speed;

      if (state.status === 'playing') {
        if (audio.paused) cancelPending = playWhenAllowed(audio);
      } else {
        stopPending();
        if (!audio.paused) audio.pause();
      }
    };

    sync(usePlaybackStore.getState());
    const unsubscribe = usePlaybackStore.subscribe(sync);

    return () => {
      unsubscribe();
      release();
    };
  }, [role]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);
}
