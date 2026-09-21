import type { StonehengeLayer } from './stonehengeTypes';
import { STONEHENGE_CONSTRUCTION } from './stonehengeConstruction';

export interface StonehengeEnvironmentPlan {
  era: {
    approximateYear: number;
    latitude: number;
    description: string;
    productionNote: string;
  };
  palette: Record<'chalk' | 'bank' | 'sarsen' | 'bluestone' | 'turf' | 'track' | 'sky', string>;
  layers: StonehengeLayer[];
  terrain: {
    radius: number;
    segments: number;
    motion: 'static-world-space';
    description: string;
  };
  henge: {
    ditchDiameter: number;
    bankDiameter: number;
    aubreyHoles: number;
    northeastEntranceWidth: number;
  };
  ecology: {
    grassTufts: number;
    /** Camera-near grazed tufts on the inner ditch lip and working floor. */
    nearHerbTufts: number;
    shrubs: number;
    treeClusters: number;
    cattle: number;
    description: string;
  };
  site: {
    dressingChips: number;
    /** Chalk chips on the camera-facing floor, not only the distant dressing yard. */
    trampledChips: number;
    timberStock: number;
    hammerstones: number;
    hideShelters: number;
  };
  exclusions: string[];
  sources: Array<{ title: string; url: string }>;
}

export function createStonehengeEnvironmentPlan(): StonehengeEnvironmentPlan {
  return {
    era: {
      approximateYear: -2500,
      latitude: 51.1789,
      description: 'Late-Neolithic central stone settings on open chalk downland around Stonehenge.',
      productionNote: 'Several construction episodes and a debated lifting system are compressed into one authored sixty-second movie.',
    },
    palette: {
      chalk: '#e9e5d6',
      bank: '#d6d0bd',
      sarsen: '#8d8d84',
      bluestone: '#5c6a70',
      turf: '#5d7344',
      track: '#8a6d48',
      sky: '#7895ad',
    },
    layers: STONEHENGE_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 560,
      segments: 72,
      motion: 'static-world-space',
      description: 'Broad fixed rolling chalk downs. The inner ~90 m stays a working floor; beyond that the horizon is offset NW/SE/SW lobes, never a circular ridge around the henge.',
    },
    henge: {
      ditchDiameter: 110,
      bankDiameter: 96,
      aubreyHoles: 56,
      northeastEntranceWidth: 10,
    },
    ecology: {
      grassTufts: 1000,
      nearHerbTufts: 340,
      shrubs: 110,
      treeClusters: 24,
      cattle: 9,
      description: 'Open grazed chalk grassland with a readable tree-line of hazel, maple, ash and elm mosaics on the offset downs — not a circular ridge or a fog wall.',
    },
    site: {
      dressingChips: 260,
      trampledChips: 120,
      timberStock: 96,
      hammerstones: 42,
      hideShelters: 7,
    },
    exclusions: [
      'modern roads',
      'visitor buildings',
      'metal tools',
      'woolly modern sheep',
      'early Bronze Age round barrow cemetery',
      'modern tree plantations',
    ],
    sources: [
      {
        title: 'English Heritage — Building Stonehenge',
        url: 'https://www.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/building-stonehenge',
      },
      {
        title: 'English Heritage — Stonehenge Reconstructed',
        url: 'https://www.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/stonehenge-reconstructed/',
      },
      {
        title: 'Historic England list entry 1010140',
        url: 'https://historicengland.org.uk/listing/the-list/list-entry/1010140',
      },
    ],
  };
}

export const STONEHENGE_ENVIRONMENT = createStonehengeEnvironmentPlan();
