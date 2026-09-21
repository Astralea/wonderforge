import { COLOSSEUM_AQUEDUCT as A } from './colosseumAqueduct';

export type RomePoint = readonly [number, number];

const length = (A.pierCount - 1) * (A.clearSpan + A.pierWidth);
/** Across the arcade toward the valley; +Z is north. */
const beside = (distance: number, offset: number): RomePoint => [
  A.start[0] + A.direction[0] * distance - A.direction[1] * offset,
  A.start[1] + A.direction[1] * distance + A.direction[0] * offset,
];

/** Relationships, not a survey. Dimensions are metres in the compressed world. */
export const COLOSSEUM_URBAN_CONTEXT = {
  id: 'flavian-caelian-context',
  dateRange: [70, 80],
  compass: '+X east, +Z north',
  productionNote: 'Original compressed Caelian precinct and street layout; no claim of exact plots, elevations or restoration state. No direct Colosseum water supply is depicted.',
  sources: [
    'https://www.turismoroma.it/en/node/1137',
    'https://www.sovraintendenzaroma.it/content/acquedotto-neroniano',
    'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/De_Aquis/Rodgers/1%2A%2A.html#20',
  ],
  assets: ['/models/colosseum-rome/rome-kit.glb', '/models/colosseum-rome/housing-variants.glb', A.glb],
  precinct: {
    id: 'claudian-precinct',
    center: [12, -308] as RomePoint,
    width: 118,
    depth: 88,
    // Covered conduit enters the east retaining wall just below terrace level.
    top: A.springingHeight + A.spandrelTop + A.channelHeight + A.capHeight + .04,
    northEntryWidth: 18,
  },
  watercourse: {
    id: 'neronian-caelian-branch',
    from: 'east-caelian-continuation',
    to: 'claudian-precinct-east-wall',
    visibleJoin: beside(length, 0),
    upstream: beside(length + A.continuationBays * (A.clearSpan + A.pierWidth), 0),
    upstreamKind: 'off-scene-continuation',
    receiver: beside(-A.pierWidth / 2, 0),
    corridorHalfWidth: 5,
  },
  streets: [
    { id: 'caelian-arcade-street', width: 7, points: [beside(4, 23), beside(length + 48, 23)] },
    { id: 'caelian-south-street', width: 5.5, points: [beside(20, -24), beside(length + 48, -24)] },
    { id: 'precinct-north-approach', width: 8, points: [[12, -226], [12, -202], [72, -178], [142, -153], [220, -60], [250, 12]] as RomePoint[] },
    { id: 'caelian-west-link', width: 6, points: [[12, -226], [74, -248], beside(4, 23)] },
    // Authored lanes connect the western neighbourhoods; they are not surveyed
    // ancient street alignments. Shared clearance keeps their whole width open.
    { id: 'velia-palatine-lane', width: 4.5, points: [[-140,125], [-202,170], [-278,185], [-330,125], [-405,60], [-450,-20], [-540,30], [-700,90]] as RomePoint[] },
    { id: 'velia-north-lane', width: 4, points: [[-278,185], [-260,240], [-220,300]] as RomePoint[] },
  ],
} as const;
