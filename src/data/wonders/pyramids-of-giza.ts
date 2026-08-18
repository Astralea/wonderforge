import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/pyramids-of-giza.scene.json (Spec 07). */
export const pyramidsOfGiza: Wonder = {
  id: 'pyramids-of-giza',
  name: 'Pyramids of Giza',
  location: 'Giza, Egypt',
  region: 'Africa',
  era: 'ancient',
  completedYear: -2560,
  endsAtNight: false,
  quote: {
    text: 'From the heights of these pyramids, forty centuries look down on us.',
    author: 'Napoleon Bonaparte',
  },
  description:
    'Three tombs raised on the edge of the Western Desert — the last survivors of the Seven Wonders of the Ancient World.',
  facts: [
    'The Great Pyramid of Khufu stood 146.6 m tall and remained the tallest human-made structure for more than 3,800 years.',
    'It was assembled from an estimated 2.3 million stone blocks averaging about 2.5 tonnes each.',
    'The Giza complex is the only one of the Seven Wonders of the Ancient World still largely intact.',
  ],
  palette: { ground: '#d9b380', primary: '#e8cf9e', accent: '#b98d55', sky: '#8ec8e8' },
  structure: getCompiledScene('pyramids-of-giza')!.structure,
};
