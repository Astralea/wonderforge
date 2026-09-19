import { useEffect, useId, useMemo, useRef, useState, type FocusEvent } from 'react';
import { captionsFor, type CaptionBeat } from '../data/captions';
import type { Wonder } from '../data/types';
import { captionBeatProgressAt } from '../engine/captions';
import { usePlaybackStore } from '../store/playback';
import { prefersReducedMotion } from './a11y';
import { eiffelNavigationBeatsForEdit } from './eiffelChapterCaptions';

/**
 * Spec 05 §Cinematic view: titles of every caption beat, past and upcoming.
 * Hover or focus reveals the sentence; a click seeks to that face and resumes
 * the movie. Lives in the auto-hiding chrome below the letterbox wordmark.
 */
export function CaptionBeatIndex({
  wonder,
  onHoldChrome,
  compact = false,
  onExpandedChange,
}: {
  wonder: Wonder;
  onHoldChrome: (held: boolean) => void;
  compact?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const navId = useId();
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const setNavigationOpen = (open: boolean) => {
    setExpanded(open);
    onExpandedChange?.(open);
    onHoldChrome(open);
  };
  useEffect(() => {
    if (!compact) {
      setExpanded(false);
      onExpandedChange?.(false);
      if (expanded) onHoldChrome(false);
    }
  }, [compact, expanded, onExpandedChange, onHoldChrome]);
  const t = usePlaybackStore((s) => s.t);
  const edit = usePlaybackStore((s) => s.eiffelEdit);
  const isEiffel = wonder.id === 'eiffel-tower';
  const beats = useMemo((): readonly CaptionBeat[] => isEiffel
    ? eiffelNavigationBeatsForEdit(edit) : captionsFor(wonder), [wonder, isEiffel, edit]);
  const navRef = useRef<HTMLElement>(null);
  const currentBeatId = beats.find(beat => captionBeatProgressAt(beat, t) === 'current')?.id ?? null;

  useEffect(() => {
    if (!isEiffel || !currentBeatId) return;
    const nav = navRef.current;
    const button = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !button || nav.clientHeight <= 0) return;
    const box = button.getBoundingClientRect();
    const top = box.top - nav.getBoundingClientRect().top + nav.scrollTop;
    const bottom = top + box.height;
    if (top < nav.scrollTop) nav.scrollTop = Math.max(0, top);
    else if (bottom > nav.scrollTop + nav.clientHeight) nav.scrollTop = bottom - nav.clientHeight;
  }, [currentBeatId, isEiffel]);

  const jumpTo = (from: number) => {
    if (compact && expanded) {
      setNavigationOpen(false);
      toggleRef.current?.focus();
    }
    const playback = usePlaybackStore.getState();
    playback.seek(from);
    if (prefersReducedMotion()) return;
    const next = usePlaybackStore.getState();
    if (next.status === 'paused' || next.status === 'idle') next.play();
  };

  const releaseChrome = (e: FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    onHoldChrome(false);
  };

  return (
    <>
    {compact && (
      <button ref={toggleRef} type="button" aria-expanded={expanded} aria-controls={navId}
        onClick={() => setNavigationOpen(!expanded)}
        className="eiffel-chapters-toggle min-h-11 cursor-pointer px-3 text-xs tracking-widest text-parchment uppercase focus-visible:outline-2 focus-visible:outline-gold">
        {expanded ? 'Close chapters' : 'Chapters'}
      </button>
    )}
    <nav
      id={navId}
      ref={navRef}
      aria-label="Film chapters"
      data-testid="caption-beat-index"
      data-expanded={expanded}
      className={`max-w-[19rem] ${compact ? 'eiffel-compact-index-nav' : ''} ${isEiffel ? 'max-h-[18dvh] overflow-y-auto pr-2 md:max-h-[min(22rem,32dvh)]' : ''} ${isEiffel && edit === 'cinematic' ? 'eiffel-short-beats' : ''}`}
      onPointerEnter={() => onHoldChrome(true)}
      onPointerLeave={() => onHoldChrome(false)}
      onFocusCapture={() => onHoldChrome(true)}
      onBlurCapture={releaseChrome}
    >
      <ol className="relative m-0 flex list-none flex-col p-0">
        <span
          aria-hidden
          className="pointer-events-none absolute top-2 bottom-2 left-1.5 w-px bg-gradient-to-b from-gold/70 via-gold/28 to-parchment/15"
        />
        {beats.map((beat) => {
          const progress = captionBeatProgressAt(beat, t);
          const current = progress === 'current';
          const past = progress === 'past';
          const kickerTone = current
            ? 'text-gold'
            : past
              ? 'text-parchment/55 group-hover:text-parchment/90 group-focus-visible:text-parchment/90'
              : 'text-parchment/32 group-hover:text-parchment/80 group-focus-visible:text-parchment/80';
          const mark = current
            ? 'border-gold bg-gold shadow-[0_0_8px_rgba(212,162,78,0.55)]'
            : past
              ? 'border-gold/65 bg-gold/35'
              : 'border-parchment/35 bg-transparent';

          return (
            <li key={beat.id} className="relative">
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                aria-label={`${prefersReducedMotion() ? 'Show' : 'Play from'} ${beat.kicker}`}
                aria-describedby={`${beat.id}-sentence`}
                onClick={() => jumpTo(beat.from)}
                className="group flex w-full cursor-pointer items-start gap-3 rounded-none py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <span
                  className="relative mt-1.5 grid h-3 w-3 shrink-0 place-items-center"
                  aria-hidden
                >
                  <span className={`h-1.5 w-1.5 rotate-45 border ${mark}`} />
                </span>
                <span className="min-w-0 flex-1 pt-px">
                  <span
                    className={`block truncate text-[12px] font-semibold tracking-[0.2em] uppercase ${kickerTone}`}
                  >
                    {beat.kicker}
                  </span>
                  <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] motion-reduce:transition-none">
                    <span className="min-h-0 overflow-hidden">
                      <span
                        id={`${beat.id}-sentence`}
                        className="mt-1.5 block border-l border-gold/40 pl-2.5 text-[13px] leading-snug font-normal tracking-normal text-parchment/80 normal-case"
                      >
                        {beat.text}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
    </>
  );
}
