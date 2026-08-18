import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/forbidden-city.scene.json (Spec 07). */
export const forbiddenCity: Wonder = {
  id: 'forbidden-city',
  name: 'Forbidden City',
  location: 'Beijing, China',
  region: 'Asia',
  era: 'renaissance',
  completedYear: 1420,
  endsAtNight: false,
  quote: {
    text: 'The whole palace complex is built along a central axis, the axis of the world, everything in the four directions suspend from this central point represented by these palaces.',
    author: 'Jeffrey Riegel',
  },
  description:
    'The seat of twenty-four emperors — a walled universe of vermilion walls and golden roofs on the central axis of Beijing.',
  facts: [
    'The complex holds 980 buildings and, by tradition, 9,999 rooms.',
    'It was home to 24 emperors across the Ming and Qing dynasties.',
    'At 72 hectares it is the largest palace complex in the world.',
  ],
  palette: { ground: '#b7a284', primary: '#b5341f', accent: '#e8b93c', sky: '#8db6d9' },
  structure: getCompiledScene('forbidden-city')!.structure,
};
