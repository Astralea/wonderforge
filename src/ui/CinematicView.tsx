import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { WONDERS, getWonder } from '../data';
import { WonderCanvas } from '../render/WonderCanvas';
import { usePlaybackStore } from '../store/playback';
import { useUiStore } from '../store/ui';
import { prefersReducedMotion } from './a11y';
import { FactsPanel } from './FactsPanel';
import { QuoteOverlay } from './QuoteOverlay';
import { TransportBar } from './TransportBar';
import { useSoundtrack } from './useSoundtrack';

const CHROME_IDLE_MS = 2500;

/** Spec 05 §Cinematic view. */
export function CinematicView() {
  const wonderId = usePlaybackStore((s) => s.wonderId);
  const status = usePlaybackStore((s) => s.status);
  const wonder = getWonder(wonderId);
  const openWonder = useUiStore((s) => s.openWonder);
  const closeWonder = useUiStore((s) => s.closeWonder);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [factsOpen, setFactsOpen] = useState(false);
  const letterboxIn = status === 'playing';
  const letterboxMotion = prefersReducedMotion()
    ? ''
    : 'transition-transform duration-500 ease-[ease]';

  useSoundtrack('cinematic');

  const go = (delta: number) => {
    const index = WONDERS.findIndex((w) => w.id === wonderId);
    const next = WONDERS[(index + delta + WONDERS.length) % WONDERS.length]!;
    setFactsOpen(false);
    openWonder(next.id);
  };

  // Auto-hide chrome while playing; any input — or the movie completing —
  // brings it back.
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setChromeVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (usePlaybackStore.getState().status === 'playing') {
          setChromeVisible(false);
        }
      }, CHROME_IDLE_MS);
    };
    wake();
    const unsub = usePlaybackStore.subscribe((s) => {
      if (s.status !== 'playing') {
        window.clearTimeout(timer);
        setChromeVisible(true);
      }
    });
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      unsub();
      window.removeEventListener('pointermove', wake);
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
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (playback.status === 'playing') playback.pause();
          else if (playback.status === 'complete') playback.replay();
          else playback.play();
          break;
        case 'ArrowLeft':
          go(-1);
          break;
        case 'ArrowRight':
          go(1);
          break;
        case 'r':
        case 'R':
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
    <section className="fixed inset-0 overflow-hidden bg-umber-950">
      <div className="absolute inset-0" aria-hidden>
        <WonderCanvas wonder={wonder} mode="cinematic" />
      </div>
      {/* cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,0.45)_100%)]"
        aria-hidden
      />
      {/* cinematic letterbox — above the canvas, below chrome */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[6vh] bg-black ${letterboxMotion} ${
          letterboxIn ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[6vh] bg-black ${letterboxMotion} ${
          letterboxIn ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden
      />

      <div className={`transition-opacity duration-500 ${chrome}`}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
          <button
            onClick={closeWonder}
            className="min-h-11 px-1 font-display text-sm tracking-[0.24em] text-parchment/80 uppercase transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
          >
            WonderForge
          </button>
          <div className="flex gap-1">
            <button
              aria-label="Wonder facts"
              onClick={() => setFactsOpen((v) => !v)}
              className="grid min-h-11 min-w-11 place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold"
            >
              <Info size={18} />
            </button>
            <button
              aria-label="Close"
              onClick={closeWonder}
              className="grid min-h-11 min-w-11 place-items-center rounded-full text-parchment/80 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <QuoteOverlay wonder={wonder} />
        <TransportBar onPrev={() => go(-1)} onNext={() => go(1)} />
      </div>

      <FactsPanel
        wonder={wonder}
        open={factsOpen}
        onClose={() => setFactsOpen(false)}
      />
    </section>
  );
}
