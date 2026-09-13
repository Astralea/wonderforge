import {
  EIFFEL_FILM_DURATION, EIFFEL_FILM_FIRST_FLOOR_END_SECONDS, EIFFEL_FILM_INSERTIONS,
  EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS, EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS,
  eiffelFilmTimeForProduction, type EiffelFilmInsertion,
} from '../engine/eiffelFilm';
import { eiffelStage63ProductionToSeconds } from '../engine/eiffelStage63Pace';
import { EIFFEL_CINEMATIC_CAPTION_WINDOWS, eiffelFilmEditDuration, eiffelFilmEditTimeForSource, type EiffelFilmEdit } from '../engine/eiffelFilmEdit';
import type { CaptionBeat } from '../data/captions';
import { narrationClipFor } from '../data/narration';

export interface EiffelChapterCaption {
  readonly id: string;
  readonly kicker: string;
  readonly text: string;
  readonly fromSeconds: number;
  readonly toSeconds: number;
}

type CaptionCopy = Pick<EiffelChapterCaption, 'id' | 'kicker' | 'text'>;
export const EIFFEL_CHAPTER_CAPTION_COPY: Record<EiffelFilmInsertion['id'], readonly [CaptionCopy, CaptionCopy]> = {
  'ground-lift': [
    { id: 'eiffel-lift-prepared', kicker: 'At the foot of the tower', text: 'At the foot of each pylon, a lifting frame takes the weight of the iron.' },
    { id: 'eiffel-lift-later', kicker: 'Work around the tower', text: 'One member settles into place, while the other crews continue around the tower.' },
  ],
  'joint-campaign': [
    { id: 'eiffel-joint-prepared', kicker: 'An iron joint', text: 'Up close, workers align the plates and tighten the bolts that hold the joint.' },
    { id: 'eiffel-joint-later', kicker: 'Four pylons, one tower', text: 'Around them, many hands repeat the work, joining the four pylons into one tower.' },
  ],
  'long-load-first-floor': [
    { id: 'eiffel-relay-prepared', kicker: 'From platform to platform', text: 'Winches lift the longer members from platform to platform, toward the narrowing summit.' },
    { id: 'eiffel-relay-later', kicker: 'Above Paris', text: 'The work rises above Paris, until the tower’s iron lattice reaches the sky.' },
  ],
};

/** Authored source-film windows, retained independently of either viewer edit. */
export const EIFFEL_CHAPTER_CAPTIONS: readonly EiffelChapterCaption[] = (() => {
  let added = 0;
  return EIFFEL_FILM_INSERTIONS.flatMap((entry) => {
    const preparation = eiffelStage63ProductionToSeconds(entry.productionT) + added;
    const start = preparation + entry.preparationSeconds;
    const end = start + entry.duration;
    added += entry.preparationSeconds + entry.duration + entry.dismantlingSeconds;
    const [before, after] = EIFFEL_CHAPTER_CAPTION_COPY[entry.id];
    return [
      { ...before, fromSeconds: preparation, toSeconds: start + 6 },
      { ...after, fromSeconds: end - 4, toSeconds: end + entry.dismantlingSeconds },
    ];
  });
})();

const cinematicCaptions: readonly EiffelChapterCaption[] = EIFFEL_CINEMATIC_CAPTION_WINDOWS.map((window) => {
  const copy = EIFFEL_CHAPTER_CAPTIONS.find(cue => cue.id === window.id);
  if (!copy) throw new Error(`Unknown Eiffel story caption: ${window.id}`);
  return { ...copy, ...window };
});

const editSecondsForSource = (edit: EiffelFilmEdit, seconds: number) =>
  eiffelFilmEditTimeForSource(edit, seconds / EIFFEL_FILM_DURATION) * eiffelFilmEditDuration(edit);

const detailedCaptions: readonly EiffelChapterCaption[] = EIFFEL_CHAPTER_CAPTIONS.map(cue => {
  const fromSeconds = editSecondsForSource('detailed', cue.fromSeconds);
  // The physical chapter may be compressed. Preserve the spoken sentence and reading hold.
  const minimum = Math.max(8, (narrationClipFor('eiffel-tower', cue.id)?.duration ?? 0) + 1.2);
  return { ...cue, fromSeconds, toSeconds: Math.max(editSecondsForSource('detailed', cue.toSeconds), fromSeconds + minimum) };
});

export function eiffelChapterCaptionsForEdit(edit: EiffelFilmEdit): readonly EiffelChapterCaption[] {
  return edit === 'cinematic' ? cinematicCaptions : detailedCaptions;
}

