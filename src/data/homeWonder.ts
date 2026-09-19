/** Homepage ambient diorama is Giza (Spec 05). */

export const HOME_WONDER_ID = 'pyramids-of-giza';

export function homeWonderId(readyIds: readonly string[]): string {
  if (readyIds.includes(HOME_WONDER_ID)) return HOME_WONDER_ID;
  if (readyIds.length === 0) throw new Error('No playable wonders for the homepage');
  return readyIds[0]!;
}
