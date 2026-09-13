import { useEffect } from 'react';
import { trackFor, type TrackRole } from '../data/soundtrack';
import { useAudioStore } from '../store/audio';
import { usePlaybackStore } from '../store/playback';
import { prefersReducedMotion } from './a11y';
import { soundtrackClockAt } from '../engine/soundtrackClock';

/** Native media transport, with bounded recovery driven by media/user events. */
export function useSoundtrack(wonderId: string, role: TrackRole): void {
  const eiffelEdit = usePlaybackStore((s) => s.eiffelEdit);

  useEffect(() => {
    if (role === 'cinematic' && prefersReducedMotion()) return;
    const track = trackFor(wonderId, role, eiffelEdit);
    if (!track) return;
    const audio = new Audio(track.src);
    audio.loop = track.loop;
    audio.volume = track.volume;
    audio.preload = 'auto';
    audio.preservesPitch = true;
    audio.muted = useAudioStore.getState().muted;

    let disposed = false;
    let wanted = false;
    let pending = false;
    let generation = 0;
    let recoveryBudget = 2;
    let blocked: 'gesture' | 'ready' | 'terminal' | null = null;
    let restoreTime: number | null = null;
    let seekRevision: number | undefined;

    const clearGesture = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    const cancelAttempt = () => {
      generation++;
      pending = false;
      clearGesture();
    };
    // Chromium can classify an interrupted first request as SRC_NOT_SUPPORTED
    // before any metadata arrives. Our bundled cue still deserves a bounded
    // reload; a persistent format/404 failure exhausts the same retry budget.
    const recoverableSourceError = () => audio.error?.code === 2
      || (audio.error?.code === 4 && audio.readyState === 0);
    const recoverLoad = () => {
      if (!wanted || disposed || blocked === 'terminal') return;
      cancelAttempt();
      if (recoveryBudget-- <= 0) { blocked = 'terminal'; return; }
      restoreTime ??= audio.currentTime;
      blocked = 'ready';
      audio.load();
    };
    const failed = (error: unknown, attempt: number) => {
      if (disposed || !wanted || attempt !== generation) return;
      pending = false;
      const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
      if (name === 'NotAllowedError') {
        blocked = 'gesture';
        window.addEventListener('pointerdown', onGesture, { once: true });
        window.addEventListener('keydown', onGesture, { once: true });
      } else if (name === 'AbortError') {
        if (recoveryBudget-- <= 0) { blocked = 'terminal'; return; }
        blocked = 'ready';
        // Readiness may already have fired before the interrupted promise settles.
        if (audio.readyState >= 3) {
          queueMicrotask(() => {
            if (!disposed && wanted && attempt === generation && blocked === 'ready') onReady();
          });
        }
      } else if (recoverableSourceError() || name === 'NetworkError'
        || (name === 'NotSupportedError' && audio.readyState === 0)) {
        recoverLoad();
      } else {
        blocked = 'terminal';
      }
    };
    const attemptPlay = () => {
      if (disposed || !wanted || pending || blocked || !audio.paused || audio.ended) return;
      pending = true;
      const attempt = ++generation;
      const started = () => {
        if (disposed || attempt !== generation || !wanted) return;
        pending = false;
        clearGesture();
        useAudioStore.getState().setUnlocked(true);
      };
      try {
        const result = audio.play() as Promise<void> | undefined;
        if (result?.then) void result.then(started, (error: unknown) => failed(error, attempt));
        else started();
      } catch (error) { failed(error, attempt); }
    };
    function onGesture() {
      clearGesture();
      if (blocked === 'gesture') blocked = null;
      attemptPlay();
    }
    const onMetadata = () => {
      if (disposed || restoreTime === null) return;
      audio.currentTime = restoreTime;
      restoreTime = null;
    };
    function onReady() {
      if (!wanted || disposed) return;
      onMetadata();
      if (blocked === 'ready') blocked = null;
      attemptPlay();
    }
    const onPause = () => attemptPlay();
    const onStalled = () => {
      if (audio.readyState < 3) recoverLoad();
    };
    const onError = () => {
      if (!wanted || disposed) return;
      if (recoverableSourceError()) recoverLoad();
      else { cancelAttempt(); blocked = 'terminal'; }
    };
    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);

    const sync = (state: ReturnType<typeof usePlaybackStore.getState>) => {
      const shouldPlay = role === 'ambient' || (state.assetsReady && state.status === 'playing');
      if (role === 'cinematic' && state.assetsReady) {
        const clock = soundtrackClockAt(state.t, state.durationMs / 1000, track.duration, track.loop);
        audio.loop = clock.loop;
        if (seekRevision !== state.seekRevision) {
          audio.currentTime = clock.time;
          if (restoreTime !== null) restoreTime = clock.time;
          seekRevision = state.seekRevision;
        }
      }
      if (audio.playbackRate !== 1) audio.playbackRate = 1;
      // Animation ticks must never become a retry loop.
      if (wanted === shouldPlay) return;
      wanted = shouldPlay;
      cancelAttempt();
      blocked = null;
      if (wanted) {
        recoveryBudget = 2;
        if (recoverableSourceError()) recoverLoad();
        else attemptPlay();
      } else audio.pause();
    };
    sync(usePlaybackStore.getState());
    const unsubscribe = usePlaybackStore.subscribe(sync);
    const unsubscribeAudio = useAudioStore.subscribe((state) => {
      if (audio.muted === state.muted) return;
      audio.muted = state.muted;
      if (!state.muted) {
        // Keep this inside the sound-control gesture, including on browsers that
        // pause previously muted playback when it becomes audible.
        if (blocked === 'gesture') { clearGesture(); blocked = null; }
        attemptPlay();
      }
    });

    return () => {
      disposed = true;
      wanted = false;
      unsubscribe();
      unsubscribeAudio();
      cancelAttempt();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('stalled', onStalled);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [role, wonderId, eiffelEdit]);
}
