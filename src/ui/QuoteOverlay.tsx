import type { Wonder } from '../data/types';
import { usePlaybackStore } from '../store/playback';
import { eraLabel, formatYear } from './format';

/** When the title card hands off to the narrator quote. */
export const QUOTE_SHOWS_AT = 0.15;

/** Spec 05 §Cinematic view: title card, then the Civ VI narrator quote. */
export function QuoteOverlay({ wonder }: { wonder: Wonder }) {
  const t = usePlaybackStore((s) => s.t);
  const showQuote = t >= QUOTE_SHOWS_AT;

  return (
    <div className="pointer-events-none absolute bottom-24 left-6 max-w-md md:left-10 md:bottom-28">
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
