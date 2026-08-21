import { useMemo } from 'react';
import { captionsFor, type CaptionPlace } from '../data/captions';
import type { Wonder } from '../data/types';
import { captionStateAt } from '../engine/captions';
import { usePlaybackStore } from '../store/playback';

const PLACE_CLASSES: Record<CaptionPlace, string> = {
  'lower-left': 'bottom-[8vh] left-6 text-left md:left-10',
  'lower-right': 'bottom-[8vh] right-6 text-right md:right-10',
  'upper-left': 'top-[8vh] left-6 text-left md:left-10',
};

/**
 * Spec 05 §Caption layer: authored lower-thirds over the playing movie.
 * Renders only while playing at 1× (chrome is hidden then; at 2×/4× the
 * read time would compress past honesty; under reduced motion the movie
 * never plays). The envelope is a pure function of t — pausing or
 * scrubbing freezes a caption mid-fade.
 */
export function CaptionLayer({ wonder }: { wonder: Wonder }) {
  const t = usePlaybackStore((s) => s.t);
  const status = usePlaybackStore((s) => s.status);
  const speed = usePlaybackStore((s) => s.speed);
  const beats = useMemo(() => captionsFor(wonder), [wonder]);
  const caption =
    status === 'playing' && speed === 1 ? captionStateAt(beats, t) : null;

  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-0">
      {caption && (
        <figure
          className={`absolute max-w-md ${PLACE_CLASSES[caption.place]}`}
          style={{ opacity: caption.opacity }}
        >
          <div className="mb-2 h-px w-10 bg-gold/80" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.26em] text-gold/90 uppercase">
            {caption.kicker}
          </p>
          <p className="mt-2 font-display text-base leading-relaxed text-parchment/95 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] md:text-lg">
            {caption.text}
          </p>
        </figure>
      )}
    </div>
  );
}
