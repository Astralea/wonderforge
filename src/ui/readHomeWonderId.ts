import { catalogReady } from '../data';
import { homeWonderId } from '../data/homeWonder';

export const HOME_WONDER_STORAGE_KEY = 'wf-home-wonder';

/** Giza is the homepage stage. Ignore a leftover session pick such as Colosseum. */
export function readHomeWonderId(): string {
  const ready = catalogReady().map((wonder) => wonder.id);
  const id = homeWonderId(ready);
  try {
    sessionStorage.setItem(HOME_WONDER_STORAGE_KEY, id);
  } catch {
    /* ignore quota / private-mode write failures */
  }
  return id;
}
