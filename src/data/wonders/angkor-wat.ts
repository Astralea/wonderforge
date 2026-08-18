import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/angkor-wat.scene.json (Spec 07). */
export const angkorWat: Wonder = {
  id: 'angkor-wat',
  name: 'Angkor Wat',
  location: 'Siem Reap, Cambodia',
  region: 'Asia',
  era: 'medieval',
  completedYear: 1150,
  endsAtNight: false,
  quote: {
    text: 'The temple is surrounded by a moat, and access is by a single bridge, protected by two stone tigers so grand and fearsome as to strike terror into the visitor.',
    author: 'Diogo do Couto',
  },
  description:
    'The largest religious monument on Earth — five lotus-bud towers for the peaks of Mount Meru, ringed by a moat like the cosmic ocean.',
  facts: [
    'Angkor Wat covers over 160 hectares, making it the largest religious monument in the world.',
    'It was built in the early 12th century for King Suryavarman II as a Hindu temple dedicated to Vishnu.',
    'The five towers form a quincunx representing the five peaks of Mount Meru, home of the gods.',
  ],
  palette: { ground: '#6b7f52', primary: '#a8998a', accent: '#7d6f60', sky: '#93c2d8' },
  structure: getCompiledScene('angkor-wat')!.structure,
};
