/**
 * Wonder-owned soundtrack descriptions (Spec 05, Spec 10).
 *
 * Pure data only. Lookup is deliberately `(wonderId, role)` so one culture's
 * score can never become the accidental fallback for another scene.
 */

export type TrackRole = 'cinematic' | 'ambient';

export interface SoundtrackTrack {
  id: string;
  wonderId: string;
  role: TrackRole;
  /** Path under `public/`, served from the site root. */
  src: string;
  /** Exact encoded length in seconds. */
  duration: number;
  loop: boolean;
  volume: number;
  description: string;
  /** Positive prompt shape retained for regeneration/review. */
  prompt: string;
  model: string;
  provenance: string;
}

export type WonderSoundtrack = Record<TrackRole, SoundtrackTrack>;
export type ScoredWonderId =
  | 'pyramids-of-giza'
  | 'stonehenge'
  | 'colosseum'
  | 'sydney-opera-house'
  | 'eiffel-tower';

const giza: WonderSoundtrack = {
  cinematic: {
    id: 'giza-cinematic',
    wonderId: 'pyramids-of-giza',
    role: 'cinematic',
    src: '/audio/giza-cinematic.mp3',
    duration: 60,
    loop: false,
    volume: 0.7,
    description:
      'Sixty-second Giza construction score: hushed reed-flute dawn, an ' +
      'arched-harp and frame-drum labour rhythm, and a broad reveal cadence.',
    prompt:
      'Cinematic ancient Egyptian score for a monument construction montage, ' +
      'crossfaded into a triumphant golden-sunset finale.',
    model: 'lyria-002',
    provenance:
      'Generated with Google Lyria 002 on Vertex AI using project ADC, ' +
      'assembled and level-matched locally with ffmpeg; SynthID watermarked.',
  },
  ambient: {
    id: 'giza-ambient-loop',
    wonderId: 'pyramids-of-giza',
    role: 'ambient',
    src: '/audio/giza-ambient-loop.mp3',
    duration: 83.2645,
    loop: true,
    volume: 0.4,
    description:
      'Longer Giza hero bed assembled from three Lyria clip takes: warm ' +
      'sustained strings, sparse arched harp, and a distant reed flute without ' +
      'a beat or climax.',
    prompt:
      'Calm ambient ancient Egyptian desert atmosphere for a slowly orbiting ' +
      'title screen, even and seamless with no percussion.',
    model: 'lyria-3-clip-preview',
    provenance:
      'Three Google Lyria 3 Clip takes on Vertex AI, equal-power crossfaded ' +
      'and loop-folded locally with ffmpeg; SynthID watermarked.',
  },
};

const stonehenge: WonderSoundtrack = {
  cinematic: {
    id: 'stonehenge-cinematic',
    wonderId: 'stonehenge',
    role: 'cinematic',
    src: '/audio/stonehenge-cinematic.mp3',
    duration: 60,
    loop: false,
    volume: 0.66,
    description:
      'Archaeologically cautious speculative score for Stonehenge: exposed ' +
      'breath tones, stretched-hide pulse, struck wood and low stone resonance ' +
      'move from open dawn through coordinated labour to a restrained reveal.',
    prompt:
      'A sixty-second instrumental prehistoric acoustic construction arc for ' +
      'open chalk downland: breathy raw flute-like tones, skin drum pulse, ' +
      'struck wood, resonant stone and wind, spacious and restrained.',
    model: 'lyria-3-pro-preview',
    provenance:
      'Generated for Stonehenge with Google Gen AI SDK and Lyria 3 Pro on ' +
      'Vertex AI using project ADC; locally duration-pinned and level-matched. ' +
      'This is respectful speculative scoring, not a claimed reconstruction.',
  },
  ambient: {
    id: 'stonehenge-ambient-loop',
    wonderId: 'stonehenge',
    role: 'ambient',
    src: '/audio/stonehenge-ambient-loop.mp3',
    duration: 77.752667,
    loop: true,
    volume: 0.36,
    description:
      'Longer open-air Stonehenge ambience assembled from three Lyria clip ' +
      'takes: low wind, occasional wood/stone resonance and distant breath tone.',
    prompt:
      'Instrumental prehistoric acoustic ambience on exposed chalk grassland: ' +
      'wind, sparse breath tone, distant wood and stone resonance, no climax.',
    model: 'lyria-3-clip-preview',
    provenance:
      'Three Google Lyria 3 Clip takes on Vertex AI, equal-power crossfaded ' +
      'and loop-folded locally with ffmpeg. Speculative scoring, not a claimed reconstruction.',
  },
};

