import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/petra.scene.json (Spec 07). */
export const petra: Wonder = {
  id: 'petra',
  name: 'Petra',
  location: "Ma'an, Jordan",
  region: 'Middle East',
  era: 'classical',
  completedYear: -100,
  endsAtNight: false,
  // Burgon's Newdigate Prize sonnet (1845) — the documented line the
  // description already borrowed, now credited in the quote slot where an
  // untraceable attribution used to sit.
  quote: {
    text: 'Match me such marvel save in Eastern clime, a rose-red city half as old as time.',
    author: 'John William Burgon, Petra',
  },
  description:
    'A rose-red city carved from living sandstone — its famous Treasury facade cut straight into the cliff at the mouth of the Siq.',
  facts: [
    'Al-Khazneh (the Treasury) stands about 39 m tall, carved directly into the sandstone cliff face.',
    'Petra was the capital of the Nabataean Kingdom from around the 4th century BC.',
    'The city is entered through the Siq, a narrow gorge over 1 km long.',
  ],
  palette: { ground: '#c9a06a', primary: '#c77b4f', accent: '#a35c38', sky: '#8fb8d8' },
  structure: getCompiledScene('petra')!.structure,
};
