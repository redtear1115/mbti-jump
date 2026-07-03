import { describe, it, expect } from 'vitest';
import { drawOgCard, drawOgDefault, OG_W, OG_H } from './ogCard';
import { buildShareCardModel } from './shareCardModel';
import type { Dimension } from '../config/questions';

/** 記錄 fillText 呼叫的最小 2D context 替身。 */
function mockCtx() {
  const texts: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = {
    fillStyle: '' as unknown,
    font: '',
    textAlign: '',
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    fillRect: () => {},
    fillText: (s: string) => void texts.push(s),
    measureText: (s: string) => ({ width: s.length * 12 }),
    beginPath: () => {},
    moveTo: () => {},
    arcTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    rect: () => {},
    clip: () => {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

const TALLIES: Record<Dimension, [number, number]> = {
  EI: [1, 4],
  SN: [1, 4],
  TF: [1, 4],
  JP: [1, 4],
};

describe('ogCard', () => {
  it('has OG dimensions', () => {
    expect(OG_W).toBe(1200);
    expect(OG_H).toBe(630);
  });

  it('drawOgCard renders type text without throwing', () => {
    const { ctx, texts } = mockCtx();
    drawOgCard(ctx, buildShareCardModel('INFP', TALLIES, 'zh-Hant'));
    expect(texts).toContain('INFP');
  });

  it('drawOgDefault renders site name and tagline', () => {
    const { ctx, texts } = mockCtx();
    drawOgDefault(ctx, 'jump out your personality');
    expect(texts).toContain('MBTI Jump');
    expect(texts).toContain('jump out your personality');
  });
});
