import {
  narrationClipsForWonder,
  type NarrationClip,
} from '../data/narration';

/**
 * Browser-owned narration elements.  A delayed `new Audio(...).play()` is
 * rejected by autoplay policy even when narration was enabled earlier, so the
 * same elements are started silently from that explicit enable click and then
 * reused for their caption beats.
 */
const audioBySource = new Map<string, HTMLAudioElement>();
const playingNarration = new WeakSet<HTMLAudioElement>();

export function narrationAudioFor(clip: NarrationClip): HTMLAudioElement {
  const existing = audioBySource.get(clip.src);
  if (existing) return existing;

  const audio = new Audio(clip.src);
  audio.preload = 'auto';
  audio.volume = clip.volume;
  audio.preservesPitch = true;
  audioBySource.set(clip.src, audio);
  return audio;
}

/** The caption hook owns this element; priming must not pause it. */
export function markNarrationPlaying(audio: HTMLAudioElement): void {
  playingNarration.add(audio);
}

export function markNarrationIdle(audio: HTMLAudioElement): void {
  playingNarration.delete(audio);
}

/**
 * Prime every clip for this wonder inside the enabling click. Volume is zero
 * rather than muted so this remains a real user-activated media start in
 * browsers with strict autoplay enforcement. Each clip is immediately reset
 * after it has started; no sound is emitted during preparation.
 */
export function primeNarrationAudio(wonderId: string): void {
  for (const clip of narrationClipsForWonder(wonderId)) {
    const audio = narrationAudioFor(clip);
    audio.muted = false;
    audio.volume = 0;

    const reset = () => {
      if (playingNarration.has(audio)) {
        audio.volume = clip.volume;
        return;
      }
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Unready media can reject a seek; priming still unlocked playback.
      }
      audio.volume = clip.volume;
    };

    try {
      const started = audio.play() as Promise<void> | undefined;
      if (started?.then) void started.then(reset, reset);
      else reset();
    } catch {
      reset();
    }
  }
}

/** Stop active narration while retaining primed elements for a later re-enable. */
export function stopNarrationAudio(): void {
  for (const audio of audioBySource.values()) {
    playingNarration.delete(audio);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Same unready-media courtesy as priming.
    }
  }
}
