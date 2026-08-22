import { Mic, MicOff } from 'lucide-react';
import { useAudioStore } from '../store/audio';

/**
 * The caption-narration toggle (Spec 05 §Caption voice). Off by default;
 * the preference persists. Enabling is itself the user gesture that
 * unlocks the browser's speech synthesis.
 */
export function CaptionVoiceToggle({ className = '' }: { className?: string }) {
  const voiceEnabled = useAudioStore((s) => s.voiceEnabled);
  const toggleVoice = useAudioStore((s) => s.toggleVoice);

  return (
    <button
      aria-label={voiceEnabled ? 'Turn caption narration off' : 'Turn caption narration on'}
      aria-pressed={voiceEnabled}
      onClick={toggleVoice}
      className={`grid min-h-11 min-w-11 place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold ${className}`}
    >
      {voiceEnabled ? <Mic size={18} /> : <MicOff size={18} />}
    </button>
  );
}
