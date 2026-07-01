import type { PlayRecord } from './profile';
import { groupOf } from './temperament';
import { DIMENSIONS } from '../config/questions';

export interface Achievement {
  id: string;
  check: (plays: readonly PlayRecord[]) => boolean;
}

function distinctTypes(plays: readonly PlayRecord[]): Set<string> {
  return new Set(plays.map((p) => p.type));
}

/** 是否有任一場的任一維度 tally 符合 pred(first, second)。 */
function anyDimension(
  plays: readonly PlayRecord[],
  pred: (first: number, second: number) => boolean,
): boolean {
  for (const p of plays) {
    for (const d of DIMENSIONS) {
      const tt = p.tallies[d];
      if (tt && pred(tt[0], tt[1])) return true;
    }
  }
  return false;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', check: (p) => p.length >= 1 },
  { id: 'persistent', check: (p) => p.length >= 10 },
  { id: 'dedicated', check: (p) => p.length >= 25 },
  { id: 'collector', check: (p) => distinctTypes(p).size >= 16 },
  {
    id: 'four_realms',
    check: (p) => {
      const groups = new Set<string>();
      for (const play of p) groups.add(groupOf(play.type));
      return groups.size >= 4;
    },
  },
  { id: 'decisive', check: (p) => anyDimension(p, (a, b) => (a === 5 && b === 0) || (a === 0 && b === 5)) },
  { id: 'torn', check: (p) => anyDimension(p, (a, b) => a + b === 5 && Math.abs(a - b) === 1) },
  {
    id: 'creature_of_habit',
    check: (p) => {
      const counts = new Map<string, number>();
      for (const play of p) {
        const c = (counts.get(play.type) ?? 0) + 1;
        counts.set(play.type, c);
        if (c >= 3) return true;
      }
      return false;
    },
  },
];

export function unlockedIds(plays: readonly PlayRecord[]): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.check(plays)).map((a) => a.id));
}

/** 目前已解鎖但不在 seen 者，依 ACHIEVEMENTS 順序回傳。 */
export function newlyUnlocked(plays: readonly PlayRecord[], seen: readonly string[]): string[] {
  const seenSet = new Set(seen);
  const unlocked = unlockedIds(plays);
  return ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && !seenSet.has(a.id)).map((a) => a.id);
}
