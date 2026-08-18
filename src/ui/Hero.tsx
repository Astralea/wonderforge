import { pyramidsOfGiza } from '../data/wonders/pyramids-of-giza';
import { WonderCanvas } from '../render/WonderCanvas';
import { SoundToggle } from './SoundToggle';
import { useSoundtrack } from './useSoundtrack';

/** Spec 05 §Home: full-bleed ambient diorama, brand-first, one CTA. */
export function Hero() {
  // Browsers block audio until the visitor interacts, so the loop starts on
  // their first click or keypress — never on a cold landing.
  useSoundtrack('ambient');

  const enter = () =>
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <header className="relative h-svh overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <WonderCanvas wonder={pyramidsOfGiza} mode="ambient" />
      </div>
      {/* legibility scrim — the only overlay on the hero media */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-umber-950"
        aria-hidden
      />
      <div
        className="absolute inset-0 [background:radial-gradient(58%_44%_at_50%_54%,rgba(10,8,5,0.58),transparent_100%)]"
        aria-hidden
      />
      <div className="absolute top-4 right-4 z-10">
        <SoundToggle />
      </div>
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-5xl font-bold tracking-[0.16em] text-parchment drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] md:text-7xl">
          WonderForge
        </p>
        <h1 className="mt-6 font-display text-xl tracking-wide text-gold md:text-2xl">
          World wonders, built before your eyes
        </h1>
        <p className="mt-4 max-w-xl text-parchment/80">
          Ten Civilization VI-style construction cinematics, rebuilt as
          procedural 3D dioramas — from bare ground to glory in one minute.
        </p>
        <button
          onClick={enter}
          className="mt-10 rounded-full border border-gold/60 px-8 py-3 font-display text-sm tracking-[0.2em] text-gold uppercase transition-colors hover:bg-gold hover:text-umber-950 focus-visible:outline-2 focus-visible:outline-gold"
        >
          Enter the gallery
        </button>
      </div>
    </header>
  );
}
