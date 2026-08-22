import { useEffect } from 'react';
import { useAudioStore } from '../store/audio';

/**
 * Caption narration via the browser's speech synthesis (Spec 05 §Caption
 * voice): each newly active caption is read aloud while narration is on.
 * No assets, no network. Leaving the beat, pausing, hiding the chrome,
 * seeking, or toggling off cancels the current utterance. Captions never
 * render at 2×/4×, so voice never fires at speed either.
 */
export function useCaptionVoice(captionText: string | null, active: boolean): void {
  const voiceEnabled = useAudioStore((s) => s.voiceEnabled);

  useEffect(() => {
    if (!voiceEnabled || !active || !captionText) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new window.SpeechSynthesisUtterance(captionText);
    // Unhurried documentary pace.
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [voiceEnabled, active, captionText]);

  // Never leave an utterance running past the view.
  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );
}
