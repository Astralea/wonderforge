import type { ColosseumLayer } from './colosseumTypes';
import { COLOSSEUM_CONSTRUCTION, COLOSSEUM_HEIGHT, COLOSSEUM_MAJOR, COLOSSEUM_MINOR } from './colosseumConstruction';

export interface ColosseumEnvironmentPlan {
  era: {
    approximateYear: number;
    latitude: number;
    description: string;
    productionNote: string;
  };
  palette: Record<'travertine' | 'tuff' | 'pozzolana' | 'brick' | 'dust' | 'sky', string>;
  layers: ColosseumLayer[];
  terrain: {
    radius: number;
    segments: number;
    motion: 'static-world-space';
    description: string;
  };
  monument: {
    major: number;
    minor: number;
    height: number;
    bays: number;
  };
  ecology: {
    tufts: number;
    pines: number;
    insulae: number;
    aqueductPiers: number;
    description: string;
  };
  site: {
    wagons: number;
    timberStocks: number;
    mixingTubs: number;
  };
  exclusions: string[];
  sources: Array<{ title: string; url: string }>;
}

export function createColosseumEnvironmentPlan(): ColosseumEnvironmentPlan {
  return {
    era: {
      approximateYear: 80,
      latitude: 41.8902,
      description: 'Flavian crews raising the amphitheatre in the drained Domus Aurea valley.',
      productionNote:
        'The movie compresses Vespasian–Titus–Domitian into one minute and authors ' +
        'Haterii-type treadwheel cranes plus timber centering as a coherent kit, not ' +
        'proven site archaeology. The dedicated monument has a timber arena floor.',
    },
    palette: {
      travertine: '#d8c4a0',
      tuff: '#a8895c',
      pozzolana: '#8a7a68',
      brick: '#9a5a42',
      dust: '#c4a882',
      sky: '#6a9cc8',
    },
    layers: COLOSSEUM_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 640,
      segments: 96,
      motion: 'static-world-space',
      description: 'Drained alluvial valley between Palatine and Caelian, with an eastern Tivoli haul road.',
    },
    monument: {
      major: COLOSSEUM_MAJOR,
      minor: COLOSSEUM_MINOR,
      height: COLOSSEUM_HEIGHT,
      bays: COLOSSEUM_CONSTRUCTION.bays,
    },
    ecology: {
      tufts: 640,
      pines: 120,
      insulae: 140,
      aqueductPiers: 16,
      description:
        'Valley herbs, grove-scale umbrella pines on Palatine and Caelian, ' +
        'roofed brick insulae on the hills, and a Claudian-aqueduct arcade to the east.',
    },
    site: {
      wagons: 10,
      timberStocks: 22,
      mixingTubs: 12,
    },
    exclusions: [
      'modern tourism',
      'exposed Domitianic hypogeum as the original arena',
      'Giza ramps',
      'Stonehenge pits',
      'gladiatorial games during construction',
    ],
    sources: [
      { title: 'UNESCO Historic Centre of Rome', url: 'https://whc.unesco.org/en/list/91/' },
      { title: 'Britannica: Colosseum', url: 'https://www.britannica.com/topic/Colosseum' },
    ],
  };
}

export const COLOSSEUM_ENVIRONMENT = createColosseumEnvironmentPlan();
