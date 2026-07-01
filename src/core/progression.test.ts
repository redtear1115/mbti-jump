import { describe, it, expect } from 'vitest';
import { shouldAutoComplete } from './progression';

const H = 800; // 螢幕高
// y 往上為遞減；lastForkY 是最後一題分叉的 y。爬過它 0.75 螢幕 => playerY < lastForkY - 600。

describe('shouldAutoComplete', () => {
  it('false while not all forks are spawned', () => {
    // 還有題目沒生成 → 不論位置都不自動過關
    expect(shouldAutoComplete(3, 5, 0, 1000, H)).toBe(false);
  });

  it('false when all spawned but player has not climbed far enough past last fork', () => {
    // 門檻 = 1000 - 600 = 400；playerY=500 尚未低於 400
    expect(shouldAutoComplete(5, 5, 500, 1000, H)).toBe(false);
  });

  it('true when all spawned and player climbed >0.75 screen past last fork', () => {
    // playerY=399 < 400 → 過關
    expect(shouldAutoComplete(5, 5, 399, 1000, H)).toBe(true);
  });

  it('is exclusive at the exact threshold', () => {
    // playerY 恰等於門檻 400，不算（需嚴格小於）
    expect(shouldAutoComplete(5, 5, 400, 1000, H)).toBe(false);
  });
});