/** Existing fact IDs/text/audio are retained; all window edges now belong to the viewer clock. */
export function eiffelFactCaptionsForEdit(beats: readonly CaptionBeat[], edit: EiffelFilmEdit): readonly CaptionBeat[] {
  if (edit === 'cinematic') return [];
  const duration = eiffelFilmEditDuration(edit);
  return beats.map(beat => {
    const sourceStart = beat.id === 'eiffel-beacon' ? EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS
      : eiffelFilmTimeForProduction(beat.from) * EIFFEL_FILM_DURATION;
    const sourceEnd = beat.id === 'eiffel-beacon' ? EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS + 8
      : eiffelFilmTimeForProduction(beat.until) * EIFFEL_FILM_DURATION;
    const fromSeconds = editSecondsForSource(edit, sourceStart);
    const minimum = Math.max(8, (narrationClipFor('eiffel-tower', beat.id)?.duration ?? 0) + 1.2);
    const toSeconds = Math.min(duration, Math.max(editSecondsForSource(edit, sourceEnd), fromSeconds + minimum));
    return { ...beat, from: fromSeconds / duration, until: toSeconds / duration, place: 'lower-right' };
  });
}

/** Quote follows the complete Beacon sentence in Detailed; Short keeps its existing six cues. */
export function eiffelClosingQuoteSourceSeconds(edit: EiffelFilmEdit): number {
  return EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS + (edit === 'detailed' ? 8 : 4);
}

/** Viewer-clock navigation, distinct from the shorter spoken caption windows. */
export function eiffelNavigationBeatsForEdit(edit: EiffelFilmEdit): readonly CaptionBeat[] {
  const duration = eiffelFilmEditDuration(edit);
  if (edit === 'cinematic') return cinematicCaptions.map(cue => ({
    ...cue, from: cue.fromSeconds / duration, until: cue.toSeconds / duration, place: 'lower-right',
  }));
  const entries = EIFFEL_FILM_INSERTIONS.map((entry, i) => {
    const cue = EIFFEL_CHAPTER_CAPTIONS[i * 2]!;
    const copy = EIFFEL_CHAPTER_CAPTION_COPY[entry.id][0];
    return { id: `eiffel-index-${entry.id}`, kicker: copy.kicker, text: copy.text, sourceSeconds: cue.fromSeconds };
  });
  const milestone = (id: string, kicker: string, text: string, productionT: number) => ({
    id: `eiffel-index-${id}`, kicker, text, sourceSeconds: eiffelFilmTimeForProduction(productionT) * EIFFEL_FILM_DURATION,
  });
  const sourceBeats = [
    { id: 'eiffel-index-foundations', kicker: 'The foundations', text: 'The four masonry foundations prepare a bearing for the tower’s iron pylons.', sourceSeconds: 0 },
    ...entries,
    // Fixed platform stages 23, 34 and 54 begin at these source schedule boundaries
    // in eiffelConstructionTiming.ts. Tests bind them to the actual kit schedule.
    milestone('first-platform', 'The first platform', 'The first platform joins the four rising pylons.', .285),
    milestone('second-platform', 'The second platform', 'The next platform supports the narrower tower above.', .41),
    milestone('upper-platform', 'The upper platform', 'The upper deck and summit rise above the city.', .63),
    { id: 'eiffel-index-second-floor-relay', kicker: 'Receiving on the second floor', text: 'The long member transfers from the first-floor cart to the upper receiving hoist.', sourceSeconds: EIFFEL_FILM_FIRST_FLOOR_END_SECONDS },
    { id: 'eiffel-index-summit', kicker: 'The final summit lift', text: 'The last mast assembly moves into place above the completed upper deck.', sourceSeconds: EIFFEL_FILM_STAGE63_FINAL_WAVE_START_SECONDS },
    { id: 'eiffel-index-completed', kicker: 'The completed tower', text: 'The final assembly is seated; the finished iron tower stands above Paris.', sourceSeconds: EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS },
  ].sort((a, b) => a.sourceSeconds - b.sourceSeconds);
  return sourceBeats.map((beat, i) => ({
    id: beat.id, kicker: beat.kicker, text: beat.text, place: 'lower-right',
    from: eiffelFilmEditTimeForSource(edit, beat.sourceSeconds / EIFFEL_FILM_DURATION),
    until: i + 1 < sourceBeats.length ? eiffelFilmEditTimeForSource(edit, sourceBeats[i + 1]!.sourceSeconds / EIFFEL_FILM_DURATION) : 1 + Number.EPSILON,
  }));
}

export function eiffelChapterCaptionAt(seconds: number, edit: EiffelFilmEdit = 'detailed'): EiffelChapterCaption | null {
  return eiffelChapterCaptionsForEdit(edit).find((cue) => seconds >= cue.fromSeconds && seconds < cue.toSeconds) ?? null;
}

/** Absolute edit time freezes the fade when paused and restores it on a seek. */
export function eiffelChapterCaptionOpacityAt(cue: EiffelChapterCaption, seconds: number): number {
  const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const fade = Math.min(.6, (cue.toSeconds - cue.fromSeconds) / 2);
  return ease((seconds - cue.fromSeconds) / fade) * ease((cue.toSeconds - seconds) / fade);
}
