import { useEffect, useRef } from 'react';
import { narrationClipFor } from '../data/narration';
import { useAudioStore } from '../store/audio';
import { usePlaybackStore } from '../store/playback';
import {
  markNarrationIdle,
  markNarrationPlaying,
  narrationAudioFor,
  stopNarrationAudio,
} from './narrationAudio';

/**
 * Caption narration (Spec 05 §Caption voice): play the bundled ElevenLabs
 * clip for this beat. Missing clips and playback failures are silence —
 * never browser speechSynthesis, never a runtime TTS request. Leaving the
 * beat, pausing, seeking, or toggling off stops the clip. Caption visibility
 * already gates voice at 1× playback only.
 */
export function useCaptionVoice(
  wonderId: string,
  captionId: string | null,
  captionText: string | null,
  active: boolean,
  t = 0,
  windowFrom = 0,
): void {
  const voiceEnabled = useAudioStore((s) => s.voiceEnabled);
  const seekRevision = usePlaybackStore((s) => s.seekRevision);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!voiceEnabled || !active || !captionId || !captionText) return;

    const clip = narrationClipFor(wonderId, captionId);
    if (!clip) return;

    const audio = narrationAudioFor(clip);
    const elapsed = Math.max(0, (tRef.current - windowFrom) * 60);
    if (elapsed >= clip.duration - 0.08) return;

    markNarrationPlaying(audio);
    audio.muted = false;
    audio.volume = clip.volume;
    audio.preservesPitch = true;
    let disposed = false;
    const seekToElapsed = () => {
      if (disposed || elapsed < 0.05) return;
      try {
        audio.currentTime = Math.min(elapsed, Math.max(0, clip.duration - 0.05));
      } catch {
        // Metadata is not ready yet; playing from the start is better than
        // aborting the beat (setting currentTime on HAVE_NOTHING can throw).
      }
    };
    seekToElapsed();
    audio.addEventListener('loadedmetadata', seekToElapsed, { once: true });
    const started = audio.play() as Promise<void> | undefined;
    if (started?.catch) void started.catch(() => undefined);

    return () => {
      disposed = true;
      markNarrationIdle(audio);
      audio.removeEventListener('loadedmetadata', seekToElapsed);
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore seek errors while tearing down an unready element.
      }
    };
  }, [voiceEnabled, active, wonderId, captionId, captionText, windowFrom, seekRevision]);

  useEffect(
    () => () => {
      stopNarrationAudio();
    },
    [],
  );
}
