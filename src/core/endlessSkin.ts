import type { Letter } from '../config/questions';
import { PLAYER_BASE_COLOR, playerColorFor } from './playerColor';
import { getEndlessProfile } from './endlessProfile';

/** Jelly body color for endless: last classic TYPE mix, else base white. */
export function endlessSkinColor(): number {
  const type = getEndlessProfile().lastSkinType;
  if (!type || type.length !== 4) return PLAYER_BASE_COLOR;
  try {
    return playerColorFor(type.split('') as Letter[]);
  } catch {
    return PLAYER_BASE_COLOR;
  }
}