const colosseum: WonderSoundtrack = {
  cinematic: {
    id: 'colosseum-cinematic',
    wonderId: 'colosseum',
    role: 'cinematic',
    src: '/audio/colosseum-cinematic.mp3',
    duration: 60,
    loop: false,
    volume: 0.68,
    description:
      'Sixty-second speculative Flavian construction score: tibia-like double ' +
      'pipe, cithara, a restrained frame-drum labour pulse, and timber-on-stone ' +
      'in the drained Roman valley, closing on a sober four-storey cadence.',
    prompt:
      'Cinematic acoustic score for Flavian builders raising the Colosseum: ' +
      'tibia/aulos-like double pipe, cithara/lyre, restrained frame-drum labour ' +
      'pulse, timber and stone contact, open valley air. Instrumental only.',
    model: 'lyria-3-pro-preview',
    provenance:
      'Generated for the Colosseum with Google Gen AI SDK and Lyria 3 Pro on ' +
      'Vertex AI using project ADC; locally duration-pinned and level-matched. ' +
      'This is respectful speculative scoring, not reconstructed Roman music.',
  },
  ambient: {
    id: 'colosseum-ambient-loop',
    wonderId: 'colosseum',
    role: 'ambient',
    src: '/audio/colosseum-ambient-loop.mp3',
    duration: 83.31675,
    loop: true,
    volume: 0.38,
    description:
      'Longer Flavian valley ambience assembled from three Lyria clip takes: ' +
      'warm dusty air, distant timber and stone, no beat and no climax.',
    prompt:
      'Instrumental ambient bed for the Flavian amphitheatre valley: warm dusty ' +
      'air, distant timber and stone, no beat and no climax.',
    model: 'lyria-3-clip-preview',
    provenance:
      'Three Google Lyria 3 Clip takes on Vertex AI, equal-power crossfaded ' +
      'and loop-folded locally with ffmpeg. Speculative scoring, not reconstructed Roman music.',
  },
};

const sydney: WonderSoundtrack = {
  cinematic: {
    id: 'sydney-opera-house-cinematic',
    wonderId: 'sydney-opera-house',
    role: 'cinematic',
    src: '/audio/sydney-opera-house-cinematic.mp3',
    duration: 60,
    loop: false,
    volume: 0.68,
    description:
      'Sixty-second speculative Australian harbour concert-house score: southern ' +
      'coastal light, civic orchestra, then a warm night cadence under the lit ' +
      'shells. Construction tints the midsection; it is never the hero pulse.',
    prompt:
      'Cinematic instrumental score for the Sydney Opera House: modern Australian ' +
      'harbour concert house, southern coastal light, concert-hall strings and ' +
      'woodwinds, civic night cadence. Never a Paris opera overture or steel-clank bed.',
    model: 'lyria-3-pro-preview',
    provenance:
      'Generated for the Sydney Opera House with Google Gen AI SDK and Lyria 3 ' +
      'Pro on Vertex AI using project ADC; locally duration-pinned and ' +
      'level-matched. Speculative scoring, not a copy of Civilization VI audio.',
  },
  ambient: {
    id: 'sydney-opera-house-ambient-loop',
    wonderId: 'sydney-opera-house',
    role: 'ambient',
    src: '/audio/sydney-opera-house-ambient-loop.mp3',
    duration: 27,
    loop: true,
    volume: 0.38,
    description:
      'Open Sydney Harbour ambience around Bennelong Point at concert hour: ' +
      'water, city hush, faint concert-hall warmth, folded into a quiet loop.',
    prompt:
      'Instrumental ambient bed for Sydney Harbour at concert hour: open water, ' +
      'city hush, faint strings and harp, no beat and no climax.',
    model: 'lyria-3-clip-preview',
    provenance:
      'Generated for the Sydney Opera House with Google Gen AI SDK and Lyria 3 ' +
      'Clip on Vertex AI using project ADC; locally loop-folded and ' +
      'level-matched. Speculative scoring, not a copy of Civilization VI audio.',
  },
};

