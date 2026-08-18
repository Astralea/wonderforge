/**
 * Typed soundtrack description (Spec 05 §Cinematic view).
 *
 * Pure data: no DOM, no Audio element, no browser globals. The UI layer owns
 * playback; this module only describes what exists and how loud it sits.
 *
 * Provenance: both cues were generated with Google's Lyria 002 music model on
 * Vertex AI (project ADC, region us-central1) from authored text prompts, then
 * assembled and level-matched locally with ffmpeg. They carry Google's SynthID
 * watermark. This is a deliberate, user-approved exception to Spec 00/03's
 * "procedural or locally licensed assets only" rule — it applies to audio
 * only. Visual assets stay procedural.
 */

export type TrackRole = 'cinematic' | 'ambient';

export interface SoundtrackTrack {
  id: string;
  role: TrackRole;
  /** Path under `public/`, served from the site root. */
  src: string;
  /** Exact encoded length in seconds. */
  duration: number;
  loop: boolean;
  /** Element volume, 0..1, chosen so the cue sits under the scene. */
  volume: number;
  description: string;
  /** The prompt shape that produced the cue, for regeneration. */
  prompt: string;
}

export const SOUNDTRACK: Record<TrackRole, SoundtrackTrack> = {
  cinematic: {
    id: 'giza-cinematic',
    role: 'cinematic',
    src: '/audio/giza-cinematic.mp3',
    // Matches the movie exactly: one second of score per second of movie, so
    // audio time is simply `t * duration`. Contract-tested against durationMs.
    duration: 60,
    loop: false,
    volume: 0.7,
    description:
      'Sixty-second score for the Giza construction movie: a hushed reed-flute ' +
      'dawn, an arched-harp and frame-drum hauling rhythm through the build, ' +
      'and a broad brass-and-strings climax that lands on the reveal beat ' +
      '(t = 0.92) before settling.',
    prompt:
      'Cinematic ancient Egyptian orchestral score for a monument construction ' +
      'montage, crossfaded into a triumphant golden-sunset finale.',
  },
  ambient: {
    id: 'giza-ambient-loop',
    role: 'ambient',
    src: '/audio/giza-ambient-loop.mp3',
    // Seamless: the file was cut so its tail crossfades into its own head.
    duration: 29.768229,
    loop: true,
    volume: 0.4,
    description:
      'Seamless desert drone for the home hero: warm sustained strings, sparse ' +
      'arched harp, a distant reed flute. No beat and no climax, so it never ' +
      'competes with the ambient orbit.',
    prompt:
      'Calm ambient ancient Egyptian desert atmosphere for a slowly orbiting ' +
      'title screen, even and seamless with no percussion.',
  },
};

export function trackFor(role: TrackRole): SoundtrackTrack {
  return SOUNDTRACK[role];
}
