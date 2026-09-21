import { Info, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { COLOSSEUM_WORK_END } from '../engine/colosseumFilm';
import { phaseAt, type Phase } from '../engine/timeline';
import { PLAYBACK_SPEEDS, usePlaybackStore } from '../store/playback';
import { CaptionVoiceToggle } from './CaptionVoiceToggle';
import { SoundToggle } from './SoundToggle';
import { EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS } from '../engine/eiffelFilm';
import { sampleEiffelFilmEdit } from '../engine/eiffelFilmEdit';
import { useAudioStore } from '../store/audio';
import { prefersReducedMotion } from './a11y';
import { primeNarrationAudio } from './narrationAudio';
import { primeSoundtrack } from './useSoundtrack';

const PHASE_LABELS: Record<Phase, string> = {
  intro: 'Site preparation',
  build: 'Construction',
  reveal: 'Complete',
};

const iconButton =
  'grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold';

/** Spec 05 §Cinematic view: transport controls + scrubber. */
export function TransportBar({
  onPrev,
  onNext,
  onToggleFacts,
  factsOpen,
  wonderId,
}: {
  onPrev: () => void;
  onNext: () => void;
  onToggleFacts: () => void;
  factsOpen: boolean;
  wonderId: string;
}) {
  const status = usePlaybackStore((s) => s.status);
  const t = usePlaybackStore((s) => s.t);
  const speed = usePlaybackStore((s) => s.speed);
  const eiffelEdit = usePlaybackStore((s) => s.eiffelEdit);
  const { play, pause, seek, replay, setSpeed } = usePlaybackStore.getState();
  const progress = Math.round(t * 100);
  const film = wonderId === 'eiffel-tower' ? sampleEiffelFilmEdit(eiffelEdit, t) : null;
  const start = (restarting = false) => {
    if (!prefersReducedMotion()) primeSoundtrack(wonderId, 'cinematic');
    if (useAudioStore.getState().voiceEnabled) primeNarrationAudio(wonderId);
    if (restarting) replay(); else play();
  };

  return (
    <div className="absolute inset-x-0 bottom-[calc(6vh+0.5rem)] bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-16 pb-3">
      <div
        role="group"
        aria-label="Cinematic controls"
        className="mx-auto w-full max-w-4xl px-4 md:px-6"
      >
        <div className="mb-2 w-full">
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] tracking-[0.16em] text-parchment/60 uppercase md:text-xs">
            <span className="min-w-0 flex-1 truncate">
              {(wonderId === 'colosseum' && t >= COLOSSEUM_WORK_END) || (film && film.seconds >= EIFFEL_FILM_STAGE63_FINAL_WAVE_END_SECONDS) ? 'Complete' : film?.chapter === 'ground-lift' ? 'Ground delivery' : film?.chapter === 'joint-campaign' ? 'Deliver and connect' : PHASE_LABELS[phaseAt(film?.productionT ?? t)]}
            </span>
            {film && eiffelEdit === 'cinematic' && (
              <span className="shrink-0 tracking-normal normal-case">3 min film</span>
            )}
            <span aria-hidden>{progress}%</span>
          </div>
          <div className="relative flex h-12 items-center">
            <div className="pointer-events-none absolute inset-x-0 h-2 rounded-full bg-parchment/25" />
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 h-2 rounded-full bg-gold shadow-[0_0_12px_rgba(212,162,78,0.38)]"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              aria-label="Film position"
              min={0}
              max={1}
              step={0.001}
              value={t}
              onChange={(e) => seek(Number.parseFloat(e.target.value))}
              className="relative z-10 h-12 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-gold [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-umber-950 [&::-moz-range-thumb]:bg-gold [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-umber-950 [&::-webkit-slider-thumb]:bg-gold"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-parchment/10 pt-2 md:gap-2">
          <button aria-label="Previous wonder" onClick={onPrev} className={iconButton}>
            <SkipBack size={18} />
          </button>
          {status === 'complete' ? (
            <button
              aria-label="Replay film"
              onClick={() => start(true)}
              className={`${iconButton} text-gold`}
            >
              <RotateCcw size={20} />
            </button>
          ) : status === 'playing' ? (
            <button aria-label="Pause" onClick={pause} className={iconButton}>
              <Pause size={20} />
            </button>
          ) : (
            <button aria-label="Play" onClick={() => start()} className={iconButton}>
              <Play size={20} />
            </button>
          )}
          <button aria-label="Next wonder" onClick={onNext} className={iconButton}>
            <SkipForward size={18} />
          </button>
          <SoundToggle />
          <CaptionVoiceToggle wonderId={wonderId} />
          <button
            aria-label="About this wonder"
            aria-pressed={factsOpen}
            onClick={onToggleFacts}
            className={iconButton}
          >
            <Info size={18} />
          </button>
          <div
            role="group"
            aria-label="Playback speed"
            className="flex items-center gap-0.5 rounded-full border border-parchment/15 px-1 py-0.5"
          >
            {PLAYBACK_SPEEDS.map((value) => (
              <button
                key={value}
                aria-pressed={speed === value}
                aria-label={`Playback speed: ${value} times`}
                onClick={() => setSpeed(value)}
                className={`min-h-11 min-w-11 cursor-pointer rounded-full font-display text-xs tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
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
    </div>
  );
}
