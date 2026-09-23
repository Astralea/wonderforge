import type { Wonder } from './types';
import { pyramidsOfGiza } from './wonders/pyramids-of-giza';
import { stonehenge } from './wonders/stonehenge';
import { petra } from './wonders/petra';
import { colosseum } from './wonders/colosseum';
import { chichenItza } from './wonders/chichen-itza';
import { machuPicchu } from './wonders/machu-picchu';
import { angkorWat } from './wonders/angkor-wat';
import { forbiddenCity } from './wonders/forbidden-city';
import { eiffelTower } from './wonders/eiffel-tower';
import { sydneyOperaHouse } from './wonders/sydney-opera-house';

/** The canonical catalog — Spec 01. Gallery order is chronological On site / In production. */
export const WONDERS: Wonder[] = [
  pyramidsOfGiza,
  stonehenge,
  petra,
  colosseum,
  chichenItza,
  machuPicchu,
  angkorWat,
  forbiddenCity,
  eiffelTower,
  sydneyOperaHouse,
];

const READY_IDS = new Set([
  'pyramids-of-giza',
  'stonehenge',
  'colosseum',
  'eiffel-tower',
  'sydney-opera-house',
]);

function byCompletedYear(a: Wonder, b: Wonder): number {
  return a.completedYear - b.completedYear;
}

export function isReadyWonder(id: string): boolean {
  return READY_IDS.has(id);
}

export function catalogReady(): Wonder[] {
  return WONDERS.filter((w) => READY_IDS.has(w.id)).sort(byCompletedYear);
}

export function catalogInProgress(): Wonder[] {
  return WONDERS.filter((w) => !READY_IDS.has(w.id)).sort(byCompletedYear);
}

export function getWonder(id: string): Wonder {
  const w = WONDERS.find((w) => w.id === id);
  if (!w) throw new Error(`Unknown wonder id: ${id}`);
  return w;
}

export type { Wonder } from './types';
