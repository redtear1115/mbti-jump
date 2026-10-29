import { getPlays } from './profile';

/** Unlock gate: at least one classic play recorded. */
export function isEndlessUnlocked(): boolean {
  return getPlays().length >= 1;
}
