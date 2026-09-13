import { X } from 'lucide-react';
import type { Wonder } from '../data/types';
import { eraLabel, formatYear } from './format';

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
        aria-label="Close facts"
        onClick={onClose}
        className="absolute top-5 right-5 rounded-full p-2 text-parchment/70 transition-colors hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gold"
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
      <p className="mt-6 leading-relaxed text-parchment/85">
        {wonder.description}
      </p>
      <ul className="mt-8 space-y-5">
        {wonder.facts.map((fact) => (
          <li
            key={fact}
            className="border-l-2 border-gold/40 pl-4 text-sm leading-relaxed text-parchment/75"
          >
            {fact}
          </li>
        ))}
      </ul>
    </aside>
  );
}
