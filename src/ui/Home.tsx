import { useEffect, useState } from 'react';
import { getWonder } from '../data';
import { WonderCanvas } from '../render/WonderCanvas';
import { useUiStore } from '../store/ui';
import { Gallery } from './Gallery';
import { Hero } from './Hero';
import { readHomeWonderId } from './readHomeWonderId';
import { SoundToggle } from './SoundToggle';
import { useSoundtrack } from './useSoundtrack';

/** Spec 05 §Home: one viewport; the diorama stays, plates crossfade. */
export function Home() {
  const [wonder] = useState(() => getWonder(readHomeWonderId()));
  const plate = useUiStore((s) => s.homePlate);
  const enterCatalog = useUiStore((s) => s.enterCatalog);
  const showTitle = useUiStore((s) => s.showTitle);
  const onCatalog = plate === 'catalog';

  useSoundtrack(wonder.id, 'ambient');

  useEffect(() => {
    if (!onCatalog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, [contenteditable]')
      ) {
        return;
      }
      showTitle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCatalog, showTitle]);

  return (
    <div className="relative h-svh overflow-hidden bg-umber-950">
      <div className="absolute inset-0 isolate" aria-hidden>
        <WonderCanvas wonder={wonder} mode="ambient" />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          onCatalog
            ? 'home-catalog-veil'
            : 'bg-gradient-to-b from-black/30 via-transparent to-umber-950/90'
        }`}
        aria-hidden
      />
      {!onCatalog && (
        <div
          className="pointer-events-none absolute inset-0 [background:radial-gradient(58%_44%_at_50%_54%,rgba(10,8,5,0.58),transparent_100%)]"
          aria-hidden
        />
      )}
      <div className="absolute top-4 right-4 z-20">
        <SoundToggle />
      </div>

      <div
        className={`home-plate ${onCatalog ? 'home-plate-off' : 'home-plate-on'}`}
        aria-hidden={onCatalog}
        inert={onCatalog}
      >
        <Hero onEnter={enterCatalog} />
      </div>
      <div
        className={`home-plate ${onCatalog ? 'home-plate-on' : 'home-plate-off'}`}
        aria-hidden={!onCatalog}
        inert={!onCatalog}
      >
        <Gallery active={onCatalog} onBack={showTitle} />
      </div>
    </div>
  );
}
