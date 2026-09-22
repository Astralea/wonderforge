import { Github } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { catalogInProgress, catalogReady, type Wonder } from '../data';
import { useUiStore } from '../store/ui';
import { SOURCE_URL } from './links';
import { eraLabel, formatYear, roman } from './format';
import { WonderGlyph } from './WonderGlyph';

/** Spec 05 §Home: contents plate over the same diorama — two chronological blocks. */
export function Gallery({
  active,
  onBack,
}: {
  active: boolean;
  onBack: () => void;
}) {
  const openWonder = useUiStore((s) => s.openWonder);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ready = catalogReady();
  const upcoming = catalogInProgress();

  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [active]);

  return (
    <div className="relative flex h-full flex-col justify-start px-5 pb-8 pt-16 md:justify-center md:px-10 md:pt-20 lg:max-w-xl">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 min-h-11 cursor-pointer px-1 font-display text-sm tracking-[0.24em] text-parchment/80 uppercase transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold md:left-8"
        aria-label="WonderForge, back to introduction"
      >
        WonderForge
      </button>
      <main className="min-h-0 overflow-y-auto pr-1 md:pr-2">
        <section aria-labelledby="catalog-ready" className="pt-2">
          <h2
            id="catalog-ready"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl tracking-wide text-gold outline-none md:text-3xl"
          >
            On site
          </h2>
          <div
            className={`mt-3 h-px origin-left bg-gold/80 ${
              active ? 'w-11 motion-safe:animate-[hairline-draw_0.7s_ease-out]' : 'w-11'
            }`}
            aria-hidden
          />
          <ol className="mt-6">
            {ready.map((w, i) => (
              <CatalogRow
                key={w.id}
                wonder={w}
                index={i}
                active={active}
                delay={90 + i * 48}
                ready
                onOpen={openWonder}
              />
            ))}
          </ol>
        </section>
        <section aria-labelledby="catalog-in-progress" className="mt-10">
          <h2
            id="catalog-in-progress"
            className="font-display text-2xl tracking-wide text-gold md:text-3xl"
          >
            In production
          </h2>
          <div className="mt-3 h-px w-11 origin-left bg-gold/80" aria-hidden />
          <ol className="mt-6">
            {upcoming.map((w, i) => (
              <CatalogRow
                key={w.id}
                wonder={w}
                index={i}
                active={active}
                delay={90 + (ready.length + i) * 48}
                ready={false}
              />
            ))}
          </ol>
        </section>
        <p className="mt-10 text-xs tracking-wide text-parchment/45">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
          >
            <Github size={13} aria-hidden />
            <span className="underline underline-offset-4">Source on GitHub</span>
          </a>
        </p>
      </main>
    </div>
  );
}

function CatalogRow({
  wonder,
  index,
  active,
  delay,
  ready,
  onOpen,
}: {
  wonder: Wonder;
  index: number;
  active: boolean;
  delay: number;
  ready: boolean;
  onOpen?: (id: string) => void;
}) {
  const meta = `${wonder.location} · ${eraLabel(wonder.era)} · ${formatYear(wonder.completedYear)}`;
  const numeral = (
    <span
      className={`w-8 shrink-0 font-display text-sm md:text-base ${
        ready ? 'text-gold/55 transition-transform duration-300 group-hover:translate-x-0.5' : 'text-gold/45'
      }`}
    >
      {roman(index + 1)}
    </span>
  );
  const copy = (
    <span className="min-w-0 flex-1">
      <span
        className={`block font-display text-lg tracking-wide md:text-xl ${
          ready ? 'text-parchment transition-colors group-hover:text-gold' : 'text-parchment'
        }`}
      >
        {wonder.name}
      </span>
      <span className="mt-0.5 block text-xs tracking-wide text-parchment/50 md:text-sm">
        {meta}
      </span>
    </span>
  );

  return (
    <li
      className={active ? 'motion-safe:animate-[catalog-row-in_0.6s_ease-out_both]' : ''}
      style={active ? { animationDelay: `${delay}ms` } : undefined}
    >
      {ready ? (
        <button
          onClick={() => onOpen?.(wonder.id)}
          style={{ '--tint': `${wonder.palette.sky}24` } as CSSProperties}
          className="group flex min-h-11 w-full cursor-pointer items-center gap-x-4 border-b border-parchment/10 py-2 text-left transition-colors duration-300 hover:bg-[var(--tint)] focus-visible:outline-2 focus-visible:outline-gold md:py-3.5"
        >
          {numeral}
          {copy}
          <WonderGlyph id={wonder.id} />
        </button>
      ) : (
        <div
          aria-disabled="true"
          className="group my-1.5 flex min-h-11 w-full cursor-default items-center gap-x-4 border border-dashed border-parchment/45 px-2 py-2 text-left md:py-3"
        >
          {numeral}
          {copy}
          <WonderGlyph id={wonder.id} tone="quiet" />
        </div>
      )}
    </li>
  );
}
