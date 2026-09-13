import type { EiffelLayer } from './eiffelTypes';
import { EIFFEL_BASE, EIFFEL_CONSTRUCTION, EIFFEL_HEIGHT } from './eiffelConstruction';

export interface EiffelEnvironmentPlan {
  era: {
    approximateYear: number;
    latitude: number;
    description: string;
    productionNote: string;
  };
  palette: Record<'iron' | 'masonry' | 'grass' | 'roof' | 'seine' | 'sky', string>;
  layers: EiffelLayer[];
  terrain: {
    radius: number;
    segments: number;
    motion: 'static-world-space';
    description: string;
  };
  monument: {
    height: number;
    base: number;
    parts: number;
  };
  ecology: {
    trees: number;
    roofs: number;
    description: string;
  };
  site: {
    wagons: number;
    forges: number;
    stocks: number;
  };
  exclusions: string[];
  sources: Array<{ title: string; url: string }>;
}

export function createEiffelEnvironmentPlan(): EiffelEnvironmentPlan {
  return {
    era: {
      approximateYear: 1889,
      latitude: 48.8584,
      description: 'Ironworkers raising four lattice pylons on the Champ de Mars for the Exposition Universelle.',
      productionNote:
        'The movie compresses January 1887–March 1889 into one minute and authors ' +
        'creeper cranes plus lattice bays as a coherent kit. The 1878 Palais du Trocadéro ' +
        'stands across the Seine; later 1937 Trocadéro massing is excluded.',
    },
    palette: {
      iron: '#8a6a4e',
      masonry: '#9a8a78',
      grass: '#6a7d4a',
      roof: '#8a4a38',
      seine: '#5a7a8c',
      sky: '#6a92b8',
    },
    layers: EIFFEL_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 720,
      segments: 96,
      motion: 'static-world-space',
      description: 'Champ de Mars parade ground with the Seine to the north and École Militaire to the south.',
    },
    monument: {
      height: EIFFEL_HEIGHT,
      base: EIFFEL_BASE,
      parts: EIFFEL_CONSTRUCTION.parts.length,
    },
    ecology: {
      trees: 540,
      roofs: 280,
      description:
        'Plane-tree allées only (umbrella canopies), courtyard Haussmann îlots behind the allées (not a U-wall around the Champ), east-flank parish chapel, Seine barges, École Militaire south, Palais du Trocadéro north.',
    },
    site: {
      wagons: 12,
      forges: 14,
      stocks: 36,
    },
    exclusions: [
      'modern glass lifts as the hero',
      '1937 Trocadéro',
      'Giza ramps',
      'Sydney spherical sails',
      '21st-century tower cranes',
    ],
    sources: [
      { title: 'Britannica: Eiffel Tower', url: 'https://www.britannica.com/topic/Eiffel-Tower' },
      { title: 'UNESCO: Paris, Banks of the Seine', url: 'https://whc.unesco.org/en/list/600/' },
    ],
  };
}

export const EIFFEL_ENVIRONMENT = createEiffelEnvironmentPlan();
