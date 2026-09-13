import type { Wonder } from '../data/types';
import { usePlaybackStore } from '../store/playback';
import { eraLabel, formatYear } from './format';
import { eiffelFilmEditDuration, sampleEiffelFilmEdit } from '../engine/eiffelFilmEdit';
import { EIFFEL_CHAPTER_CAPTIONS, eiffelChapterCaptionAt, eiffelClosingQuoteSourceSeconds } from './eiffelChapterCaptions';

/** When the title card hands off to the narrator quote. */
export const QUOTE_SHOWS_AT = 0.15;

/** Spec 05 §Cinematic view: title card, then the Civ VI narrator quote. */
export function QuoteOverlay({ wonder }: { wonder: Wonder }) {
  const t = usePlaybackStore((s) => s.t);
  const edit = usePlaybackStore((s) => s.eiffelEdit);
  const film = wonder.id === 'eiffel-tower' ? sampleEiffelFilmEdit(edit, t) : null;
  if (film && (film.chapter !== 'main' || eiffelChapterCaptionAt(t * eiffelFilmEditDuration(edit), edit))) return null;
  // The opening title and closing quote frame the story; neither occupies its working chapters.
  const showQuote = film ? film.seconds >= eiffelClosingQuoteSourceSeconds(edit) : t >= QUOTE_SHOWS_AT;
  if (film && !showQuote && film.seconds >= EIFFEL_CHAPTER_CAPTIONS[0]!.fromSeconds) return null;

  return (
    <div
      data-testid="cinematic-title-card"
      className="pointer-events-none absolute bottom-[calc(6vh+14rem)] left-6 z-10 max-w-md md:left-10"
    >
      {showQuote ? (
        <figure key="quote" className="animate-[quote-in_0.9s_ease-out]">
          <blockquote className="text-lg leading-relaxed text-parchment/95 italic before:content-['“'] after:content-['”'] md:text-xl">
            {wonder.quote.text}
          </blockquote>
          <figcaption className="mt-3 text-xs font-semibold tracking-[0.22em] text-gold/90 uppercase">
            — {wonder.quote.author}
          </figcaption>
          <p className="mt-4 font-display text-xl tracking-wider text-parchment">
            {wonder.name}
          </p>
        </figure>
      ) : (
        <div key="title" className="animate-[quote-in_0.9s_ease-out]">
          <p className="font-display text-3xl tracking-wider text-parchment drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-5xl">
            {wonder.name}
          </p>
          <p className="mt-3 text-sm tracking-[0.18em] text-parchment/70 uppercase">
            {wonder.location} · {eraLabel(wonder.era)} ·{' '}
            {formatYear(wonder.completedYear)}
          </p>
        </div>
      )}
    </div>
  );
}
