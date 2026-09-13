import {
  EIFFEL_TRAFFIC_ACTORS,
  EIFFEL_TRAFFIC_ROUTES,
  type EiffelRoundedRoute,
  type EiffelTrafficActor,
  type EiffelTrafficRoute,
} from '../data/eiffelTraffic';
import { clamp } from './easing';
import { EIFFEL_SEINE_WATER_Y, eiffelTerrainHeightAt } from './eiffelTerrain';

const MOVIE_SECONDS = 60;
const TAU = Math.PI * 2;
const SEINE_YAW = 0.08;
const routesById = new Map(EIFFEL_TRAFFIC_ROUTES.map((route) => [route.id, route]));

export interface EiffelTrafficPose {
  id: string;
  kind: EiffelTrafficActor['kind'];
  position: readonly [number, number, number];
  yaw: number;
  visibility: number;
  distance: number;
  wheelAngle: number;
  gaitPhase: number;
}

export function roundedRouteLength(route: EiffelRoundedRoute): number {
  const [hx, hz] = route.halfExtent;
  return 4 * (hx + hz - 2 * route.cornerRadius) + TAU * route.cornerRadius;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function roundedRoutePoint(route: EiffelRoundedRoute, distance: number): { x: number; z: number; tx: number; tz: number } {
  const [cx, cz] = route.center;
  const [hx, hz] = route.halfExtent;
  const r = route.cornerRadius;
  const horizontal = 2 * (hx - r);
  const vertical = 2 * (hz - r);
  const arc = Math.PI * r / 2;
  let d = positiveModulo(distance, roundedRouteLength(route));
  if (d < horizontal) return { x: cx - hx + r + d, z: cz - hz, tx: 1, tz: 0 };
  d -= horizontal;
  if (d < arc) {
    const a = -Math.PI / 2 + d / r;
    return { x: cx + hx - r + Math.cos(a) * r, z: cz - hz + r + Math.sin(a) * r, tx: -Math.sin(a), tz: Math.cos(a) };
  }
  d -= arc;
  if (d < vertical) return { x: cx + hx, z: cz - hz + r + d, tx: 0, tz: 1 };
  d -= vertical;
  if (d < arc) {
    const a = d / r;
    return { x: cx + hx - r + Math.cos(a) * r, z: cz + hz - r + Math.sin(a) * r, tx: -Math.sin(a), tz: Math.cos(a) };
  }
  d -= arc;
  if (d < horizontal) return { x: cx + hx - r - d, z: cz + hz, tx: -1, tz: 0 };
  d -= horizontal;
  if (d < arc) {
    const a = Math.PI / 2 + d / r;
    return { x: cx - hx + r + Math.cos(a) * r, z: cz + hz - r + Math.sin(a) * r, tx: -Math.sin(a), tz: Math.cos(a) };
  }
  d -= arc;
  if (d < vertical) return { x: cx - hx, z: cz + hz - r - d, tx: 0, tz: -1 };
  d -= vertical;
  const a = Math.PI + d / r;
  return { x: cx - hx + r + Math.cos(a) * r, z: cz - hz + r + Math.sin(a) * r, tx: -Math.sin(a), tz: Math.cos(a) };
}

function routeFor(actor: EiffelTrafficActor): EiffelTrafficRoute {
  const route = routesById.get(actor.routeId);
  if (!route) throw new Error(`Unknown Eiffel traffic route: ${actor.routeId}`);
  return route;
}

export function eiffelTrafficPoseAt(actor: EiffelTrafficActor, rawT: number, elapsedClock = false): EiffelTrafficPose {
  // Extended Eiffel chapters retain actor speed without freezing at 60 seconds.
  const t = elapsedClock ? (Number.isFinite(rawT) ? Math.max(0, rawT) : 0) : clamp(rawT);
  const route = routeFor(actor);
  if (route.surface === 'water') {
    const length = route.maxX - route.minX;
    const signedDistance = actor.direction * actor.speed * t * MOVIE_SECONDS;
    const x = route.minX + positiveModulo(actor.phase * length + signedDistance, length);
    const z = -175 - Math.tan(SEINE_YAW) * x + route.across / Math.cos(SEINE_YAW);
    const edgeDistance = Math.max(0, Math.abs(x) - route.fadeStartX);
    const fadeSpan = route.maxX - route.fadeStartX;
    const visibility = 1 - Math.min(1, edgeDistance / fadeSpan);
    const tx = actor.direction * Math.cos(SEINE_YAW);
    const tz = actor.direction * -Math.sin(SEINE_YAW);
    return {
      id: actor.id,
      kind: actor.kind,
      position: [x, EIFFEL_SEINE_WATER_Y, z],
      yaw: Math.atan2(tx, tz),
      visibility,
      distance: signedDistance,
      wheelAngle: 0,
      gaitPhase: 0,
    };
  }

  const length = roundedRouteLength(route);
  const signedDistance = actor.direction * actor.speed * t * MOVIE_SECONDS;
  const routeDistance = actor.phase * length + signedDistance;
  const point = roundedRoutePoint(route, routeDistance);
  const lateralOffset = actor.lateralOffset ?? 0;
  const x = point.x + point.tz * lateralOffset;
  const z = point.z - point.tx * lateralOffset;
  const tx = point.tx * actor.direction;
  const tz = point.tz * actor.direction;
  const surfaceLift = route.surface === 'road' ? 0.08 : 0.24;
  return {
    id: actor.id,
    kind: actor.kind,
    position: [x, eiffelTerrainHeightAt(x, z) + surfaceLift, z],
    yaw: Math.atan2(tx, tz),
    visibility: 1,
    distance: signedDistance,
    // +Z is the vehicle's forward direction, even on a reversed route. A
    // positive X rotation moves the bottom rim toward -Z, cancelling travel.
    wheelAngle: actor.wheelRadius ? Math.abs(signedDistance) / actor.wheelRadius : 0,
    gaitPhase: actor.stride ? positiveModulo(signedDistance / actor.stride * TAU, TAU) : 0,
  };
}

export function activeEiffelTrafficAt(t: number): EiffelTrafficPose[] {
  return EIFFEL_TRAFFIC_ACTORS.map((actor) => eiffelTrafficPoseAt(actor, t));
}
