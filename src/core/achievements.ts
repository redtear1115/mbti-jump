import type { PlayRecord } from './profile';
import { groupOf } from './temperament';
import { DIMENSIONS } from '../config/questions';

export interface Achievement {
  id: string;
  check: (plays: readonly PlayRecord[]) => boolean;
  /** 可計數成就的進度（current 以 target 封頂）；事件型成就（decisive/torn）不提供。 */
  progress?: (plays: readonly PlayRecord[]) => { current: number; target: number };
}

function distinctTypes(plays: readonly PlayRecord[]): Set<string> {
  return new Set(plays.map((p) => p.type));
}

function distinctGroups(plays: readonly PlayRecord[]): Set<string> {
  return new Set(plays.map((p) => groupOf(p.type)));
}

function maxSameTypeCount(plays: readonly PlayRecord[]): number {
  const counts = new Map<string, number>();
  let max = 0;
  for (const p of plays) {
    const c = (counts.get(p.type) ?? 0) + 1;
    counts.set(p.type, c);
    if (c > max) max = c;
  }
  return max;
}

const capped = (current: number, target: number) => ({ current: Math.min(current, target), target });

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
  { id: 'first_play', check: (p) => p.length >= 1, progress: (p) => capped(p.length, 1) },
  { id: 'persistent', check: (p) => p.length >= 10, progress: (p) => capped(p.length, 10) },
  { id: 'dedicated', check: (p) => p.length >= 25, progress: (p) => capped(p.length, 25) },
  { id: 'collector', check: (p) => distinctTypes(p).size >= 16, progress: (p) => capped(distinctTypes(p).size, 16) },
  { id: 'four_realms', check: (p) => distinctGroups(p).size >= 4, progress: (p) => capped(distinctGroups(p).size, 4) },
  { id: 'decisive', check: (p) => anyDimension(p, (a, b) => (a === 5 && b === 0) || (a === 0 && b === 5)) },
  { id: 'torn', check: (p) => anyDimension(p, (a, b) => a + b === 5 && Math.abs(a - b) === 1) },
  { id: 'creature_of_habit', check: (p) => maxSameTypeCount(p) >= 3, progress: (p) => capped(maxSameTypeCount(p), 3) },
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
