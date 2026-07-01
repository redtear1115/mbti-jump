import { PALETTE } from '../theme/palette';

export type Group = 'explorer' | 'diplomat' | 'analyst' | 'sentinel';

export const GROUP_COLORS: Record<Group, number> = {
  explorer: PALETTE.explorer,
  diplomat: PALETTE.diplomat,
  analyst: PALETTE.analyst,
  sentinel: PALETTE.sentinel,
};

const VALID = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

/** 4 碼人格 → 族群。type[1]=S/N、type[2]=T/F、type[3]=J/P。 */
export function groupOf(type: string): Group {
  const l = type.split('');
  if (l.length !== 4 || !l.every((c) => VALID.has(c))) {
    throw new Error(`Invalid MBTI type: ${type}`);
  }
  if (l[1] === 'N') return l[2] === 'F' ? 'diplomat' : 'analyst';
  return l[3] === 'J' ? 'sentinel' : 'explorer';
}

export function colorOf(group: Group): number {
  return GROUP_COLORS[group];
}

export function groupColorOf(type: string): number {
  return colorOf(groupOf(type));
}
