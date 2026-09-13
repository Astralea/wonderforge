import { useEffect, useRef } from 'react';
import { WONDERS } from '../data';
import { useUiStore } from '../store/ui';
import { eraLabel, formatYear, roman } from './format';

/** Spec 05 §Home: contents plate over the same diorama — an index, not cards. */
export function Gallery({
  active,
  onBack,
}: {
  active: boolean;
  onBack: () => void;
}) {
  const openWonder = useUiStore((s) => s.openWonder);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [active]);

  return (
    <div className="relative flex h-full flex-col justify-start px-5 pb-8 pt-16 md:justify-center md:px-10 md:pt-20 lg:max-w-xl">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 min-h-11 px-1 font-display text-sm tracking-[0.24em] text-parchment/80 uppercase transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold md:left-8"
        aria-label="WonderForge, back to title"
      >
        WonderForge
      </button>
      <main className="min-h-0">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl tracking-wide text-gold outline-none md:text-3xl"
        >
          The Ten Wonders
        </h2>
        <div
          className={`mt-3 h-px origin-left bg-gold/80 ${
            active ? 'w-11 motion-safe:animate-[hairline-draw_0.7s_ease-out]' : 'w-11'
          }`}
          aria-hidden
        />
        <p className="mt-4 hidden max-w-sm text-sm text-parchment/70 md:mt-4 md:block md:text-base">
          From the Nile to Sydney Harbour. Choose one, and watch forty centuries
          look down on you.
        </p>
        <ol className="mt-6 max-h-[68svh] overflow-y-auto pr-1 md:mt-10 md:max-h-none md:overflow-visible md:pr-2">
          {WONDERS.map((w, i) => (
            <li
              key={w.id}
              className={active ? 'motion-safe:animate-[catalog-row-in_0.6s_ease-out_both]' : ''}
              style={active ? { animationDelay: `${90 + i * 48}ms` } : undefined}
            >
              <button
                onClick={() => openWonder(w.id)}
                style={{ '--tint': `${w.palette.sky}24` } as React.CSSProperties}
                className="group flex min-h-11 w-full cursor-pointer items-baseline gap-x-4 border-b border-parchment/10 py-2 text-left transition-colors duration-300 hover:bg-[var(--tint)] focus-visible:outline-2 focus-visible:outline-gold md:py-3.5"
              >
                <span className="w-8 shrink-0 font-display text-sm text-gold/55 transition-transform duration-300 group-hover:translate-x-0.5 md:text-base">
                  {roman(i + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg tracking-wide text-parchment transition-colors group-hover:text-gold md:text-xl">
                    {w.name}
                  </span>
                  <span className="mt-0.5 block text-xs tracking-wide text-parchment/50 md:text-sm">
                    {w.location} · {eraLabel(w.era)} · {formatYear(w.completedYear)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </main>
      <footer className="mt-4 max-w-md text-left text-[11px] leading-relaxed text-parchment/40 md:mt-8">
        WonderForge is a fan-made homage. Not affiliated with or endorsed by
        Firaxis Games or 2K. All geometry is procedural; no game assets are
        used.
      </footer>
    </div>
  );
}
