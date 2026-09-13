import type { SydneyLayer } from './sydneyTypes';
import {
  SYDNEY_CONSTRUCTION,
  SYDNEY_HEIGHT,
  SYDNEY_LENGTH,
  SYDNEY_WIDTH,
} from './sydneyConstruction';

export interface SydneyEnvironmentPlan {
  era: {
    approximateYear: number;
    latitude: number;
    description: string;
    productionNote: string;
  };
  palette: Record<'granite' | 'concrete' | 'tile' | 'water' | 'steel' | 'sky', string>;
  layers: SydneyLayer[];
  terrain: {
    radius: number;
    segments: number;
    motion: 'static-world-space';
    description: string;
  };
  monument: {
    length: number;
    width: number;
    height: number;
    sails: number;
  };
  ecology: {
    figs: number;
    quaySheds: number;
    tileStacks: number;
    castingBeds: number;
    description: string;
  };
  site: {
    towerCranes: number;
    crawlerCranes: number;
    dozers: number;
    dumpTrucks: number;
    trolleys: number;
    falseworkStations: number;
  };
  exclusions: string[];
  sources: Array<{ title: string; url: string }>;
}

export function createSydneyEnvironmentPlan(): SydneyEnvironmentPlan {
  return {
    era: {
      approximateYear: 1966,
      latitude: -33.8568,
      description: 'Utzon and Arup crews assembling spherical-section shells on Bennelong Point.',
      productionNote:
        'The movie compresses 1959–1973 into one minute and authors two yellow ' +
        'Favelle-style luffing tower cranes, a yard crawler crane, bulldozers and ' +
        'dump trucks during podium earthworks, plus on-site precast beds. ' +
        'Sails are sections of a 75 m sphere clad after their ribs seat.',
    },
    palette: {
      granite: '#8a7a6a',
      concrete: '#c8c0b4',
      tile: '#f2ebe0',
      water: '#3a7a9c',
      steel: '#5a6570',
      sky: '#2f86c8',
    },
    layers: SYDNEY_CONSTRUCTION.layers.map((layer) => ({ ...layer })),
    terrain: {
      radius: 720,
      segments: 96,
      motion: 'static-world-space',
      description: 'Bennelong Point peninsula in Sydney Harbour, Farm Cove east, Circular Quay south, Bridge west.',
    },
    monument: {
      length: SYDNEY_LENGTH,
      width: SYDNEY_WIDTH,
      height: SYDNEY_HEIGHT,
      sails: 9,
    },
    ecology: {
      figs: 28,
      quaySheds: 8,
      tileStacks: 18,
      castingBeds: 10,
      description:
        'Harbour water, fig trees on the point, Circular Quay sheds, an on-site ' +
        'precast yard, Höganäs tile palettes, and a western Harbour Bridge silhouette.',
    },
    site: {
      towerCranes: 2,
      crawlerCranes: 1,
      dozers: 3,
      dumpTrucks: 3,
      trolleys: 8,
      falseworkStations: 8,
    },
    exclusions: [
      'modern tourism',
      'opening-night fireworks',
      'Giza ramps',
      'Stonehenge pits',
      'Colosseum treadwheels',
      'Anno or other commercial meshes',
    ],
    sources: [
      { title: 'UNESCO Sydney Opera House', url: 'https://whc.unesco.org/en/list/166/' },
      { title: 'Utzon: The Sydney Opera House', url: 'https://www.sydneyoperahouse.com/our-story/architecture' },
    ],
  };
}

export const SYDNEY_ENVIRONMENT = createSydneyEnvironmentPlan();
