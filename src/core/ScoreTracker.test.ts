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
});
