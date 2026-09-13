import type { PetraLayer } from './petraTypes';
import { PETRA_CONSTRUCTION } from './petraConstruction';

export interface PetraEnvironmentPlan {
  era: {
    approximateYear: number;
    latitude: number;
    description: string;
    productionNote: string;
  };
  palette: Record<'rose' | 'strata' | 'siq' | 'plaza' | 'timber' | 'sky', string>;
  layers: PetraLayer[];
  terrain: {
    radius: number;
    segments: number;
    motion: 'static-world-space';
    description: string;
  };
  facade: {
    width: number;
    height: number;
    siqLength: number;
  };
  ecology: {
    floorTufts: number;
    wallShrubs: number;
    description: string;
  };
  site: {
    spoilChips: number;
    timberBenches: number;
    baskets: number;
  };
  exclusions: string[];
  sources: Array<{ title: string; url: string }>;
}

export function createPetraEnvironmentPlan(): PetraEnvironmentPlan {
  return {
    era: {
      approximateYear: -20,
      latitude: 30.3285,
      description: 'Nabataean masons carving Al-Khazneh into Jabal al-Khubtha at the Siq mouth.',
      productionNote:
        'Dating is compressed to Petra\'s Nabataean floruit around the late first ' +
        'century BC / early first century AD. Timber chutes and Siq sleds are an ' +
        'authored kit, not proven archaeology. Top-down carving is the inferred method.',
    },
    palette: {
      rose: '#c77b4f',
      strata: '#a35c38',
      siq: '#4a2e2b',
      plaza: '#c9a06a',
      timber: '#6e472a',
      sky: '#6fa3c8',
    },
    layers: PETRA_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 220,
      segments: 48,
      motion: 'static-world-space',
      description: 'Siq gravel floor with stratified canyon walls and a cliff mass behind the Treasury.',
    },
    facade: {
      width: PETRA_CONSTRUCTION.facadeWidth,
      height: PETRA_CONSTRUCTION.facadeHeight,
      siqLength: 72,
    },
    ecology: {
      floorTufts: 180,
      wallShrubs: 28,
      description: 'Sparse dry-gorge herbs on the floor; no oasis lawn and no tourist oleander beds.',
    },
    site: {
      spoilChips: 96,
      timberBenches: 8,
      baskets: 18,
    },
    exclusions: [
      'modern tourism',
      'asphalt and railings',
      'Ottoman masonry',
      'minarets',
      'Roman concrete vaults',
      'Disney caravan clogging the Siq',
      'electric carts',
    ],
    sources: [
      {
        title: 'UNESCO World Heritage List, Petra (no. 326)',
        url: 'https://whc.unesco.org/en/list/326/',
      },
      {
        title: 'McKenzie, The Architecture of Petra (1990)',
        url: 'https://www.worldcat.org/title/architecture-of-petra/oclc/24741900',
      },
    ],
  };
}

export const PETRA_ENVIRONMENT = createPetraEnvironmentPlan();
