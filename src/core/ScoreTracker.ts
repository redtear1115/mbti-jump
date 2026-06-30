import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import type { Dimension, Letter } from '../config/questions';

function freshCounts(): Record<Letter, number> {
  return { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
}

export class ScoreTracker {
  private locked = new Map<Dimension, Letter>();
  private current: Record<Letter, number> = freshCounts();

  recordAnswer(side: Letter): void {
    this.current[side] += 1;
  }

  /**
   * 依當前關累計鎖定維度字母。
   * 平手機制：玩家可能跳過題目，使某關只答了偶數題而平手（甚至 0 題）。
   * 規則 = 平手時取維度配對的第一字母（E/S/T/J）。`>=` 即實作此規則，
   * 確保任何答題數都能得到確定的字母、永不卡關。
   */
  completeLevel(d: Dimension): Letter {
    const [a, b] = LETTERS_OF[d];
    const letter = this.current[a] >= this.current[b] ? a : b;
    this.locked.set(d, letter);
    this.current = freshCounts();
    return letter;
  }

  resetCurrentLevel(): void {
    this.current = freshCounts();
  }

  isComplete(): boolean {
    return this.locked.size === DIMENSIONS.length;
  }

  result(): string {
    if (!this.isComplete()) {
      throw new Error('ScoreTracker.result() called before all dimensions locked');
    }
    return DIMENSIONS.map((d) => this.locked.get(d)!).join('');
  }
}
