import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, unlockedIds, newlyUnlocked } from './achievements';
import type { PlayRecord } from './profile';
import type { Dimension } from '../config/questions';

const Z: Record<Dimension, [number, number]> = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };
const mk = (type: string, tallies: Partial<Record<Dimension, [number, number]>> = {}): PlayRecord => ({ at: 1, type, tallies: { ...Z, ...tallies } });
const repeat = (rec: PlayRecord, n: number): PlayRecord[] => Array.from({ length: n }, () => rec);
const ALL16 = ['E', 'I'].flatMap((a) => ['S', 'N'].flatMap((b) => ['T', 'F'].flatMap((c) => ['J', 'P'].map((d) => `${a}${b}${c}${d}`))));

describe('achievements', () => {
  it('has exactly the 8 expected ids in order', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
      'first_play', 'persistent', 'dedicated', 'collector', 'four_realms', 'decisive', 'torn', 'creature_of_habit',
    ]);
  });

  it('play-count thresholds', () => {
    expect(unlockedIds([]).has('first_play')).toBe(false);
    expect(unlockedIds([mk('ENFP')]).has('first_play')).toBe(true);
    expect(unlockedIds(repeat(mk('ENFP'), 9)).has('persistent')).toBe(false);
    expect(unlockedIds(repeat(mk('ENFP'), 10)).has('persistent')).toBe(true);
    expect(unlockedIds(repeat(mk('ENFP'), 25)).has('dedicated')).toBe(true);
  });

  it('collector needs all 16 types', () => {
    const fifteen = ALL16.slice(0, 15).map((t) => mk(t));
    expect(unlockedIds(fifteen).has('collector')).toBe(false);
    expect(unlockedIds(ALL16.map((t) => mk(t))).has('collector')).toBe(true);
  });

  it('four_realms needs a type from each of the 4 groups', () => {
    // ESFP explorer, ENFP diplomat, ENTP analyst — only 3 groups
    const three = [mk('ESFP'), mk('ENFP'), mk('ENTP')];
    expect(unlockedIds(three).has('four_realms')).toBe(false);
    const four = [...three, mk('ESTJ')]; // sentinel
    expect(unlockedIds(four).has('four_realms')).toBe(true);
  });

  it('decisive needs a 5-0 dimension; torn needs a 3-2 dimension', () => {
    expect(unlockedIds([mk('ENFP', { EI: [4, 1] })]).has('decisive')).toBe(false);
    expect(unlockedIds([mk('ENFP', { EI: [5, 0] })]).has('decisive')).toBe(true);
    expect(unlockedIds([mk('ENFP', { EI: [0, 5] })]).has('decisive')).toBe(true);
    expect(unlockedIds([mk('ENFP', { EI: [5, 0] })]).has('torn')).toBe(false);
    expect(unlockedIds([mk('ENFP', { EI: [3, 2] })]).has('torn')).toBe(true);
  });

  it('creature_of_habit needs the same type 3 times', () => {
    expect(unlockedIds(repeat(mk('INTJ'), 2)).has('creature_of_habit')).toBe(false);
    expect(unlockedIds(repeat(mk('INTJ'), 3)).has('creature_of_habit')).toBe(true);
  });

  it('newlyUnlocked returns unlocked-but-unseen in ACHIEVEMENTS order', () => {
    const plays = repeat(mk('ENFP'), 10); // unlocks first_play + persistent + creature_of_habit
    expect(newlyUnlocked(plays, [])).toEqual(['first_play', 'persistent', 'creature_of_habit']);
    expect(newlyUnlocked(plays, ['first_play'])).toEqual(['persistent', 'creature_of_habit']);
    expect(newlyUnlocked(plays, ['first_play', 'persistent', 'creature_of_habit'])).toEqual([]);
  });
});

describe('progress', () => {
  const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const prog = (id: string, plays: PlayRecord[]) => byId.get(id)!.progress!(plays);

  it('event-based achievements have no progress', () => {
    expect(byId.get('decisive')!.progress).toBeUndefined();
    expect(byId.get('torn')!.progress).toBeUndefined();
  });

  it('play-count achievements count plays and cap at target', () => {
    expect(prog('first_play', [])).toEqual({ current: 0, target: 1 });
    expect(prog('first_play', repeat(mk('ENFP'), 3))).toEqual({ current: 1, target: 1 });
    expect(prog('persistent', repeat(mk('ENFP'), 4))).toEqual({ current: 4, target: 10 });
    expect(prog('persistent', repeat(mk('ENFP'), 12))).toEqual({ current: 10, target: 10 });
    expect(prog('dedicated', repeat(mk('ENFP'), 25))).toEqual({ current: 25, target: 25 });
  });

  it('collector counts distinct types', () => {
    expect(prog('collector', [mk('ENFP'), mk('ENFP'), mk('INTJ')])).toEqual({ current: 2, target: 16 });
    expect(prog('collector', ALL16.map((t) => mk(t)))).toEqual({ current: 16, target: 16 });
  });

  it('four_realms counts distinct groups', () => {
    // ENFP=diplomat, INTJ=analyst → 2 族群
    expect(prog('four_realms', [mk('ENFP'), mk('INTJ')])).toEqual({ current: 2, target: 4 });
    expect(prog('four_realms', [mk('ENFP'), mk('INTJ'), mk('ISTJ'), mk('ESTP')])).toEqual({ current: 4, target: 4 });
  });

  it('creature_of_habit tracks max same-type count', () => {
    expect(prog('creature_of_habit', [])).toEqual({ current: 0, target: 3 });
    expect(prog('creature_of_habit', [mk('ENFP'), mk('INTJ'), mk('ENFP')])).toEqual({ current: 2, target: 3 });
    expect(prog('creature_of_habit', repeat(mk('ENFP'), 5))).toEqual({ current: 3, target: 3 });
  });
});
