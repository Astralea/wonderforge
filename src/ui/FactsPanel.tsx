import { X } from 'lucide-react';
import type { Wonder } from '../data/types';
import { eraLabel, formatYear } from './format';

/** Spec 05: the facts panel footer is the single place the repository is linked. */
export const SOURCE_URL = 'https://github.com/Astralea/wonderforge';

const creditLink =
  'underline underline-offset-4 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold';

export function FactsPanel({
  wonder,
  open,
  onClose,
}: {
  wonder: Wonder;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-30 w-full max-w-sm overflow-y-auto border-l border-white/10 bg-umber-950/85 p-8 pt-20 backdrop-blur-md">
      <button
        aria-label="Close information panel"
        onClick={onClose}
        className="absolute top-5 right-5 cursor-pointer rounded-full p-2 text-parchment/70 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold"
      >
        <X size={18} />
      </button>
      <p className="text-xs tracking-[0.22em] text-gold/80 uppercase">
        {eraLabel(wonder.era)} · {formatYear(wonder.completedYear)}
      </p>
      <h3 className="mt-2 font-display text-3xl text-parchment">
        {wonder.name}
      </h3>
      <p className="mt-1 text-sm text-parchment/60">{wonder.location}</p>
      <figure className="mt-6 border-l-2 border-gold/40 pl-4">
        <blockquote className="text-sm leading-relaxed text-parchment/85 italic">{wonder.quote.text}</blockquote>
        <figcaption className="mt-2 text-xs text-gold/90">— {wonder.quote.author}</figcaption>
      </figure>
      {wonder.description.trim() ? (
        <p className="mt-6 leading-relaxed text-parchment/85">
          {wonder.description}
        </p>
      ) : null}
      <ul className={`space-y-5 ${wonder.description.trim() ? 'mt-8' : 'mt-6'}`}>
        {wonder.facts.map((fact) => (
          <li
            key={fact}
            className="border-l-2 border-gold/40 pl-4 text-sm leading-relaxed text-parchment/75"
          >
            {fact}
          </li>
        ))}
      </ul>
      <footer className="mt-8 border-t border-white/10 pt-4 text-xs leading-relaxed text-parchment/60">
        {wonder.credits?.map(credit => (
          <p key={credit.url}>
            <a href={credit.url} target="_blank" rel="noreferrer" className={creditLink}>
              {credit.label}
            </a>
          </p>
        ))}
        <p className={wonder.credits?.length ? 'mt-2' : undefined}>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={creditLink}>
            Source on GitHub
          </a>
        </p>
      </footer>
    </aside>
  );
}
