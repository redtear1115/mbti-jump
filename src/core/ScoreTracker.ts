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
   * 依當前關累計鎖定維度字母。題數為奇數時不會平手；
   * 萬一平手（非 MVP 路徑），預設取配對中的第一個字母。
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
