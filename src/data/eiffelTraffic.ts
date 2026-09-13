export type EiffelTrafficActorKind =
  | 'pedestrian-man'
  | 'pedestrian-woman'
  | 'cart'
  | 'carriage'
  | 'steam-boat'
  | 'barge';

export interface EiffelRoundedRoute {
  id: string;
  surface: 'road' | 'sidewalk' | 'promenade';
  center: readonly [number, number];
  halfExtent: readonly [number, number];
  cornerRadius: number;
}

export interface EiffelRiverRoute {
  id: string;
  surface: 'water';
  minX: number;
  maxX: number;
  across: number;
  fadeStartX: number;
}

export type EiffelTrafficRoute = EiffelRoundedRoute | EiffelRiverRoute;

export interface EiffelTrafficActor {
  id: string;
  kind: EiffelTrafficActorKind;
  routeId: string;
  phase: number;
  direction: 1 | -1;
  speed: number;
  wheelRadius?: number;
  stride?: number;
  lateralOffset?: number;
  lod?: 'near' | 'far';
}

const roundedRoutes: EiffelRoundedRoute[] = [
  { id: 'carriage-east-outer', surface: 'road', center: [450, 248], halfExtent: [156, 260], cornerRadius: 14 },
  { id: 'carriage-west-outer', surface: 'road', center: [-450, 248], halfExtent: [156, 260], cornerRadius: 14 },
  { id: 'cart-east-service', surface: 'road', center: [294, 196], halfExtent: [104, 104], cornerRadius: 12 },
  { id: 'cart-west-service', surface: 'road', center: [-294, 196], halfExtent: [104, 104], cornerRadius: 12 },
  { id: 'expo-outer-inner', surface: 'promenade', center: [0, 228], halfExtent: [96, 122], cornerRadius: 7 },
  { id: 'expo-outer-outer', surface: 'promenade', center: [0, 228], halfExtent: [104, 122], cornerRadius: 7 },
  { id: 'expo-garden-inner', surface: 'promenade', center: [0, 230], halfExtent: [77, 82], cornerRadius: 8 },
  { id: 'expo-garden-outer', surface: 'promenade', center: [0, 230], halfExtent: [83, 88], cornerRadius: 8 },
  { id: 'tower-boundary-inner', surface: 'promenade', center: [0, 0], halfExtent: [96, 96], cornerRadius: 7 },
  { id: 'tower-boundary-outer', surface: 'promenade', center: [0, 0], halfExtent: [104, 104], cornerRadius: 7 },
  { id: 'expo-vehicle-loop', surface: 'promenade', center: [0, 225], halfExtent: [100, 125], cornerRadius: 8 },
  { id: 'tower-vehicle-loop', surface: 'promenade', center: [0, 0], halfExtent: [100, 100], cornerRadius: 8 },
  // Four stationary visitors per small loop form loose market conversations.
  // The centers sit on the new paving, clear of pavilion walls and planted
  // plane trees, while the loop tangent turns the figures toward one another.
  ...([
    [-116.5, -65], [-116.5, 0], [-116.5, 75],
    [-170, -76], [-170, 34], [-170, 97],
  ] as const).map(([x, z], index) => ({
    id: `market-cluster-${index + 1}`,
    surface: 'promenade' as const,
    center: [x, z] as const,
    halfExtent: [1.4, 1.4] as const,
    cornerRadius: 0.4,
  })),
  ...([-152, -144, -136] as const).flatMap((x) => ([-29, -22, 35, 44] as const).map((z) => ({
    id: `market-table-${x}-${z}`,
    surface: 'promenade' as const,
    center: [x, z] as const,
    halfExtent: [2.25, 2.25] as const,
    cornerRadius: 0.55,
  }))),
  ...([
    [-116.5, -78], [-116.5, -54], [-116.5, -28], [-116.5, 28],
    [-116.5, 52], [-116.5, 92], [-170.5, -84.8], [-171, 86.8],
  ] as const).map(([x, z], index) => ({
    id: `market-stall-mill-${index + 1}`,
    surface: 'promenade' as const,
    center: [x, z] as const,
    halfExtent: [1.6, 1.6] as const,
    cornerRadius: 0.5,
  })),
  ...([-1, 1] as const).flatMap((side) => [140, 185, 265, 330].map((z, index) => ({
    id: `palace-entry-${side < 0 ? 'west' : 'east'}-${index + 1}`,
    surface: 'promenade' as const,
    // The palace-facing edge of the garden walk is x=+/-85. Keeping these
    // pairs on x=+/-84 separates them from the carriage lane at x=+/-100.
    center: [side * 84, z] as const,
    halfExtent: [1, 1] as const,
    cornerRadius: 0.5,
  }))),
  { id: 'garden-west-mill', surface: 'promenade', center: [-78.5, 230], halfExtent: [2, 82], cornerRadius: 2 },
  { id: 'garden-east-mill', surface: 'promenade', center: [78.5, 230], halfExtent: [2, 82], cornerRadius: 2 },
  ...([-1, 1] as const).flatMap((side) => [144, 248, 352].map((z, row) => ({
    id: `pedestrian-${side < 0 ? 'west' : 'east'}-${row + 1}`,
    surface: 'sidewalk' as const,
    center: [side * (242 + row * 104), z] as const,
    halfExtent: [43.5, 43.5] as const,
    cornerRadius: 7,
  }))),
  // The north-bank cross-street has actual 59 m by 2 m paved sections.
  // Walkers turn within each section, leaving its junction approaches free.
  ...([-1, 1] as const).flatMap((side) => [280, 350, 420, 490].map((x) => ({
    id: `north-bank-walk-${side * x}`,
    surface: 'sidewalk' as const,
    center: [side * x, -386.5] as const,
    halfExtent: [25, 0.45] as const,
    cornerRadius: 0.45,
  }))),
];

