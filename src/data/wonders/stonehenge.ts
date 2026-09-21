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
  description: '',
  facts: [
    'An average circle sarsen weighs around 25 tonnes; the great trilithon uprights exceed 30 tonnes and once stood over 7 m above ground.',
    'Many of the smaller bluestones came from the Preseli Hills in Wales, over 200 km away.',
    'The monument is aligned to the summer solstice sunrise and winter solstice sunset.',
  ],
  palette: { ground: '#66794a', primary: '#8d8d84', accent: '#5c6a70', sky: '#7895ad' },
  structure: getCompiledScene('stonehenge')!.structure,
};
