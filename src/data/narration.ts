/**
 * Typed prerecorded caption narration (Spec 05 §Caption voice).
 *
 * Pure metadata only: the UI layer owns Audio elements.
 * Clips are generated with ElevenLabs (`eleven_multilingual_v2`), normalized
 * locally to -16 LUFS, and served as bundled assets with no runtime network
 * call. Each reference scene keeps a distinct narrator. Missing clips are
 * silence — never browser speechSynthesis.
 */

export interface NarrationVoice {
  provider: 'ElevenLabs';
  name: 'George' | 'Daniel' | 'Bill' | 'Alice' | 'Adam';
  voiceId: string;
  model: 'eleven_multilingual_v2';
  description: string;
}

export interface NarrationClip {
  wonderId: string;
  captionId: string;
  /** Verbatim caption body; contract tests prevent clip/data drift. */
  captionText: string;
  src: string;
  duration: number;
  volume: number;
  voice: NarrationVoice;
}

export const GEORGE_NARRATION_VOICE: NarrationVoice = {
  provider: 'ElevenLabs',
  name: 'George',
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  model: 'eleven_multilingual_v2',
  description: 'Warm British male storyteller with a measured museum-film delivery.',
};

export const DANIEL_NARRATION_VOICE: NarrationVoice = {
  provider: 'ElevenLabs',
  name: 'Daniel',
  voiceId: 'onwK4e9ZLuTAKqWW03F9',
  model: 'eleven_multilingual_v2',
  description: 'Steady British documentary broadcaster; distinct from Giza\'s George.',
};

export const BILL_NARRATION_VOICE: NarrationVoice = {
  provider: 'ElevenLabs',
  name: 'Bill',
  voiceId: 'pqHfZKP75CvOlQylNhV4',
  model: 'eleven_multilingual_v2',
  description: 'Wise, mature, balanced American documentary voice; distinct from George and Daniel.',
};

export const ALICE_NARRATION_VOICE: NarrationVoice = {
  provider: 'ElevenLabs',
  name: 'Alice',
  voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
  model: 'eleven_multilingual_v2',
  description: 'Clear British educator; distinct from George, Daniel, and Bill.',
};

export const ADAM_NARRATION_VOICE: NarrationVoice = {
  provider: 'ElevenLabs',
  name: 'Adam',
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  model: 'eleven_multilingual_v2',
  description: 'Narrator American male; distinct from George, Daniel, Bill, and Alice.',
};

export const GIZA_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'pyramids-of-giza',
    captionId: 'giza-quarry',
    captionText:
      'Stone comes from the plateau; white casing stone arrives from Tura.',
    src: '/audio/narration/giza-george-quarry.mp3',
    duration: 6.780227,
    volume: 1,
    voice: GEORGE_NARRATION_VOICE,
  },
  {
    wonderId: 'pyramids-of-giza',
    captionId: 'giza-roads',
    captionText: 'Water on the sand helps crews pull the loaded sledges.',
    src: '/audio/narration/giza-george-roads.mp3',
    duration: 5.944308,
    volume: 1,
    voice: GEORGE_NARRATION_VOICE,
  },
  {
    wonderId: 'pyramids-of-giza',
    captionId: 'giza-ramps',
    captionText: 'In this reconstruction, ramps carry stones to each new level.',
    src: '/audio/narration/giza-george-ramps.mp3',
    duration: 5.479909,
    volume: 1,
    voice: GEORGE_NARRATION_VOICE,
  },
  {
    wonderId: 'pyramids-of-giza',
    captionId: 'giza-masons',
    captionText: 'Every casing stone is dressed, levered, and seated by hand.',
    src: '/audio/narration/giza-george-masons.mp3',
    duration: 5.24771,
    volume: 1,
    voice: GEORGE_NARRATION_VOICE,
  },
  {
    wonderId: 'pyramids-of-giza',
    captionId: 'giza-horizon',
    captionText: 'The film shows three reigns in a single day.',
    src: '/audio/narration/giza-george-horizon.mp3',
    duration: 4.272472,
    volume: 1,
    voice: GEORGE_NARRATION_VOICE,
  },
];