const riverRoutes: EiffelRiverRoute[] = [
  { id: 'seine-upstream', surface: 'water', minX: -720, maxX: 720, across: 20, fadeStartX: 600 },
  { id: 'seine-downstream', surface: 'water', minX: -720, maxX: 720, across: -20, fadeStartX: 600 },
  { id: 'seine-mooring-near', surface: 'water', minX: -720, maxX: 720, across: 40, fadeStartX: 600 },
  { id: 'seine-mooring-far', surface: 'water', minX: -720, maxX: 720, across: -40, fadeStartX: 600 },
];

export const EIFFEL_TRAFFIC_ROUTES: readonly EiffelTrafficRoute[] = [...roundedRoutes, ...riverRoutes];

const foregroundCrowdRoutes = [
  ['expo-outer-inner', 70, 1, 1.08],
  ['expo-outer-outer', 70, -1, 1.08],
  ['tower-boundary-inner', 50, 1, 0.96],
  ['tower-boundary-outer', 50, -1, 0.96],
] as const;

const foregroundCrowd = foregroundCrowdRoutes.flatMap(([routeId, count, direction, speed], routeIndex) =>
  Array.from({ length: count }, (_, index): EiffelTrafficActor => ({
    id: `${routeId}-person-${index + 1}`,
    kind: (routeIndex + index) % 2 === 0 ? 'pedestrian-woman' : 'pedestrian-man',
    routeId,
    phase: (index + 0.5 + ((((index * 7 + routeIndex * 3) % 11) / 10) - 0.5) * 0.4) / count,
    direction,
    speed: speed + ((index % 5) - 2) * 0.006,
    stride: 1.22 + (index % 5) * 0.065,
    lateralOffset: ((((index * 5 + routeIndex * 2) % 9) - 4) / 4) * 1.2,
    lod: index % 7 === 0 ? 'near' : 'far',
  })),
);

const marketCrowd = roundedRoutes.filter((route) => route.id.startsWith('market-cluster-')).flatMap((route, routeIndex) =>
  Array.from({ length: 4 }, (_, index): EiffelTrafficActor => ({
    id: `${route.id}-person-${index + 1}`,
    kind: (routeIndex + index) % 2 === 0 ? 'pedestrian-woman' : 'pedestrian-man',
    routeId: route.id,
    phase: (index + 0.5) / 4,
    direction: index % 2 === 0 ? 1 : -1,
    speed: 0,
    stride: 1.35,
    lod: index === routeIndex % 4 ? 'near' : 'far',
  })),
);

const marketActivityCrowd = roundedRoutes
  .filter((route) => route.id.startsWith('market-table-') || route.id.startsWith('market-stall-mill-'))
  .flatMap((route, routeIndex) => Array.from({ length: 4 }, (_, index): EiffelTrafficActor => ({
    id: `${route.id}-person-${index + 1}`,
    kind: (routeIndex + index) % 2 === 0 ? 'pedestrian-woman' : 'pedestrian-man',
    routeId: route.id,
    phase: (index + 0.5) / 4,
    direction: index % 2 === 0 ? 1 : -1,
    speed: route.id.startsWith('market-table-') ? 0 : 0.26,
    stride: 1.28 + (index % 3) * 0.07,
    // Four representative market groups retain authored garments and gait;
    // the other visitors use the two-tone 16-triangle silhouette.
    lod: routeIndex % 5 === 0 && index === routeIndex % 4 ? 'near' : 'far',
  })));

