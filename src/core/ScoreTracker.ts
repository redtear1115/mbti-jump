import { DIMENSIONS, LETTERS_OF } from '../config/questions';
import type { Dimension, Letter } from '../config/questions';

function freshCounts(): Record<Letter, number> {
  return { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
}

export class ScoreTracker {
  private locked = new Map<Dimension, Letter>();
  private current: Record<Letter, number> = freshCounts();
  private lockedTallies = new Map<Dimension, [number, number]>();

  recordAnswer(side: Letter): void {
    this.current[side] += 1;
  }

  /**
   * 依當前關累計鎖定維度字母。
   * 平手機制：玩家可能跳過題目，使某關只答了偶數題而平手（甚至 0 題）。
   * 平手時改由玩家當下「比較靠左還是靠右」決定：
   *   tieBreak 'first'  = 靠左（Yes 側）→ 取維度第一字母（E/S/T/J）
   *   tieBreak 'second' = 靠右（No 側）→ 取維度第二字母（I/N/F/P）
   * 非平手時 tieBreak 無作用。預設 'first' 以維持確定性。
   */
  completeLevel(d: Dimension, tieBreak: 'first' | 'second' = 'first'): Letter {
    const [a, b] = LETTERS_OF[d];
    let letter: Letter;
    if (this.current[a] > this.current[b]) {
      letter = a;
    } else if (this.current[b] > this.current[a]) {
      letter = b;
    } else {
      letter = tieBreak === 'second' ? b : a;
    }
    this.locked.set(d, letter);
    this.lockedTallies.set(d, [this.current[a], this.current[b]]);
    this.current = freshCounts();
    return letter;
  }

  resetCurrentLevel(): void {
    this.current = freshCounts();
  }

  /** 各維度鎖定當下的 [first, second]；未鎖定的維度回 [0, 0]。 */
  allTallies(): Record<Dimension, [number, number]> {
    const out = {} as Record<Dimension, [number, number]>;
    for (const d of DIMENSIONS) out[d] = this.lockedTallies.get(d) ?? [0, 0];
    return out;
  }

  /** 目前維度已鎖定的數量（0..4）；用來在無縫爬塔中推導現在爬到第幾個維度。 */
  lockedCount(): number {
    return this.locked.size;
  }

  /** 當前關某維度兩側的即時票數 [第一字母, 第二字母]，供 HUD 顯示目前取向。 */
  tallyFor(d: Dimension): [number, number] {
    const [a, b] = LETTERS_OF[d];
    return [this.current[a], this.current[b]];
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
