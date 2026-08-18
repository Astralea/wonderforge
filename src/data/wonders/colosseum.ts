import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/colosseum.scene.json (Spec 07). */
export const colosseum: Wonder = {
  id: 'colosseum',
  name: 'Colosseum',
  location: 'Rome, Italy',
  region: 'Europe',
  era: 'classical',
  completedYear: 80,
  endsAtNight: true,
  quote: {
    text: 'While the Colosseum stands, Rome shall stand; when the Colosseum falls, Rome shall fall; when Rome falls, the world shall fall.',
    author: 'Saint Bede',
  },
  description:
    'The Flavian Amphitheatre — eighty arched entrances, four storeys of travertine, and the roar of fifty thousand Romans.',
  facts: [
    'It held an estimated 50,000–80,000 spectators — the largest amphitheatre ever built.',
    'Completed in 80 AD under Emperor Titus after roughly a decade of construction.',
    'Its real name is the Flavian Amphitheatre; "Colosseum" refers to a colossal statue of Nero that stood nearby.',
  ],
  palette: { ground: '#b49a72', primary: '#d8c49a', accent: '#a8895c', sky: '#87b5d6' },
  structure: getCompiledScene('colosseum')!.structure,
};
