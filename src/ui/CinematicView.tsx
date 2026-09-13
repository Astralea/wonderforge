import { useEffect, useRef, useState } from 'react';
import { WONDERS, getWonder } from '../data';
import { WonderCanvas } from '../render/WonderCanvas';
import { usePlaybackStore } from '../store/playback';
import { useUiStore } from '../store/ui';
import { CaptionBeatIndex } from './CaptionBeatIndex';
import { CaptionLayer } from './CaptionLayer';
import { FactsPanel } from './FactsPanel';
import { QuoteOverlay } from './QuoteOverlay';
import { TransportBar } from './TransportBar';
import { useSoundtrack } from './useSoundtrack';
import { useAudioStore } from '../store/audio';
import { primeNarrationAudio } from './narrationAudio';
import { eiffelChapterCaptionAt } from './eiffelChapterCaptions';
import { eiffelFilmEditDuration } from '../engine/eiffelFilmEdit';
import './eiffelCinematicLayout.css';

const CHROME_IDLE_MS = 2500;

/** Spec 05 §Cinematic view. */
export function CinematicView() {
  const wonderId = usePlaybackStore((s) => s.wonderId);
  const storyFocus = usePlaybackStore((s) =>
    s.wonderId === 'eiffel-tower' && s.eiffelEdit === 'cinematic' && s.speed === 1 &&
    (s.status === 'playing' || s.status === 'paused') &&
    eiffelChapterCaptionAt(s.t * eiffelFilmEditDuration(s.eiffelEdit), s.eiffelEdit) !== null,
  );
  const wonder = getWonder(wonderId);
  const openWonder = useUiStore((s) => s.openWonder);
  const closeWonder = useUiStore((s) => s.closeWonder);
  const [chromeVisible, setChromeVisible] = useState(
    () => usePlaybackStore.getState().status !== 'playing',
  );
  const [factsOpen, setFactsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const chromeHeldRef = useRef(false);
  const holdChromeRef = useRef<(held: boolean) => void>(() => {});

  useSoundtrack(wonderId, 'cinematic');

  const go = (delta: number) => {
    const index = WONDERS.findIndex((w) => w.id === wonderId);
    const next = WONDERS[(index + delta + WONDERS.length) % WONDERS.length]!;
    setFactsOpen(false);
    openWonder(next.id);
  };

  // Picture first while playing: chrome stays away until the pointer or
  // keyboard asks for it, then idle hides it again. The letterbox stays;
  // hovering or focusing the beat index holds chrome open so a still
  // cursor does not hide the titles mid-read.
  useEffect(() => {
    let timer = 0;
    const scheduleHide = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (chromeHeldRef.current) return;
        if (usePlaybackStore.getState().status === 'playing') {
          setChromeVisible(false);
        }
      }, CHROME_IDLE_MS);
    };
    const wake = () => {
      setChromeVisible(true);
      scheduleHide();
    };
    holdChromeRef.current = (held: boolean) => {
      chromeHeldRef.current = held;
      if (held) {
        setChromeVisible(true);
        window.clearTimeout(timer);
      } else {
        scheduleHide();
      }
    };
    if (usePlaybackStore.getState().status !== 'playing') {
      setChromeVisible(true);
    }
    const unsub = usePlaybackStore.subscribe((s) => {
      if (s.status !== 'playing') {
        window.clearTimeout(timer);
        setChromeVisible(true);
      }
    });
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      holdChromeRef.current = () => {};
      window.clearTimeout(timer);
      unsub();
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  // Keyboard: Space play/pause · ←/→ wonders · R replay · Esc close.
  // Events from focused interactive controls (scrubber, buttons) are left to
  // the control itself — otherwise arrows on the scrubber would also switch
  // wonders and Space would hijack focused buttons.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' &&
        e.target instanceof HTMLElement &&
        e.target.closest('input, button, select, textarea, [contenteditable]')
      ) {
        return;
      }
      const playback = usePlaybackStore.getState();
      const primeVoice = () => { if (useAudioStore.getState().voiceEnabled) primeNarrationAudio(wonderId); };
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (playback.status === 'playing') playback.pause();
          else if (playback.status === 'complete') { primeVoice(); playback.replay(); }
          else { primeVoice(); playback.play(); }
          break;
        case 'ArrowLeft':
          go(-1);
          break;
        case 'ArrowRight':
          go(1);
          break;
        case 'r':
        case 'R':
          primeVoice();
          playback.replay();
          break;
        case 'Escape':
          closeWonder();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chrome = chromeVisible
    ? 'opacity-100'
    : 'pointer-events-none opacity-0';

  return (
    <section className={`fixed inset-0 overflow-hidden bg-umber-950 ${storyFocus ? 'eiffel-story-focus' : ''}`} data-chapters-open={chaptersOpen}>
      <div className="absolute inset-0">
        <WonderCanvas wonder={wonder} mode="cinematic" />
      </div>
      {/* cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,0.45)_100%)]"
        aria-hidden
      />
      {/* Cinematic letterbox — a stable frame, not chrome. */}
      <div
        data-testid="cinematic-letterbox-top"
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[6vh] bg-black"
        aria-hidden
      />
      <div
        data-testid="cinematic-letterbox-bottom"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[6vh] bg-black"
        aria-hidden
      />

      {/* Wordmark lives in the top letterbox slot, not in auto-hiding chrome,
          so fading the bars later cannot move it. */}
      <div
        data-testid="cinematic-wordmark"
        className="absolute top-0 left-0 z-[15] flex h-[6vh] items-center px-5"
      >
        <button
          onClick={closeWonder}
          className="flex min-h-11 items-center px-1 font-display text-sm tracking-[0.24em] text-parchment/80 uppercase transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
        >
          WonderForge
        </button>
      </div>

      <div className={`absolute inset-0 z-10 transition-opacity duration-500 ${chrome}`}>
        <div
          data-testid="cinematic-top-chrome"
          className="absolute left-0 top-[calc(6vh+1rem)] flex flex-col items-start px-5"
        >
          <CaptionBeatIndex
            wonder={wonder}
            compact={storyFocus}
            onExpandedChange={setChaptersOpen}
            onHoldChrome={(held) => holdChromeRef.current(held)}
          />
        </div>
        <TransportBar
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onToggleFacts={() => setFactsOpen((open) => !open)}
          factsOpen={factsOpen}
          wonderId={wonder.id}
        />
      </div>

      {/* Title/quote stay on the picture; they are not chrome. */}
      <QuoteOverlay wonder={wonder} />

      {/* Caption layer sits above chrome so lower-thirds stay readable over
          the rail; pointer-events-none keeps controls clickable. */}
      <CaptionLayer wonder={wonder} />

      <FactsPanel
        wonder={wonder}
        open={factsOpen}
        onClose={() => setFactsOpen(false)}
      />
    </section>
  );
}
