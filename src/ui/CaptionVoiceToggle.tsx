import { Mic, MicOff } from 'lucide-react';
import { useAudioStore } from '../store/audio';
import { primeNarrationAudio, stopNarrationAudio } from './narrationAudio';

/**
 * The caption-narration control (Spec 05 §Caption voice). Its written state
 * makes clear that it controls narration playback, not microphone recording.
 */
export function CaptionVoiceToggle({
  wonderId,
  className = '',
}: {
  wonderId: string;
  className?: string;
}) {
  const voiceEnabled = useAudioStore((s) => s.voiceEnabled);
  const toggleVoice = useAudioStore((s) => s.toggleVoice);

  const onClick = () => {
    if (voiceEnabled) stopNarrationAudio();
    else primeNarrationAudio(wonderId);
    toggleVoice();
  };

  return (
    <button
      aria-label={voiceEnabled ? 'Disable narration' : 'Enable narration'}
      aria-pressed={voiceEnabled}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold ${className}`}
    >
      {voiceEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      <span className="font-display text-[10px] tracking-[0.12em] uppercase">
        Narration {voiceEnabled ? 'on' : 'off'}
      </span>
    </button>
  );
}
