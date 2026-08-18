import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { phaseAt, type Phase } from '../engine/timeline';
import { PLAYBACK_SPEEDS, usePlaybackStore } from '../store/playback';
import { SoundToggle } from './SoundToggle';

const PHASE_LABELS: Record<Phase, string> = {
  intro: 'Site preparation',
  build: 'Construction',
  reveal: 'Complete',
};

const iconButton =
  'grid min-h-11 min-w-11 place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold';

/** Spec 05 §Cinematic view: transport controls + scrubber. */
export function TransportBar({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  const status = usePlaybackStore((s) => s.status);
  const t = usePlaybackStore((s) => s.t);
  const speed = usePlaybackStore((s) => s.speed);
  const { play, pause, seek, replay, setSpeed } = usePlaybackStore.getState();

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-12 pb-5">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-1 px-4 sm:flex-nowrap md:gap-4 md:px-6">
        <button aria-label="Previous wonder" onClick={onPrev} className={iconButton}>
          <SkipBack size={18} />
        </button>
        {status === 'complete' ? (
          <button
            aria-label="Replay"
            onClick={replay}
            className={`${iconButton} text-gold`}
          >
            <RotateCcw size={20} />
          </button>
        ) : status === 'playing' ? (
          <button aria-label="Pause" onClick={pause} className={iconButton}>
            <Pause size={20} />
          </button>
        ) : (
          <button aria-label="Play" onClick={play} className={iconButton}>
            <Play size={20} />
          </button>
        )}
        <button aria-label="Next wonder" onClick={onNext} className={iconButton}>
          <SkipForward size={18} />
        </button>
        <SoundToggle />
        <div className="order-first flex w-full min-w-0 flex-col gap-2 sm:order-none sm:w-auto sm:flex-1">
          <span className="truncate text-right text-[10px] tracking-[0.16em] text-parchment/60 uppercase md:text-xs">
            {PHASE_LABELS[phaseAt(t)]}
          </span>
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={1}
            step={0.001}
            value={t}
            onChange={(e) => seek(Number.parseFloat(e.target.value))}
            className="h-11 w-full cursor-pointer accent-gold focus-visible:outline-2 focus-visible:outline-gold"
          />
        </div>
        <div
          role="group"
          aria-label="Playback speed"
          className="flex items-center gap-0.5 rounded-full border border-parchment/15 px-1 py-0.5"
        >
          {PLAYBACK_SPEEDS.map((value) => (
            <button
              key={value}
              aria-pressed={speed === value}
              aria-label={`${value}× speed`}
              onClick={() => setSpeed(value)}
              className={`min-h-11 min-w-11 rounded-full font-display text-xs tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                speed === value
                  ? 'bg-gold/90 text-umber-950'
                  : 'text-parchment/70 hover:bg-white/10 hover:text-parchment'
              }`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
