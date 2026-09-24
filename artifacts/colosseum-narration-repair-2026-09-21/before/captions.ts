/**
 * Caption beats for the cinematic view (Spec 05 §Caption layer): short,
 * authentic lower-thirds that fade in, hold, and fade out while the movie
 * plays. Typed data only — no UI imports. Text obeys the same rule as
 * quotes: true, era-checked, and attributable to the scene's typed data
 * (each Giza beat mirrors an existing historicalNote or spec zone).
 */

import type { Wonder } from './types';

/**
 * The quote/title card owns the lower-left corner permanently — captions
 * never take it (Spec 05 §Caption layer: no overlap, by construction).
 */
export type CaptionPlace = 'lower-right' | 'upper-left' | 'upper-right';

export interface CaptionBeat {
  /** Stable key used to bind optional prerecorded narration. */
  id: string;
  /** Movie-time window [from, until); windows are disjoint with gaps. */
  from: number;
  until: number;
  place: CaptionPlace;
  /** Small-caps label above the sentence. */
  kicker: string;
  text: string;
}

/** Giza follows the three successive royal monuments; see Spec 50 for evidence. */
const GIZA_CAPTIONS: CaptionBeat[] = [
  {
    "id": "giza-khufu",
    "from": 0.07,
    "until": 0.19,
    "place": "lower-right",
    "kicker": "Khufu's pyramid",
    "text": "Khufu's tomb rises first, built from limestone quarried on this plateau."
  },
  {
    "id": "giza-roads",
    "from": 0.215,
    "until": 0.335,
    "place": "upper-right",
    "kicker": "The haul",
    "text": "In this reconstruction, damp sand eases the passage of loaded sledges."
  },
  {
    "id": "giza-ramps",
    "from": 0.36,
    "until": 0.48,
    "place": "lower-right",
    "kicker": "Raising the stone",
    "text": "Here, ramps and levers raise each stone into place."
  },
  {
    "id": "giza-khafre",
    "from": 0.545,
    "until": 0.675,
    "place": "upper-right",
    "kicker": "Khafre's pyramid",
    "text": "Khafre, Khufu's son, builds the second great pyramid on higher ground."
  },
  {
    "id": "giza-casing",
    "from": 0.7,
    "until": 0.82,
    "place": "lower-right",
    "kicker": "White limestone",
    "text": "White casing stone came by water from the quarries at Tura."
  },
  {
    "id": "giza-menkaure",
    "from": 0.845,
    "until": 0.935,
    "place": "upper-right",
    "kicker": "Menkaure's pyramid",
    "text": "Menkaure's pyramid follows: three royal tombs, three separate reigns."
  }
];

/** Stonehenge follows visible mechanisms, then the solstice axis; see Spec 50. */
const STONEHENGE_CAPTIONS: CaptionBeat[] = [
  {
    "id": "stonehenge-earthwork",
    "from": 0.07,
    "until": 0.19,
    "place": "lower-right",
    "kicker": "Before the stones",
    "text": "An earthwork enclosure stood here centuries before the great stone circle."
  },
  {
    "id": "stonehenge-sarsens",
    "from": 0.215,
    "until": 0.335,
    "place": "upper-right",
    "kicker": "Shaping the sarsens",
    "text": "Hammerstones shaped the sarsens; their joints echo skilled woodworking."
  },
  {
    "id": "stonehenge-pits",
    "from": 0.36,
    "until": 0.48,
    "place": "lower-right",
    "kicker": "Raising the uprights",
    "text": "Here, ropes raise the uprights; rubble secures their bases."
  },
  {
    "id": "stonehenge-lintels",
    "from": 0.505,
    "until": 0.625,
    "place": "upper-right",
    "kicker": "Across the uprights",
    "text": "The film uses timber platforms to raise the stone lintels."
  },
  {
    "id": "stonehenge-bluestones",
    "from": 0.65,
    "until": 0.77,
    "place": "lower-right",
    "kicker": "Stones from Wales",
    "text": "Many smaller bluestones came from the Preseli Hills in Wales."
  },
  {
    "id": "stonehenge-axis",
    "from": 0.795,
    "until": 0.915,
    "place": "lower-right",
    "kicker": "The solstice axis",
    "text": "The axis marks midsummer sunrise and midwinter sunset."
  }
];

/**
 * Petra's authored track, written against Spec 11's descending face:
 * living sandstone, top-down carving, the Siq approach, and an authored
 * spoil haul. Timber chutes stay in the "movie's reading" register.
 */
const PETRA_CAPTIONS: CaptionBeat[] = [
  {
    id: 'petra-sandstone',
    from: 0.152,
    until: 0.264,
    place: 'lower-right',
    kicker: 'Living Stone',
    text: 'Al-Khazneh is cut from the Disi sandstone of Jabal al-Khubtha, not stacked in front of it.',
  },
  {
    id: 'petra-top-down',
    from: 0.294,
    until: 0.445,
    place: 'upper-right',
    kicker: 'Top Down',
    text: 'Nabataean masons typically carved downward, standing on the rock they had not yet removed.',
  },
  {
    id: 'petra-siq',
    from: 0.475,
    until: 0.611,
    place: 'upper-left',
    kicker: 'The Siq',
    text: 'The city is reached through a natural gorge more than a kilometre long.',
  },
  {
    id: 'petra-spoil',
    from: 0.641,
    until: 0.741,
    place: 'lower-right',
    kicker: 'The Spoil',
    text: 'Broken sandstone leaves the working face on sleds along the Siq floor — one plausible haul.',
  },
  {
    id: 'petra-facade',
    from: 0.771,
    until: 0.88,
    place: 'upper-left',
    kicker: 'The Treasury',
    text: 'The finished facade stands about 39 metres tall in a Hellenistic two-storey composition.',
  },
];

