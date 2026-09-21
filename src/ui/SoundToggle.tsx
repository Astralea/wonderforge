import { Volume2, VolumeX } from 'lucide-react';
import { useAudioStore } from '../store/audio';

/**
 * The single control for the soundtrack (Spec 05 §Cinematic view). It appears
 * anywhere a cue can play, so sound is never audible without a visible way to
 * silence it; the preference persists across sessions.
 */
export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useAudioStore((s) => s.muted);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);

  return (
    <button
      aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
      aria-pressed={!muted}
      onClick={toggleMuted}
      className={`grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold ${className}`}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
