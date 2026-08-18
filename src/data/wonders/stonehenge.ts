import type { Wonder } from '../types';
import { getCompiledScene } from '../scenes';

/** Scene doc: src/data/scenes/stonehenge.scene.json (Spec 07). */
export const stonehenge: Wonder = {
  id: 'stonehenge',
  name: 'Stonehenge',
  location: 'Wiltshire, England',
  region: 'Europe',
  era: 'ancient',
  completedYear: -2500,
  endsAtNight: false,
  quote: {
    text: 'Can you imagine trying to talk six hundred people into helping you drag a fifty-ton stone eighteen miles across the countryside and muscle it into an upright position, and then saying, “Right, lads! Another twenty like that … and then we can party!”',
    author: 'Bill Bryson',
  },
  description:
    'A ring of standing stones on Salisbury Plain, raised over a thousand years by people who left no written word behind.',
  facts: [
    'An average circle sarsen weighs around 25 tonnes; the great trilithon uprights exceed 30 tonnes and once stood over 7 m above ground.',
    'The smaller bluestones were transported from the Preseli Hills in Wales, over 200 km away.',
    'The monument is aligned to the summer solstice sunrise and winter solstice sunset.',
  ],
  palette: { ground: '#5d7a4a', primary: '#8d8d84', accent: '#6f6f66', sky: '#7fa8c9' },
  structure: getCompiledScene('stonehenge')!.structure,
};