const COLOSSEUM_CAPTIONS: CaptionBeat[] = [
  {
    "id": "colosseum-valley",
    "from": 0.07,
    "until": 0.18,
    "place": "lower-right",
    "kicker": "Nero's former lake",
    "text": "Vespasian builds an amphitheatre on the site of Nero's lake."
  },
  {
    "id": "colosseum-stone",
    "from": 0.2,
    "until": 0.3,
    "place": "upper-right",
    "kicker": "Travertine from Tivoli",
    "text": "The load-bearing piers are built from travertine quarried near Tivoli."
  },
  {
    "id": "colosseum-cranes",
    "from": 0.32,
    "until": 0.43,
    "place": "lower-right",
    "kicker": "Lifting the blocks",
    "text": "In this reconstruction, treadwheel cranes raise the heavy stone blocks."
  },
  {
    "id": "colosseum-vaults",
    "from": 0.465,
    "until": 0.565,
    "place": "upper-right",
    "kicker": "Under the vaults",
    "text": "Here, timber supports hold the vaults while the concrete sets."
  },
  {
    "id": "colosseum-seating",
    "from": 0.585,
    "until": 0.685,
    "place": "lower-right",
    "kicker": "A place in the crowd",
    "text": "Tiered seating divides the crowd according to Roman social rank."
  },
  {
    "id": "colosseum-titus",
    "from": 0.71,
    "until": 0.81,
    "place": "lower-right",
    "kicker": "Titus opens the arena",
    "text": "In AD 80, Titus inaugurates the new amphitheatre."
  },
  {
    "id": "colosseum-moonrise",
    "from": 0.885,
    "until": 0.965,
    "place": "lower-right",
    "kicker": "Moonrise over Rome",
    "text": "After sunset, a nearly full Moon rises over Rome."
  }
];

const SYDNEY_CAPTIONS: CaptionBeat[] = [
  {
    id: 'sydney-point',
    from: 0.15,
    until: 0.318,
    place: 'lower-right',
    kicker: 'The Point',
    text: 'The podium of reconstituted granite is finished on Bennelong Point before any sail is raised.',
  },
  {
    id: 'sydney-ribs',
    from: 0.348,
    until: 0.508,
    place: 'upper-right',
    kicker: 'The Ribs',
    text: 'Precast concrete ribs — sections of Utzon\'s 75-metre sphere — wait in the on-site yard.',
  },
  {
    id: 'sydney-cranes',
    from: 0.538,
    until: 0.688,
    place: 'upper-left',
    kicker: 'The Cranes',
    text: 'Favelle Favco tower cranes, developed for this job, lift each rib onto steel falsework.',
  },
  {
    id: 'sydney-tiles',
    from: 0.718,
    until: 0.86,
    place: 'lower-right',
    kicker: 'The Tiles',
    text: 'More than one million Höganäs ceramic tiles clad the sails only after those ribs are seated.',
  },
];

const EIFFEL_CAPTIONS: CaptionBeat[] = [
  {
    id: 'eiffel-champ',
    from: 0.155,
    until: 0.28,
    place: 'lower-right',
    kicker: 'The Champ',
    text: 'The Champ de Mars is a parade ground; four masonry piers mark the tower\'s 125-metre square.',
  },
  {
    id: 'eiffel-iron',
    from: 0.31,
    until: 0.44,
    place: 'upper-right',
    kicker: 'The Iron',
    text: 'Puddled-iron members arrive prefabricated from Levallois-Perret and ride wagons to each pylon.',
  },
  {
    id: 'eiffel-legs',
    from: 0.47,
    until: 0.59,
    place: 'upper-left',
    kicker: 'The Legs',
    text: 'Four lattice pylons lean inward on creeper cranes until they meet at the first platform.',
  },
  {
    id: 'eiffel-join',
    from: 0.62,
    until: 0.74,
    place: 'lower-right',
    kicker: 'The Join',
    text: 'Hydraulic jacks close the first-platform join; the four legs become one tower.',
  },
  {
    id: 'eiffel-beacon',
    from: 0.77,
    until: 0.88,
    place: 'upper-left',
    kicker: 'The Beacon',
    text: 'Electric lanterns crown the 312-metre iron lace on the 1889 opening night.',
  },
];
function genericCaptions(wonder: Wonder): CaptionBeat[] {
  const beats: CaptionBeat[] = [];
  if (wonder.facts[0]) {
    beats.push({
      id: `${wonder.id}-fact-1`,
      from: 0.2,
      until: 0.34,
      place: 'lower-right',
      kicker: wonder.name,
      text: wonder.facts[0],
    });
  }
  if (wonder.facts[1]) {
    beats.push({
      id: `${wonder.id}-fact-2`,
      from: 0.52,
      until: 0.66,
      place: 'upper-left',
      kicker: wonder.location,
      text: wonder.facts[1],
    });
  }
  return beats;
}

/** Authored tracks for reference scenes; catalog-fact beats otherwise. */
export function captionsFor(wonder: Wonder): CaptionBeat[] {
  if (wonder.id === 'pyramids-of-giza') return GIZA_CAPTIONS;
  if (wonder.id === 'stonehenge') return STONEHENGE_CAPTIONS;
  if (wonder.id === 'petra') return PETRA_CAPTIONS;
  if (wonder.id === 'colosseum') return COLOSSEUM_CAPTIONS;
  if (wonder.id === 'sydney-opera-house') return SYDNEY_CAPTIONS;
  if (wonder.id === 'eiffel-tower') return EIFFEL_CAPTIONS;
  return genericCaptions(wonder);
}
