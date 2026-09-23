/** 1966 interpreted context on metre-scale coast traced from NSW imagery. */
export interface SydneyFootprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export interface SydneyDistrict {
  id: string;
  name: string;
  footprint: SydneyFootprint;
  character: 'quay' | 'city' | 'terrace' | 'garden' | 'outer';
  source: string;
}
/** Named period building placed from its own footprint evidence. Local X is
 * `width` along yaw (three.js Y rotation); `depth` is local Z. */
export interface SydneyLandmark {
  id: string;
  name: string;
  built: number;
  demolished?: number;
  form:
    | 'castellated'
    | 'sandstone-civic'
    | 'slab-tower'
    | 'round-tower'
    | 'terminal'
    | 'station'
    | 'liner'
    | 'ferry'
    | 'finger-wharf'
    | 'pier-shed'
    | 'graving-dock'
    | 'hammerhead-crane'
    | 'warship'
    | 'fort'
    | 'villa'
    | 'luna-park'
    | 'observatory';
  x: number;
  z: number;
  yaw: number;
  width: number;
  depth: number;
  height: number;
  /** ground: sits on sampler land; water: floats; piles/footing: own supports to the harbour bed. */
  support: 'ground' | 'water' | 'piles' | 'footing';
  color: string;
  source: string;
  placement: string;
}
export interface SydneyViaduct {
  id: string;
  name: string;
  built: number;
  width: number;
  /** Deck top above the water datum where fully elevated. */
  deckY: number;
  /** Metres along the polyline over which each end meets grade. */
  rampIn: number;
  rampOut: number;
  points: readonly (readonly [number, number])[];
  source: string;
}
export interface SydneyContextRoute {
  id: string;
  from: string;
  to: string;
  width: number;
  points: readonly (readonly [number, number])[];
  mode: 'ground' | 'bridge-approach';
}
export const SYDNEY_HARBOUR_CONTEXT = {
  year: 1966,
  compass: { east: '+x', south: '+z', up: '+y' },
  interpretation:
    'Metre-scale north-up coastline digitized from NSW SIX imagery, with approximate ground heights. Background buildings and streets are interpreted period types, not surveyed individual 1966 plots. Modern skyline excluded. Landmark distances are not compressed.',
  sources: [
    {
      id: 'point',
      title: 'Sydney Opera House Conservation Management Plan2017',
      url: 'https://www.sydneyoperahouse.com/sites/default/files/collaborodam_assets/soh-cmp-interactive-1.pdf',
    },
    {
      id: 'map',
      title: 'NSW Spatial Services SIX imagery',
      url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_Imagery_Best/MapServer',
    },
    {
      id: 'bridge',
      title: 'Transport for NSW Harbour Bridge history',
      url: 'https://www.transport.nsw.gov.au/system/files/media/documents/2023/harbour-bridge-history.pdf',
    },
    {
      id: 'city',
      title: 'City of Sydney Archives aerial February1960',
      url: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/570297',
    },
    {
      id: 'quay',
      title: 'City Archives Overseas Passenger Terminal1960',
      url: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/686205',
    },
    {
      id: 'osm',
      title:
        'OpenStreetMap contributors (ODbL): Sydney Harbour relation 1252425, street centrelines, building footprints',
      url: 'https://www.openstreetmap.org/relation/1252425',
    },
    {
      id: 'history',
      title:
        'Construction/demolition years: NSW State Heritage Register and building histories (see city-context evidence README)',
      url: 'https://www.hms.heritage.nsw.gov.au/App/Item/SearchHeritageItems',
    },
  ],
  exclusions: [
    'Sydney Tower',
    '1976 AMP tower',
    'contemporary glass skyline',
    'filled Farm Cove',
    'post1973 Western Colonnade',
    'Australia Square later neighbours and post-1973 towers',
    'St Marys Cathedral spires (completed 2000)',
  ],
  districts: [
    {
      id: 'point',
      name: 'Bennelong Point worksite',
      footprint: { minX: -110, maxX: 90, minZ: -105, maxZ: 180 },
      character: 'quay',
      source: 'point',
    },
    {
      id: 'campbells-cove',
      name: 'Campbells Cove bond stores, Sydney Cove west',
      footprint: { minX: -600, maxX: -486, minZ: 270, maxZ: 450 },
      character: 'quay',
      source: 'quay',
    },
    {
      id: 'rocks',
      name: 'The Rocks and Dawes Point',
      footprint: { minX: -850, maxX: -440, minZ: -120, maxZ: 470 },
      character: 'terrace',
      source: 'map',
    },
    {
      id: 'cbd',
      name: 'Low masonry city and early office slabs',
      footprint: { minX: -1100, maxX: -165, minZ: 540, maxZ: 2000 },
      character: 'city',
      source: 'city',
    },
    {
      id: 'north-sydney',
      name: 'North Sydney office centre, 1960s',
      footprint: { minX: -820, maxX: -250, minZ: -2000, maxZ: -1420 },
      character: 'city',
      source: 'osm',
    },
    {
      id: 'woolloomooloo',
      name: 'Woolloomooloo terraces behind the bay',
      footprint: { minX: 560, maxX: 900, minZ: 1240, maxZ: 1900 },
      character: 'terrace',
      source: 'osm',
    },
    {
      id: 'potts-point',
      name: 'Potts Point flats above Garden Island',
      footprint: { minX: 850, maxX: 1320, minZ: 1000, maxZ: 1900 },
      character: 'terrace',
      source: 'osm',
    },
    {
      id: 'outer',
      name: 'Outer suburbs continuing into the haze',
      footprint: { minX: -3000, maxX: 3000, minZ: -3000, maxZ: 3000 },
      character: 'outer',
      source: 'map',
    },
    {
      id: 'milsons',
      name: 'Milsons Point',
      footprint: { minX: -500, maxX: -190, minZ: -1120, maxZ: -780 },
      character: 'terrace',
      source: 'map',
    },
    {
      id: 'kirribilli',
      name: 'Kirribilli slopes',
      footprint: { minX: -170, maxX: 400, minZ: -1050, maxZ: -540 },
      character: 'terrace',
      source: 'map',
    },
    {
      id: 'north-ridge',
      name: 'North shore ridge',
      footprint: { minX: -520, maxX: 370, minZ: -1550, maxZ: -1080 },
      character: 'terrace',
      source: 'map',
    },
    {
      id: 'garden',
      name: 'Botanic Garden west of Farm Cove',
      footprint: { minX: -180, maxX: 180, minZ: 165, maxZ: 650 },
      character: 'garden',
      source: 'point',
    },
  ] as readonly SydneyDistrict[],
  routes: [
    {
      id: 'south-approach',
      from: 'bridge-south',
      to: 'rocks',
      width: 28,
      mode: 'bridge-approach',
      points: [
        [-556.5, -277.18],
        [-700, -28],
      ],
    },
    {
      id: 'north-approach',
      from: 'bridge-north',
      to: 'milsons',
      width: 28,
      mode: 'bridge-approach',
      points: [
        [-271.5, -770.82],
        [-400, -1100],
      ],
    },
    {
      id: 'quay-street',
      from: 'rocks',
      to: 'cbd',
      width: 12,
      mode: 'ground',
      points: [
        [-510, 530],
        [-270, 530],
        [-240, 620],
      ],
    },
    {
      id: 'macquarie',
      from: 'cbd',
      to: 'point',
      width: 9,
      mode: 'ground',
      points: [
        [-175, 700],
        [-170, 380],
        [-130, 255],
        [-70, 175],
        [-38, 150],
      ],
    },
    {
      id: 'north-street',
      from: 'milsons',
      to: 'kirribilli',
      width: 9,
      mode: 'ground',
      points: [
        [-320, -925],
        [280, -925],
      ],
    },
    // OSM centrelines reduced by scripts/extract-sydney-osm-streets.ts.
    { id: 'george', from: 'rocks', to: 'cbd', width: 18, mode: 'ground', points: [[-781, 1992], [-761, 1954], [-740, 1225], [-691, 638], [-652, 533], [-610, 453], [-575, 251], [-549, 166]] },
    { id: 'pitt', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-649, 1952], [-619, 1319], [-543, 573]] },
    { id: 'castlereagh', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-556, 1980], [-461, 1036]] },
    { id: 'elizabeth', from: 'cbd', to: 'cbd', width: 16, mode: 'ground', points: [[-492, 1997], [-396, 1051]] },
    { id: 'phillip', from: 'cbd', to: 'cbd', width: 12, mode: 'ground', points: [[-371, 1363], [-336, 1056], [-356, 989], [-319, 901], [-271, 553]] },
    { id: 'macquarie-south', from: 'point', to: 'cbd', width: 18, mode: 'ground', points: [[-175, 700], [-281, 1425]] },
    { id: 'york', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-893, 721], [-790, 1752]] },
    { id: 'clarence', from: 'cbd', to: 'cbd', width: 12, mode: 'ground', points: [[-1009, 676], [-954, 799], [-947, 833], [-861, 1751]] },
    { id: 'kent', from: 'rocks', to: 'cbd', width: 12, mode: 'ground', points: [[-1066, 107], [-1029, 677], [-903, 1941]] },
    { id: 'bridge-st', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-680, 746], [-170, 704]] },
    { id: 'hunter', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-709, 949], [-588, 972], [-452, 1032], [-251, 1066]] },
    { id: 'martin-place', from: 'cbd', to: 'cbd', width: 16, mode: 'ground', points: [[-731, 1166], [-356, 1196], [-313, 1216], [-269, 1220]] },
    { id: 'king', from: 'cbd', to: 'cbd', width: 12, mode: 'ground', points: [[-1050, 1316], [-787, 1304], [-376, 1366]] },
    { id: 'market', from: 'cbd', to: 'cbd', width: 14, mode: 'ground', points: [[-1018, 1558], [-742, 1537], [-457, 1532]] },
    { id: 'park', from: 'cbd', to: 'cbd', width: 16, mode: 'ground', points: [[-734, 1780], [-450, 1819], [-226, 1864]] },
    { id: 'argyle', from: 'rocks', to: 'rocks', width: 10, mode: 'ground', points: [[-1157, 111], [-1100, 150], [-840, 189], [-719, 225], [-586, 251]] },
    { id: 'cowper-wharf', from: 'woolloomooloo', to: 'potts-point', width: 12, mode: 'ground', points: [[584, 1377], [643, 1355], [694, 1307], [718, 1268], [887, 901], [886, 881]] },
    { id: 'macleay', from: 'potts-point', to: 'potts-point', width: 12, mode: 'ground', points: [[907, 1786], [992, 1249], [998, 1199], [979, 1178]] },
    { id: 'victoria-potts', from: 'potts-point', to: 'woolloomooloo', width: 12, mode: 'ground', points: [[715, 1686], [791, 1261]] },
    { id: 'william', from: 'cbd', to: 'woolloomooloo', width: 20, mode: 'ground', points: [[-211, 1866], [531, 2011], [571, 2023], [605, 2053], [625, 2056]] },
    { id: 'broughton', from: 'kirribilli', to: 'north-ridge', width: 9, mode: 'ground', points: [[-207, -1493], [-236, -1351], [-165, -902]] },
    { id: 'blues-point', from: 'north-ridge', to: 'north-ridge', width: 10, mode: 'ground', points: [[-1048, -940], [-1042, -1096], [-1020, -1163], [-996, -1376], [-949, -1538], [-848, -1699]] },
    { id: 'pacific-hwy', from: 'north-sydney', to: 'north-sydney', width: 16, mode: 'ground', points: [[-546, -1755], [-494, -1709], [-471, -1667], [-414, -1607], [-383, -1531], [-385, -1490], [-354, -1459]] },
    // Bradfield Highway at grade from the bridge approach to the Cahill ramp.
    { id: 'bradfield-link', from: 'rocks', to: 'cbd', width: 20, mode: 'ground', points: [[-700, -28], [-754, 184], [-790, 266], [-812, 387]] },
    {
      id: 'kirribilli-foreshore',
      from: 'kirribilli',
      to: 'kirribilli',
      width: 7,
      mode: 'ground',
      points: [
        [55, -780],
        [300, -660],
      ],
    },
    {
      id: 'kirribilli-link',
      from: 'kirribilli',
      to: 'kirribilli',
      width: 7,
      mode: 'ground',
      points: [
        [100, -755],
        [100, -1000],
      ],
    },
    {
      id: 'milsons-lane',
      from: 'milsons',
      to: 'milsons',
      width: 7,
      mode: 'ground',
      points: [
        [-350, -850],
        [-420, -1060],
      ],
    },
    {
      id: 'rocks-lane',
      from: 'rocks',
      to: 'rocks',
      width: 7,
      mode: 'ground',
      points: [
        [-620, -90],
        [-620, 430],
      ],
    },
    {
      id: 'ridge-lane',
      from: 'north-ridge',
      to: 'north-ridge',
      width: 7,
      mode: 'ground',
      points: [
        [-470, -1140],
        [170, -1140],
      ],
    },
    {
      id: 'upper-ridge',
      from: 'north-ridge',
      to: 'north-ridge',
      width: 7,
      mode: 'ground',
      points: [
        [-470, -1350],
        [150, -1350],
      ],
    },
  ] as readonly SydneyContextRoute[],
  gardenComposition: {
    interpretation:
      'Three irregular interpreted canopy groups frame a lawn on the actual southern garden peninsula. Individual planting positions are not a1973 survey.',
    source: 'point',
    seed: 'sydney-mapped-garden-v2',
    canopyEnvelope: {
      width: 16,
      depth: 15,
      note: 'Conservative yawed originalfig envelope',
    },
    maxInstances: 90,
    canopyGroups: [
      {
        id: 'western-shoulder',
        plantingCenters: [
          [-120, 205],
          [-125, 252],
          [-120, 302],
        ],
        plantingRadius: 48,
        polygon: [
          [-170, 240],
          [-130, 180],
          [-108, 172],
          [-101, 190],
          [-103, 230],
          [-70, 245],
          [-80, 330],
          [-155, 350],
        ],
        scaleRange: [0.7, 1.14],
      },
      {
        id: 'landward-crescent',
        plantingCenters: [
          [-80, 411],
          [-18, 433],
          [43, 447],
        ],
        plantingRadius: 38,
        polygon: [
          [-155, 440],
          [-100, 360],
          [90, 380],
          [155, 480],
          [120, 580],
          [-100, 570],
        ],
        scaleRange: [0.58, 1.1],
      },
      {
        id: 'eastern-belt',
        plantingCenters: [
          [59, 203],
          [65, 242],
          [91, 277],
        ],
        plantingRadius: 48,
        polygon: [
          [45, 175],
          [61, 173],
          [95, 208],
          [130, 270],
          [95, 307],
          [45, 295],
        ],
        scaleRange: [0.7, 1.05],
      },
    ],
    frontageRelocations: [] as readonly {
      from: readonly [number, number];
      to: readonly [number, number];
      yaw: number;
      group: string;
    }[],
    openShoreSector: [
      [135, 305],
      [180, 340],
      [190, 450],
      [150, 445],
    ],
    lawn: {
      id: 'farm-cove-lawn',
      polygon: [
        [-50, 280],
        [20, 270],
        [120, 320],
        [165, 350],
        [173, 375],
        [120, 390],
        [-50, 345],
      ],
      shoreMouth: [
        [165, 350],
        [173, 375],
      ],
      facing: [1, -0.15],
      landwardEdgeZ: 345,
    },
  },
  residentialClusters: [
    {
      district: 'kirribilli',
      street: 'kirribilli-foreshore',
      start: 0.05,
      end: 0.9,
    },
    { district: 'kirribilli', street: 'north-street', start: 0.35, end: 0.98 },
    { district: 'milsons', street: 'milsons-lane', start: 0.03, end: 0.95 },
    { district: 'rocks', street: 'rocks-lane', start: 0.05, end: 0.95 },
    { district: 'north-ridge', street: 'ridge-lane', start: 0.02, end: 0.98 },
    { district: 'north-ridge', street: 'upper-ridge', start: 0.04, end: 0.98 },
    { district: 'rocks', street: 'argyle', start: 0.45, end: 0.98 },
    { district: 'woolloomooloo', street: 'cowper-wharf', start: 0.0, end: 0.35, forms: ['row', 'row', 'flats'] },
    { district: 'woolloomooloo', street: 'victoria-potts', start: 0.0, end: 1, forms: ['row', 'row', 'row', 'villa'] },
    { district: 'woolloomooloo', street: 'william', start: 0.86, end: 1, forms: ['row', 'flats'] },
    { district: 'potts-point', street: 'macleay', start: 0.0, end: 1, forms: ['flats', 'flats', 'row', 'flats'] },
    { district: 'milsons', street: 'broughton', start: 0.55, end: 1 },
    { district: 'north-ridge', street: 'blues-point', start: 0.1, end: 0.9, forms: ['villa', 'row', 'flats'] },
  ] as readonly {
    district: string;
    street: string;
    start: number;
    end: number;
    forms?: readonly ('villa' | 'row' | 'flats')[];
  }[],
  protectedFootprints: [
    { minX: -90, maxX: 90, minZ: -105, maxZ: 120 },
    { minX: -100, maxX: 40, minZ: 105, maxZ: 220 },
  ] as readonly SydneyFootprint[],
  wharves: [-430, -395, -360, -325, -290].map((x) => ({
    x,
    z: 442,
    width: 14,
    length: 92,
  })),
  // Period landmarks, all standing within 1959–1973. OSM footprint centres and
  // oriented bounds where mapped (way ids noted); demolished buildings use
  // approximate historical sites. Massing is stylised, never survey geometry.
  landmarks: [
    { id: 'government-house', name: 'Government House', built: 1845, form: 'castellated', x: -3, z: 329, yaw: 1.796, width: 89, depth: 50, height: 13, support: 'ground', color: '#c8a778', source: 'osm', placement: 'OSM way 156581638 oriented bounds' },
    { id: 'conservatorium', name: 'Conservatorium (Government Stables)', built: 1821, form: 'castellated', x: -80, z: 732, yaw: 1.419, width: 62, depth: 50, height: 12, support: 'ground', color: '#c9a67a', source: 'osm', placement: 'Historic stables within OSM campus way 1486021539; later extensions excluded' },
    { id: 'customs-house', name: 'Customs House', built: 1885, form: 'sandstone-civic', x: -387, z: 587, yaw: 0, width: 46, depth: 42, height: 24, support: 'ground', color: '#cfae80', source: 'osm', placement: 'OSM way 351374509 bounds' },
    { id: 'circular-quay-station', name: 'Circular Quay station', built: 1956, form: 'station', x: -394, z: 487, yaw: -0.0955, width: 334, depth: 24, height: 11, support: 'ground', color: '#b9b1a2', source: 'osm', placement: 'Along the OSM Cahill Expressway quay alignment, carrying its deck' },
    { id: 'amp-building', name: 'AMP Building', built: 1962, form: 'slab-tower', x: -316, z: 571, yaw: -0.089, width: 51, depth: 22, height: 117, support: 'ground', color: '#9fb0ad', source: 'osm', placement: 'OSM way 335687068; 26 storeys, 117 m' },
    { id: 'gold-fields-house', name: 'Gold Fields House', built: 1966, demolished: 2014, form: 'slab-tower', x: -498, z: 588, yaw: 0, width: 40, depth: 22, height: 100, support: 'ground', color: '#b6ad9c', source: 'history', placement: 'Corner of Alfred and Pitt streets, approximate within 25 m' },
    { id: 'state-office-block', name: 'State Office Block', built: 1965, demolished: 1997, form: 'slab-tower', x: -271, z: 893, yaw: -1.684, width: 44, depth: 22, height: 128, support: 'ground', color: '#c7c3b8', source: 'history', placement: 'Phillip/Bent/Macquarie block; orientation interpreted' },
    { id: 'australia-square', name: 'Australia Square tower', built: 1967, form: 'round-tower', x: -667, z: 885, yaw: 0, width: 41, depth: 41, height: 170, support: 'ground', color: '#d6d0c2', source: 'osm', placement: 'OSM way 26303631; 50 storeys, 170 m' },
    { id: 'state-library', name: 'State Library of NSW (Mitchell wing)', built: 1910, form: 'sandstone-civic', x: -201, z: 1102, yaw: -0.122, width: 45, depth: 34, height: 20, support: 'ground', color: '#d1b082', source: 'osm', placement: 'OSM way 16749946' },
    { id: 'parliament-house', name: 'Parliament House', built: 1816, form: 'sandstone-civic', x: -192, z: 1165, yaw: -0.122, width: 26, depth: 54, height: 12, support: 'ground', color: '#d8c6a4', source: 'osm', placement: 'Within OSM relation 19852469 bounds' },
    { id: 'sydney-hospital', name: 'Sydney Hospital', built: 1894, form: 'sandstone-civic', x: -188, z: 1252, yaw: -0.122, width: 40, depth: 70, height: 18, support: 'ground', color: '#c69d73', source: 'osm', placement: 'Main block within OSM way 387748051' },
    { id: 'art-gallery', name: 'Art Gallery of New South Wales', built: 1909, form: 'sandstone-civic', x: 236, z: 1270, yaw: 2.281, width: 90, depth: 60, height: 18, support: 'ground', color: '#d6c29c', source: 'osm', placement: 'Original building within OSM way 1265404795' },
    { id: 'sydney-observatory', name: 'Sydney Observatory', built: 1858, form: 'observatory', x: -967, z: 287, yaw: 0, width: 21, depth: 30, height: 10, support: 'ground', color: '#caa77a', source: 'osm', placement: 'OSM way 55218511' },
    { id: 'overseas-passenger-terminal', name: 'Overseas Passenger Terminal', built: 1960, form: 'terminal', x: -459, z: 126, yaw: -0.157, width: 49, depth: 287, height: 14, support: 'piles', color: '#e2ddcf', source: 'osm', placement: 'OSM way 1308939774 oriented bounds' },
    { id: 'berthed-liner', name: 'Ocean liner at the terminal (representative)', built: 1960, form: 'liner', x: -412, z: 126, yaw: -0.157, width: 30, depth: 236, height: 16, support: 'water', color: '#f1eee6', source: 'quay', placement: 'Representative 1960s liner, not a named ship' },
    { id: 'quay-ferry-1', name: 'Harbour ferry', built: 1938, form: 'ferry', x: -412.5, z: 425, yaw: 0, width: 10, depth: 46, height: 7, support: 'water', color: '#2f5a3a', source: 'quay', placement: 'Representative green-and-cream ferry between quay wharves' },
    { id: 'quay-ferry-2', name: 'Harbour ferry', built: 1938, form: 'ferry', x: -377.5, z: 427, yaw: 0, width: 10, depth: 42, height: 7, support: 'water', color: '#2f5a3a', source: 'quay', placement: 'Representative green-and-cream ferry between quay wharves' },
    { id: 'quay-ferry-3', name: 'Harbour ferry', built: 1938, form: 'ferry', x: -342.5, z: 424, yaw: 0, width: 10, depth: 46, height: 7, support: 'water', color: '#2f5a3a', source: 'quay', placement: 'Representative green-and-cream ferry between quay wharves' },
    { id: 'walsh-bay-pier-2', name: 'Walsh Bay Pier 2/3', built: 1921, form: 'pier-shed', x: -860, z: -216, yaw: 1.908, width: 194, depth: 40, height: 12, support: 'piles', color: '#b8a584', source: 'osm', placement: 'Finger outline in OSM harbour relation 1252425' },
    { id: 'walsh-bay-pier-4', name: 'Walsh Bay Pier 4/5', built: 1922, form: 'pier-shed', x: -951, z: -152, yaw: 1.913, width: 211, depth: 38, height: 12, support: 'piles', color: '#b3a07f', source: 'osm', placement: 'Finger outline in OSM harbour relation 1252425' },
    { id: 'walsh-bay-pier-6', name: 'Walsh Bay Pier 6/7', built: 1922, form: 'pier-shed', x: -1054, z: -123, yaw: 1.913, width: 155, depth: 40, height: 12, support: 'piles', color: '#b8a584', source: 'osm', placement: 'Finger outline in OSM harbour relation 1252425' },
    { id: 'finger-wharf', name: 'Woolloomooloo Finger Wharf', built: 1915, form: 'finger-wharf', x: 556, z: 1187, yaw: 1.122, width: 353, depth: 42, height: 14, support: 'piles', color: '#c2b394', source: 'osm', placement: 'OSM way 270847874 oriented bounds' },
    { id: 'captain-cook-dock', name: 'Captain Cook Graving Dock', built: 1945, form: 'graving-dock', x: 1121, z: 894, yaw: -1.374, width: 338, depth: 46, height: 0, support: 'ground', color: '#3d4851', source: 'osm', placement: 'OSM way 4333814 oriented bounds' },
    { id: 'hammerhead-crane', name: 'Garden Island hammerhead crane', built: 1951, form: 'hammerhead-crane', x: 1150, z: 760, yaw: -1.374, width: 62, depth: 10, height: 61, support: 'ground', color: '#4f5961', source: 'history', placement: 'Beside the dock entrance, approximate within 40 m' },
    { id: 'garden-island-destroyer-1', name: 'Naval destroyer at Garden Island (representative)', built: 1959, form: 'warship', x: 1105, z: 364, yaw: 1.189, width: 118, depth: 13, height: 9, support: 'water', color: '#7c858b', source: 'osm', placement: 'Representative RAN ship alongside the mapped island wharf' },
    { id: 'garden-island-destroyer-2', name: 'Naval destroyer at Garden Island (representative)', built: 1959, form: 'warship', x: 1155, z: 239, yaw: 1.189, width: 112, depth: 12, height: 9, support: 'water', color: '#7c858b', source: 'osm', placement: 'Representative RAN ship alongside the mapped island wharf' },
    { id: 'fort-denison', name: 'Fort Denison', built: 1857, form: 'fort', x: 968, z: -226, yaw: 0.35, width: 62, depth: 30, height: 9, support: 'footing', color: '#b99d74', source: 'osm', placement: 'Islet in OSM harbour relation 1252425; own sandstone footing' },
    { id: 'admiralty-house', name: 'Admiralty House', built: 1843, form: 'villa', x: 300, z: -584, yaw: 1.152, width: 32, depth: 52, height: 11, support: 'ground', color: '#e1d3b5', source: 'osm', placement: 'OSM way 120288382' },
    { id: 'kirribilli-house', name: 'Kirribilli House', built: 1854, form: 'villa', x: 378, z: -631, yaw: -1.67, width: 24, depth: 34, height: 10, support: 'ground', color: '#d6c7a8', source: 'osm', placement: 'OSM way 120288552' },
    { id: 'luna-park', name: 'Luna Park', built: 1935, form: 'luna-park', x: -468, z: -1052, yaw: 0, width: 56, depth: 70, height: 14, support: 'ground', color: '#e8dcc0', source: 'osm', placement: 'Within OSM relation 2916623; face gate toward the harbour' },
    { id: 'blues-point-tower', name: 'Blues Point Tower', built: 1962, form: 'slab-tower', x: -1093, z: -864, yaw: 0, width: 30, depth: 30, height: 83, support: 'ground', color: '#bdb6a7', source: 'osm', placement: 'OSM way 47573826' },
  ] as readonly SydneyLandmark[],
  viaducts: [
    {
      id: 'cahill-expressway',
      name: 'Cahill Expressway over Circular Quay station',
      built: 1958,
      width: 24,
      deckY: 16,
      rampIn: 150,
      rampOut: 110,
      points: [
        [-812, 387],
        [-762, 441],
        [-641, 459],
        [-228, 503],
        [-164, 515],
        [-125, 535],
        [-105, 569],
        [-109, 618],
        [-128, 668],
      ],
      source: 'osm',
    },
  ] as readonly SydneyViaduct[],
} as const;

export function sydneyDistanceToRoute(
  x: number,
  z: number,
  route: SydneyContextRoute,
): number {
  let result = Infinity;
  for (let i = 1; i < route.points.length; i++) {
    const [ax, az] = route.points[i - 1]!;
    const [bx, bz] = route.points[i]!;
    const dx = bx - ax;
    const dz = bz - az;
    const u = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
    );
    result = Math.min(result, Math.hypot(x - ax - u * dx, z - az - u * dz));
  }
  return result;
}
