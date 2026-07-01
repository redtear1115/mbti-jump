import { describe, it, expect } from 'vitest';
import { ScoreTracker } from './ScoreTracker';

describe('ScoreTracker', () => {
  it('locks the majority letter for a level', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.recordAnswer('E');
    s.recordAnswer('I');
    expect(s.completeLevel('EI')).toBe('E');
  });

  it('breaks an even tie by player side: left → first letter', () => {
    // 玩家跳過題目 → 偶數題作答可能平手；靠左(Yes側)取第一字母
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.recordAnswer('I'); // 1-1
    expect(s.completeLevel('EI', 'first')).toBe('E');
  });

  it('breaks an even tie by player side: right → second letter', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.recordAnswer('I'); // 1-1
    expect(s.completeLevel('EI', 'second')).toBe('I');
  });

  it('does not let tieBreak override a real majority', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.recordAnswer('E');
    s.recordAnswer('I'); // 2-1, E wins regardless of tieBreak
    expect(s.completeLevel('EI', 'second')).toBe('E');
  });

  it('resolves a fully-skipped level deterministically (no soft-lock)', () => {
    const s = new ScoreTracker();
    expect(s.completeLevel('SN')).toBe('S'); // 0-0, default first
  });

  it('clears current counts after completing a level', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.completeLevel('EI');
    // 下一關不應殘留上一關的累計
    s.recordAnswer('N');
    s.recordAnswer('N');
    s.recordAnswer('S');
    expect(s.completeLevel('SN')).toBe('N');
  });

  it('resetCurrentLevel discards in-progress counts but keeps locked letters', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E');
    s.completeLevel('EI'); // 鎖定 E
    s.recordAnswer('S'); // 第二關進行中…死亡
    s.resetCurrentLevel();
    s.recordAnswer('N');
    s.recordAnswer('N');
    s.recordAnswer('S');
    s.completeLevel('SN'); // 鎖定 N
    s.recordAnswer('T');
    s.completeLevel('TF');
    s.recordAnswer('J');
    s.completeLevel('JP');
    expect(s.result()).toBe('ENTJ');
  });

  it('isComplete reflects all four dimensions locked', () => {
    const s = new ScoreTracker();
    expect(s.isComplete()).toBe(false);
    s.recordAnswer('I'); s.completeLevel('EI');
    s.recordAnswer('S'); s.completeLevel('SN');
    s.recordAnswer('F'); s.completeLevel('TF');
    expect(s.isComplete()).toBe(false);
    s.recordAnswer('P'); s.completeLevel('JP');
    expect(s.isComplete()).toBe(true);
    expect(s.result()).toBe('ISFP');
  });

  it('result throws if not complete', () => {
    const s = new ScoreTracker();
    expect(() => s.result()).toThrow();
  });

  it('tallyFor reports live counts for the current level, in [first, second] order', () => {
    const s = new ScoreTracker();
    expect(s.tallyFor('EI')).toEqual([0, 0]);
    s.recordAnswer('E');
    s.recordAnswer('E');
    s.recordAnswer('I');
    expect(s.tallyFor('EI')).toEqual([2, 1]);
    s.completeLevel('EI');
    expect(s.tallyFor('SN')).toEqual([0, 0]); // resets with the new level
  });

  it('lockedCount tracks how many dimensions are locked (resume cursor)', () => {
    const s = new ScoreTracker();
    expect(s.lockedCount()).toBe(0);
    s.recordAnswer('E'); s.completeLevel('EI');
    expect(s.lockedCount()).toBe(1);
    s.recordAnswer('S'); s.completeLevel('SN');
    expect(s.lockedCount()).toBe(2);
  });

  it('allTallies records each dimension\'s counts at lock time', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E'); s.recordAnswer('E'); s.recordAnswer('I'); s.completeLevel('EI'); // EI 2:1
    s.recordAnswer('N'); s.recordAnswer('N'); s.completeLevel('SN'); // SN S0:N2
    const all = s.allTallies();
    expect(all.EI).toEqual([2, 1]);
    expect(all.SN).toEqual([0, 2]);
    expect(all.TF).toEqual([0, 0]); // 未鎖定 → [0,0]
    expect(all.JP).toEqual([0, 0]);
  });

  it('allTallies keeps locked dimensions after resetCurrentLevel', () => {
    const s = new ScoreTracker();
    s.recordAnswer('E'); s.completeLevel('EI'); // 鎖定 EI 1:0
    s.recordAnswer('S'); s.resetCurrentLevel(); // 進行中死亡重來
    expect(s.allTallies().EI).toEqual([1, 0]); // 已鎖定的不受影響
    expect(s.allTallies().SN).toEqual([0, 0]);
  });
});