export const STONEHENGE_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'stonehenge',
    captionId: 'stonehenge-sarsens',
    captionText: 'Hammerstones shape the faces of the great sarsen stones.',
    src: '/audio/narration/stonehenge-daniel-sarsens.mp3',
    duration: 6.269388,
    volume: 1,
    voice: DANIEL_NARRATION_VOICE,
  },
  {
    wonderId: 'stonehenge',
    captionId: 'stonehenge-bluestones',
    captionText:
      'The smaller bluestones were transported from the Preseli Hills in Wales, over 200 km away.',
    src: '/audio/narration/stonehenge-daniel-bluestones.mp3',
    duration: 8.637823,
    volume: 1,
    voice: DANIEL_NARRATION_VOICE,
  },
  {
    wonderId: 'stonehenge',
    captionId: 'stonehenge-pits',
    captionText: 'Here, each upright tips into a sloping pit before rubble secures its base.',
    src: '/audio/narration/stonehenge-daniel-pits.mp3',
    duration: 7.709025,
    volume: 1,
    voice: DANIEL_NARRATION_VOICE,
  },
  {
    wonderId: 'stonehenge',
    captionId: 'stonehenge-lintels',
    captionText: 'The film uses timber platforms to raise the lintels.',
    src: '/audio/narration/stonehenge-daniel-lintels.mp3',
    duration: 5.572789,
    volume: 1,
    voice: DANIEL_NARRATION_VOICE,
  },
  {
    wonderId: 'stonehenge',
    captionId: 'stonehenge-axis',
    captionText: 'The stones align with the midsummer sunrise and midwinter sunset.',
    src: '/audio/narration/stonehenge-daniel-axis.mp3',
    duration: 6.083628,
    volume: 1,
    voice: DANIEL_NARRATION_VOICE,
  },
];

export const COLOSSEUM_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'colosseum',
    captionId: 'colosseum-valley',
    captionText:
      'Work begins on the drained floor between the Palatine and Caelian hills.',
    src: '/audio/narration/colosseum-bill-valley.mp3',
    duration: 4.272472,
    volume: 1,
    voice: BILL_NARRATION_VOICE,
  },
  {
    wonderId: 'colosseum',
    captionId: 'colosseum-stone',
    captionText: 'Load-bearing piers are Tivoli travertine hauled twenty kilometres into Rome.',
    src: '/audio/narration/colosseum-bill-stone.mp3',
    duration: 4.272472,
    volume: 1,
    voice: BILL_NARRATION_VOICE,
  },
  {
    wonderId: 'colosseum',
    captionId: 'colosseum-cranes',
    captionText:
      'In this reconstruction, treadwheel cranes lift blocks to each new level.',
    src: '/audio/narration/colosseum-bill-cranes.mp3',
    duration: 3.854512,
    volume: 1,
    voice: BILL_NARRATION_VOICE,
  },
  {
    wonderId: 'colosseum',
    captionId: 'colosseum-vaults',
    captionText: 'Timber supports hold the vaults during construction.',
    src: '/audio/narration/colosseum-bill-vaults.mp3',
    duration: 2.507755,
    volume: 1,
    voice: BILL_NARRATION_VOICE,
  },
  {
    wonderId: 'colosseum',
    captionId: 'colosseum-orders',
    captionText: 'Three tiers of arches rise beneath the solid upper wall.',
    src: '/audio/narration/colosseum-bill-orders.mp3',
    duration: 2.972154,
    volume: 1,
    voice: BILL_NARRATION_VOICE,
  },
];

export const SYDNEY_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'sydney-opera-house',
    captionId: 'sydney-point',
    captionText:
      'The podium of reconstituted granite is finished on Bennelong Point before any sail is raised.',
    src: '/audio/narration/sydney-alice-point.mp3',
    duration: 8.498503,
    volume: 1,
    voice: ALICE_NARRATION_VOICE,
  },
  {
    wonderId: 'sydney-opera-house',
    captionId: 'sydney-ribs',
    captionText:
      "Precast concrete ribs — sections of Utzon's 75-metre sphere — wait in the on-site yard.",
    src: '/audio/narration/sydney-alice-ribs.mp3',
    duration: 8.173424,
    volume: 1,
    voice: ALICE_NARRATION_VOICE,
  },
  {
    wonderId: 'sydney-opera-house',
    captionId: 'sydney-cranes',
    captionText:
      'Favelle Favco tower cranes, developed for this job, lift each rib onto steel falsework.',
    src: '/audio/narration/sydney-alice-cranes.mp3',
    duration: 7.244626,
    volume: 1,
    voice: ALICE_NARRATION_VOICE,
  },
  {
    wonderId: 'sydney-opera-house',
    captionId: 'sydney-tiles',
    captionText:
      'More than one million Höganäs ceramic tiles clad the sails only after those ribs are seated.',
    src: '/audio/narration/sydney-alice-tiles.mp3',
    duration: 7.616145,
    volume: 1,
    voice: ALICE_NARRATION_VOICE,
  },
];

