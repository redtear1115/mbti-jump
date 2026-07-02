import { describe, it, expect } from 'vitest';
import { hex, tintToward, wrapText } from './draw';

function makeMockCtx() {
  const calls: { text: string; x: number; y: number }[] = [];
  const ctx = {
    measureText: (s: string) => ({ width: [...s].length * 10 }),
    fillText: (text: string, x: number, y: number) => {
      calls.push({ text, x, y });
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('hex', () => {
  it('formats 24-bit color as css hex', () => {
    expect(hex(0x33a474)).toBe('#33a474');
    expect(hex(0x000012)).toBe('#000012');
  });
});

describe('tintToward', () => {
  it('amount 0 keeps color, amount 1 reaches white', () => {
    expect(tintToward(0x000000, 0)).toBe('rgb(0,0,0)');
    expect(tintToward(0x000000, 1)).toBe('rgb(255,255,255)');
  });
});

describe('wrapText', () => {
  it('wraps latin text at word boundaries as before', () => {
    const { ctx, calls } = makeMockCtx();
    // each char = 10px wide, maxWidth 100 → ~10 chars per line
    wrapText(ctx, 'the quick brown fox jumps over the lazy dog', 0, 0, 100, 20);
    expect(calls.length).toBeGreaterThan(1);
    for (const call of calls) {
      expect(ctx.measureText(call.text).width).toBeLessThanOrEqual(100);
    }
    // words should never be split mid-word (no line ends without a full word)
    const rejoined = calls.map((c) => c.text).join(' ');
    expect(rejoined.split(/\s+/).sort()).toEqual(
      'the quick brown fox jumps over the lazy dog'.split(/\s+/).sort(),
    );
    // y advances by lineHeight per line
    calls.forEach((c, i) => expect(c.y).toBe(i * 20));
  });

  it('wraps a CJK string with no spaces into multiple lines each fitting maxWidth', () => {
    const { ctx, calls } = makeMockCtx();
    const cjk = '你是一個外向且善於交際的人格類型喜歡與他人互動並從中獲得能量';
    wrapText(ctx, cjk, 0, 0, 100, 20);
    expect(calls.length).toBeGreaterThan(1);
    for (const call of calls) {
      expect(ctx.measureText(call.text).width).toBeLessThanOrEqual(100);
    }
    // all characters preserved in order when concatenated
    expect(calls.map((c) => c.text).join('')).toBe(cjk);
  });

  it('does not insert spaces between CJK chars when mixed with latin', () => {
    const { ctx, calls } = makeMockCtx();
    wrapText(ctx, 'MBTI Jump 玩一場跳出你的人格', 0, 0, 200, 20);
    const joined = calls.map((c) => c.text).join('');
    expect(joined).not.toMatch(/[一-鿿] [一-鿿]/);
    expect(joined.replace(/\s/g, '')).toBe('MBTIJump玩一場跳出你的人格');
  });
});