const gardenPalaceCrowd = roundedRoutes
  .filter((route) => route.id.startsWith('palace-entry-')
    || (route.id.startsWith('garden-') && route.id.endsWith('-mill')))
  .flatMap((route, routeIndex) => {
    const count = route.id.startsWith('garden-') ? 24 : 4;
    return Array.from({ length: count }, (_, index): EiffelTrafficActor => ({
      id: `${route.id}-person-${index + 1}`,
      kind: (routeIndex + index) % 2 === 0 ? 'pedestrian-woman' : 'pedestrian-man',
      routeId: route.id,
      phase: (index + 0.5) / count,
      direction: routeIndex % 2 === 0 ? 1 : -1,
      speed: route.id.startsWith('garden-') ? 0.62 + (index % 3) * 0.015 : 0,
      stride: 1.24 + (index % 4) * 0.065,
      // The long garden walks keep one detailed walker per side. Palace-entry
      // pairs remain economical so the complete added crowd stays under the
      // mobile frame's remaining four-thousand-triangle allowance.
      lod: route.id.startsWith('garden-') && index === routeIndex % count ? 'near' : 'far',
    }));
  });

const distantCrowd = roundedRoutes.filter((route) => route.surface === 'sidewalk').flatMap((route, routeIndex) =>
  Array.from({ length: 16 }, (_, index): EiffelTrafficActor => ({
    id: `${route.id}-person-${index + 1}`,
    kind: (routeIndex + index) % 2 === 0 ? 'pedestrian-woman' : 'pedestrian-man',
    routeId: route.id,
    phase: (index + 0.5 + ((((index * 5 + routeIndex * 2) % 9) / 8) - 0.5) * 0.35) / 16,
    direction: routeIndex % 2 === 0 ? 1 : -1,
    speed: 0.9 + (routeIndex % 3) * 0.04,
    stride: 1.24 + (index % 4) * 0.07,
    lateralOffset: route.id.startsWith('north-bank-') ? 0
      : ((((index * 3 + routeIndex) % 7) - 3) / 3) * 1.05,
    lod: 'far',
  })),
);

const foregroundVehicles = [
  ...Array.from({ length: 6 }, (_, index): EiffelTrafficActor => ({
    id: `expo-vehicle-${index + 1}`,
    kind: index % 3 === 0 ? 'carriage' : 'cart',
    routeId: 'expo-vehicle-loop', phase: (index + 0.5) / 6, direction: 1, speed: 2.05,
    wheelRadius: 0.63, stride: 2.6, lod: 'near',
  })),
  ...Array.from({ length: 2 }, (_, index): EiffelTrafficActor => ({
    id: `tower-vehicle-${index + 1}`,
    kind: index % 2 === 0 ? 'cart' : 'carriage',
    routeId: 'tower-vehicle-loop', phase: (index + 0.5) / 2, direction: -1, speed: 1.85,
    wheelRadius: 0.63, stride: 2.6, lod: 'near',
  })),
];

const distantVehicles = ['carriage-east-outer', 'carriage-west-outer', 'cart-east-service', 'cart-west-service']
  .flatMap((routeId, routeIndex) => Array.from({ length: 4 }, (_, index): EiffelTrafficActor => ({
    id: `${routeId}-vehicle-${index + 1}`,
    kind: routeId.startsWith('carriage') ? 'carriage' : 'cart',
    routeId,
    phase: (index + 0.5) / 4,
    direction: routeIndex % 2 === 0 ? 1 : -1,
    speed: routeId.startsWith('carriage') ? 2.7 : 2,
    wheelRadius: 0.63,
    stride: 2.6,
    lod: 'far',
  })));

export const EIFFEL_TRAFFIC_ACTORS: readonly EiffelTrafficActor[] = [
  ...foregroundCrowd,
  ...marketCrowd,
  ...marketActivityCrowd,
  ...gardenPalaceCrowd,
  ...distantCrowd,
  ...foregroundVehicles,
  ...distantVehicles,
  { id: 'steamer-east', kind: 'steam-boat', routeId: 'seine-upstream', phase: 0.18, direction: 1, speed: 4.2 },
  { id: 'steamer-west', kind: 'steam-boat', routeId: 'seine-downstream', phase: 0.72, direction: -1, speed: 3.8 },
  { id: 'barge-west', kind: 'barge', routeId: 'seine-mooring-far', phase: 0.30, direction: 1, speed: 0 },
  { id: 'barge-east', kind: 'barge', routeId: 'seine-mooring-near', phase: 0.64, direction: -1, speed: 0 },
  { id: 'barge-far-east', kind: 'barge', routeId: 'seine-mooring-far', phase: 0.70, direction: 1, speed: 0 },
];