export const EIFFEL_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'eiffel-tower',
    captionId: 'eiffel-champ',
    captionText:
      'The Champ de Mars is a parade ground; four masonry piers mark the tower\'s 125-metre square.',
    src: '/audio/narration/eiffel-adam-champ.mp3',
    duration: 6.919546,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: 'eiffel-iron',
    captionText:
      'Puddled-iron members arrive prefabricated from Levallois-Perret and ride wagons to each pylon.',
    src: '/audio/narration/eiffel-adam-iron.mp3',
    duration: 6.548027,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: 'eiffel-legs',
    captionText:
      'Four lattice pylons lean inward on creeper cranes until they meet at the first platform.',
    src: '/audio/narration/eiffel-adam-legs.mp3',
    duration: 6.083628,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: 'eiffel-join',
    captionText:
      'Hydraulic jacks close the first-platform join; the four legs become one tower.',
    src: '/audio/narration/eiffel-adam-join.mp3',
    duration: 5.665669,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: 'eiffel-beacon',
    captionText: 'Electric lanterns crown the 312-metre iron lace on the 1889 opening night.',
    src: '/audio/narration/eiffel-adam-beacon.mp3',
    duration: 6.037188,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
];

/** Story cues for continuous close-up and overview transitions in both editions. */
export const EIFFEL_STORY_NARRATION: readonly NarrationClip[] = [
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-lift-prepared",
    captionText: "A lifting frame raises an iron section from the ground.",
    src: "/audio/narration/eiffel-adam-lift-prepared.mp3",
    duration: 3.761633,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-lift-later",
    captionText: "Crews work on all four legs of the tower.",
    src: "/audio/narration/eiffel-adam-lift-later.mp3",
    duration: 3.761633,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-joint-prepared",
    captionText: "A crane turns the next iron section and lowers it into position.",
    src: "/audio/narration/eiffel-adam-joint-prepared.mp3",
    duration: 3.390113,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-joint-later",
    captionText: "The four legs will meet at the first platform.",
    src: "/audio/narration/eiffel-adam-joint-later.mp3",
    duration: 4.272472,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-relay-prepared",
    captionText: "An iron section arrives at the first platform, ready for the next lift.",
    src: "/audio/narration/eiffel-adam-relay-prepared.mp3",
    duration: 4.272472,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
  {
    wonderId: 'eiffel-tower',
    captionId: "eiffel-relay-later",
    captionText: "The frame narrows above the second platform.",
    src: "/audio/narration/eiffel-adam-relay-later.mp3",
    duration: 4.318912,
    volume: 1,
    voice: ADAM_NARRATION_VOICE,
  },
];

const ALL_NARRATION: readonly NarrationClip[] = [
  ...GIZA_NARRATION,
  ...STONEHENGE_NARRATION,
  ...COLOSSEUM_NARRATION,
  ...SYDNEY_NARRATION,
  ...EIFFEL_NARRATION,
  ...EIFFEL_STORY_NARRATION,
];

const CLIPS_BY_BEAT = new Map(
  ALL_NARRATION.map((clip) => [`${clip.wonderId}:${clip.captionId}`, clip]),
);

export function narrationClipFor(
  wonderId: string,
  captionId: string,
): NarrationClip | undefined {
  return CLIPS_BY_BEAT.get(`${wonderId}:${captionId}`);
}

/** Local narration assets to prepare when a viewer explicitly enables voice. */
export function narrationClipsForWonder(wonderId: string): readonly NarrationClip[] {
  return ALL_NARRATION.filter((clip) => clip.wonderId === wonderId);
}