const eiffel: WonderSoundtrack = {
  cinematic: {
    id: 'eiffel-tower-detailed',
    wonderId: 'eiffel-tower',
    role: 'cinematic',
    src: '/audio/eiffel-tower-detailed.mp3',
    duration: 829.426771,
    loop: false,
    volume: 0.68,
    description:
      'Five distinct 1889 Paris movements unfold across the complete film: morning, ' +
      'craftsmen, joining pylons, rooftops and evening lanterns. Salon strings, ' +
      'woodwinds and restrained civic brass; no repeated sixty-second cue.',
    prompt:
      'Original instrumental Eiffel construction score, Paris 1887–1889: ' +
      'evolving salon strings, woodwinds and restrained brass, spacious narration ' +
      'bed, no accordion, musette, can-can, jazz, vocals or trailer percussion.',
    model: 'lyria-3-pro-preview',
    provenance:
      'Five preserved Lyria 3 Pro takes generated on Vertex AI, level-matched to ' +
      '-18 LUFS, joined with five-second equal-power crossfades, and adjusted ' +
      '3.1 percent in tempo with pitch preserved to fit the complete film. ' +
      'No source loop or silent padding. Speculative scoring, not reconstructed music.',
  },
  ambient: {
    id: 'eiffel-tower-ambient-loop',
    wonderId: 'eiffel-tower',
    role: 'ambient',
    src: '/audio/eiffel-tower-ambient-loop.mp3',
    duration: 83.31675,
    loop: true,
    volume: 0.38,
    description:
      'Longer Champ de Mars ambience assembled from three Lyria clip takes: ' +
      'salon-string warmth, faint civic brass far off, no beat and no climax.',
    prompt:
      'Instrumental ambient bed for the Champ de Mars in 1889: temperate Paris ' +
      'air, salon strings, faint civic brass, no beat and no climax.',
    model: 'lyria-3-clip-preview',
    provenance:
      'Three Google Lyria 3 Clip takes on Vertex AI, equal-power crossfaded ' +
      'and loop-folded locally with ffmpeg. Speculative scoring, not a copy of Civilization VI audio.',
  },
};

/** The short edit owns a complete musical arc, independent of the long score. */
const eiffelShort: SoundtrackTrack = {
  ...eiffel.cinematic,
  id: 'eiffel-tower-short',
  src: '/audio/eiffel-tower-short.mp3',
  duration: 179.978521,
  description:
    'A separate three-minute musical arc from Paris dawn through intimate ' +
    'craftsmanship to the completed tower and a warm closing cadence.',
  provenance:
    'A separate preserved Lyria 3 Pro take generated on Vertex AI. Its complete ' +
    '147.67-second performance is slowed with pitch preserved to fit the ' +
    'three-minute edit and level-matched to -18.1 LUFS. No loop or silent padding.',
};

export const SOUNDTRACK: Record<ScoredWonderId, WonderSoundtrack> = {
  'pyramids-of-giza': giza,
  stonehenge,
  colosseum,
  'sydney-opera-house': sydney,
  'eiffel-tower': eiffel,
};

/** Missing/unreviewed legacy cues intentionally resolve to silence. */
export function trackFor(wonderId: string, role: TrackRole, edition: 'detailed' | 'cinematic' = 'detailed'): SoundtrackTrack | undefined {
  if (wonderId === 'eiffel-tower' && role === 'cinematic' && edition === 'cinematic') return eiffelShort;
  return SOUNDTRACK[wonderId as ScoredWonderId]?.[role];
}
