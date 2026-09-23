import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Catalog entry; production dispatch is the typed SydneyWorld (Spec 13). */
export const sydneyOperaHouse: Wonder = {
  id: 'sydney-opera-house',
  name: 'Sydney Opera House',
  location: 'Sydney, Australia',
  region: 'Oceania',
  era: 'modern',
  completedYear: 1973,
  endsAtNight: true,
  quote: {
    text: "An opera begins long before the curtain goes up and ends long after it has come down. It starts in my imagination, it becomes my life, and it stays part of my life long after I've left the opera house.",
    author: 'Maria Callas',
  },
  description: '',
  facts: [
    'The shell roofs are clad in more than one million ceramic tiles.',
    'Jørn Utzon won the 1957 design competition; the building opened in 1973.',
    'Construction took 14 years and cost about fourteen times the original estimate — AU$102 million against a projected AU$7 million.',
  ],
  palette: { ground: '#b3a58c', primary: '#f2ede2', accent: '#c9c2b2', sky: '#7fb6e0' },
  structure: getCompiledScene('sydney-opera-house')!.structure,
};
