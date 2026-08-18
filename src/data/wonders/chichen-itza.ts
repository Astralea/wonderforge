import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/chichen-itza.scene.json (Spec 07). */
export const chichenItza: Wonder = {
  id: 'chichen-itza',
  name: 'Chichen Itza',
  location: 'Yucatán, Mexico',
  region: 'North America',
  era: 'medieval',
  completedYear: 900,
  endsAtNight: false,
  quote: {
    text: 'The Great Ball Court is also very impressive. I would like to have seen them play a game, although it sounds like the end was pretty violent. I think it was safer to be a spectator.',
    author: 'IslaDeb',
  },
  description:
    'El Castillo rises over the Yucatán jungle — a Maya calendar in stone, where a serpent of sunlight descends the steps each equinox.',
  facts: [
    'El Castillo has 365 steps in total when the four stairways and top platform are counted — one for each day of the year.',
    'On the equinoxes, light and shadow form a serpent that appears to slither down the northern stairway.',
    'The Great Ball Court at Chichen Itza is the largest in Mesoamerica, at 168 m long.',
  ],
  palette: { ground: '#6a8a4f', primary: '#cfc39a', accent: '#8f855f', sky: '#8fc9e8' },
  structure: getCompiledScene('chichen-itza')!.structure,
};
