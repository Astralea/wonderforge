import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Typed Champ de Mars world: src/data/eiffelConstruction.ts (Spec 14). */
export const eiffelTower: Wonder = {
  id: 'eiffel-tower',
  name: 'Eiffel Tower',
  location: 'Paris, France',
  region: 'Europe',
  era: 'industrial',
  completedYear: 1889,
  endsAtNight: true,
  quote: {
    text: 'I ought to be jealous of the tower. She is more famous than I am.',
    author: 'Gustave Eiffel',
  },
  description: '',
  facts: [
    'The tower opened at 312 metres in 1889. Today, including its antennas, it reaches 330 metres.',
    'The tower was assembled from 18,038 iron parts joined by roughly 2.5 million rivets.',
    'It was the tallest structure on Earth until the Chrysler Building surpassed it in 1930.',
  ],
  palette: { ground: '#7d8a5c', primary: '#8a6a4e', accent: '#5c4330', sky: '#87a9c9' },
  structure: getCompiledScene('eiffel-tower')!.structure,
};
