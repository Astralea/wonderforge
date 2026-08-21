/**
 * Caption beats for the cinematic view (Spec 05 §Caption layer): short,
 * authentic lower-thirds that fade in, hold, and fade out while the movie
 * plays. Typed data only — no UI imports. Text obeys the same rule as
 * quotes: true, era-checked, and attributable to the scene's typed data
 * (each Giza beat mirrors an existing historicalNote or spec zone).
 */

import type { Wonder } from './types';

export type CaptionPlace = 'lower-left' | 'lower-right' | 'upper-left';

export interface CaptionBeat {
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
    from: 0.18,
    until: 0.3,
    place: 'lower-right',
    kicker: 'The Quarry',
    text: 'Blocks are won from the plateau itself; the fine white casing crosses the river from Tura.',
  },
  {
    from: 0.34,
    until: 0.46,
    place: 'lower-left',
    kicker: 'The Roads',
    text: 'Sledges run on wetted roads — water on the sand eases the haul.',
  },
  {
    from: 0.5,
    until: 0.61,
    place: 'upper-left',
    kicker: 'The Ramps',
    text: 'Ramps of earth and brick rise with the working face, course by course.',
  },
  {
    from: 0.64,
    until: 0.75,
    place: 'lower-right',
    kicker: 'The Masons',
    text: 'Every casing stone is dressed, levered, and seated by hand.',
  },
  {
    from: 0.78,
    until: 0.865,
    place: 'upper-left',
    kicker: 'The Horizon',
    text: 'One building day stands for three reigns.',
  },
];

/** Two quiet beats from the catalog facts of any other wonder. */
function genericCaptions(wonder: Wonder): CaptionBeat[] {
  const beats: CaptionBeat[] = [];
  if (wonder.facts[0]) {
    beats.push({
      from: 0.2,
      until: 0.34,
      place: 'lower-right',
      kicker: wonder.name,
      text: wonder.facts[0],
    });
  }
  if (wonder.facts[1]) {
    beats.push({
      from: 0.52,
      until: 0.66,
      place: 'lower-left',
      kicker: wonder.location,
      text: wonder.facts[1],
    });
  }
  return beats;
}

/** The caption track for a wonder: Giza's authored beats, generics else. */
export function captionsFor(wonder: Wonder): CaptionBeat[] {
  return wonder.id === 'pyramids-of-giza' ? GIZA_CAPTIONS : genericCaptions(wonder);
}
