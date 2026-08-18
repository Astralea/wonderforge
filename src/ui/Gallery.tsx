import { WONDERS } from '../data';
import { useUiStore } from '../store/ui';
import { eraLabel, formatYear, roman } from './format';

/** Spec 05 §Home: an index, not a card grid. */
export function Gallery() {
  const openWonder = useUiStore((s) => s.openWonder);

  return (
    <main id="gallery" className="mx-auto w-full max-w-4xl px-6 py-24">
      <h2 className="font-display text-3xl tracking-wide text-gold md:text-4xl">
        The Ten Wonders
      </h2>
      <p className="mt-3 max-w-xl text-parchment/70">
        From the Nile to Sydney Harbour. Choose one, and watch forty centuries
        look down on you.
      </p>
      <ol className="mt-12">
        {WONDERS.map((w, i) => (
          <li key={w.id}>
            <button
              onClick={() => openWonder(w.id)}
              style={{ '--tint': `${w.palette.sky}1f` } as React.CSSProperties}
              className="group flex w-full flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-parchment/10 px-3 py-6 text-left transition-all duration-300 hover:bg-[var(--tint)] hover:pl-5 focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="w-10 shrink-0 font-display text-lg text-gold/60">
                {roman(i + 1)}
              </span>
              <span className="font-display text-2xl tracking-wide text-parchment transition-colors group-hover:text-gold md:text-3xl">
                {w.name}
              </span>
              <span className="ml-auto text-sm text-parchment/55">
                {w.location} · {eraLabel(w.era)} · {formatYear(w.completedYear)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
