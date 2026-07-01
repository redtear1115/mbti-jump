import type { QuestionDef } from '../config/questions';

/**
 * 從 pool 隨機抽 count 題（不重複、不變動 pool）。
 * 以注入的 rng()（回 [0,1)）做 Fisher-Yates 洗牌後取前 count；
 * count >= pool.length 時回全部（已洗牌）。
 */
export function pickQuestions(
  pool: readonly QuestionDef[],
  count: number,
  rng: () => number,
): QuestionDef[] {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}
