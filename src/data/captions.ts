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

/**
 * Giza's authored track, written against the shot schedule: foundation and
 * quarry beats early, roads mid-build, ramps as they rise, the masons as the
 * casing climbs — and the horizon note closes before the reveal (the
 * ensemble blend starts at t = 0.88; no caption may cross it).
 */
const GIZA_CAPTIONS: CaptionBeat[] = [
  {
    id: 'giza-quarry',
    from: 0.18,
    // George's measured read is 6.78 s; keep the full line audible before the
    // next beat while retaining more than the required 0.03 reading gap.
    until: 0.305,
    place: 'lower-right',
    kicker: 'The quarry',
    text: 'Stone comes from the plateau; white casing stone arrives from Tura.',
  },
  {
    id: 'giza-roads',
    from: 0.34,
    until: 0.46,
    place: 'upper-right',
    kicker: 'The haul',
    text: 'Water on the sand helps crews pull the loaded sledges.',
  },
  {
    id: 'giza-ramps',
    from: 0.5,
    until: 0.61,
    place: 'upper-left',
    kicker: 'Raising the stone',
    text: 'In this reconstruction, ramps carry stones to each new level.',
  },
  {
    id: 'giza-masons',
    from: 0.64,
    until: 0.75,
    place: 'lower-right',
    kicker: 'The Masons',
    text: 'Every casing stone is dressed, levered, and seated by hand.',
  },
  {
    id: 'giza-horizon',
    from: 0.78,
    until: 0.865,
    place: 'upper-left',
    kicker: 'The three pyramids',
    text: 'The film shows three reigns in a single day.',
  },
];

/**
 * Stonehenge's authored track, written against Spec 10's mechanism holds:
 * dressing and sarsen weight early, the Preseli haul as bluestones move,
 * ramp-sided pits as uprights turn, timber cribs at the lintel hold, and
 * the solstitial axis before the reveal. Crib/A-frame wording stays in
 * the "likely / movie's reading" register — those methods are authored.
 */
const STONEHENGE_CAPTIONS: CaptionBeat[] = [
  {
    id: 'stonehenge-sarsens',
    from: 0.152,
    until: 0.264,
    place: 'lower-right',
    kicker: 'Shaping the stones',
    text: 'Hammerstones shape the faces of the great sarsen stones.',
  },
  {
    id: 'stonehenge-bluestones',
    from: 0.294,
    until: 0.445,
    place: 'upper-right',
    kicker: 'The Bluestones',
    text: 'The smaller bluestones were transported from the Preseli Hills in Wales, over 200 km away.',
  },
  {
    id: 'stonehenge-pits',
    from: 0.475,
    until: 0.611,
    place: 'upper-left',
    kicker: 'Raising the uprights',
    text: 'Here, each upright tips into a sloping pit before rubble secures its base.',
  },
  {
    id: 'stonehenge-lintels',
    from: 0.641,
    until: 0.741,
    place: 'lower-right',
    kicker: 'Lifting the lintels',
    text: 'The film uses timber platforms to raise the lintels.',
  },
  {
    id: 'stonehenge-axis',
    from: 0.771,
    until: 0.88,
    place: 'upper-left',
    kicker: 'Solstice alignment',
    text: 'The stones align with the midsummer sunrise and midwinter sunset.',
  },
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
    id: 'colosseum-valley',
    from: 0.152,
    until: 0.264,
    place: 'lower-right',
    kicker: 'The valley',
    text: 'Work begins on the drained floor between the Palatine and Caelian hills.',
  },
  {
    id: 'colosseum-stone',
    from: 0.294,
    until: 0.445,
    place: 'upper-right',
    kicker: 'The Stone',
    text: 'Load-bearing piers are Tivoli travertine hauled twenty kilometres into Rome.',
  },
  {
    id: 'colosseum-cranes',
    from: 0.475,
    until: 0.611,
    place: 'upper-left',
    kicker: 'Lifting the blocks',
    text: 'In this reconstruction, treadwheel cranes lift blocks to each new level.',
  },
  {
    id: 'colosseum-vaults',
    from: 0.641,
    until: 0.741,
    place: 'lower-right',
    kicker: 'The vaults',
    text: 'Timber supports hold the vaults during construction.',
  },
  {
    id: 'colosseum-orders',
    from: 0.771,
    until: 0.88,
    place: 'upper-left',
    kicker: 'The outer walls',
    text: 'Three tiers of arches rise beneath the solid upper wall.',
  },
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
