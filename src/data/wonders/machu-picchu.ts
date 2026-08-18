import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/machu-picchu.scene.json (Spec 07). */
export const machuPicchu: Wonder = {
  id: 'machu-picchu',
  name: 'Machu Picchu',
  location: 'Cusco, Peru',
  region: 'South America',
  era: 'medieval',
  completedYear: 1450,
  endsAtNight: false,
  // Hiram Bingham's own words on the citadel (Inca Land, 1922) — the prior
  // verse was credited to a poet who died fifty years before Machu Picchu
  // was revealed to the West, so it could not describe this site.
  quote: {
    text: 'Few romances can ever surpass that of the granite citadel on top of the beetling precipices of Machu Picchu, the crown of Inca Land.',
    author: 'Hiram Bingham, Inca Land',
  },
  description:
    'A granite citadel perched on an Andean ridge, hidden from the conquistadors and unveiled to the world in 1911.',
  facts: [
    'Built around 1450 under the Inca emperor Pachacuti, then abandoned during the Spanish conquest.',
    'The citadel sits on a mountain ridge 2,430 m above sea level.',
    'Its dry-stone walls fit without mortar — precisely enough to ride out earthquakes.',
  ],
  palette: { ground: '#5f7d4a', primary: '#9aa08b', accent: '#7c6f5a', sky: '#89b4d4' },
  structure: getCompiledScene('machu-picchu')!.structure,
};
