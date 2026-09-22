/**
 * 落地水滴飛濺：純函式產生短命液滴初速／尺寸（Phaser 場景只負責繪製與銷毀）。
 * 座標系採 Phaser（y+ 向下）；角度 -π…0 對應左→上→右，故 sin 為負＝往上噴。
 */

export interface SplashDroplet {
  /** 相對腳底的初始偏移 */
  ox: number;
  oy: number;
  /** 初速 px/s */
  vx: number;
  vy: number;
  radius: number;
  /** 存活毫秒 */
  lifeMs: number;
  /** true = 白高光液滴；false = 身體色 */
  highlight: boolean;
  alpha: number;
}

export const SPLASH_COUNT = 10;
export const SPLASH_LIFE_MS_MIN = 300;
export const SPLASH_LIFE_MS_MAX = 480;

/** 產生向外爆開的水滴參數（可注入 rng 以便單測）。 */
export function splashDroplets(
  count: number = SPLASH_COUNT,
  rng: () => number = Math.random,
): SplashDroplet[] {
  const n = Math.max(0, Math.floor(count));
  const out: SplashDroplet[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const a = -Math.PI + t * Math.PI + (rng() - 0.5) * 0.4;
    const speed = 90 + rng() * 170;
    const lifeMs = SPLASH_LIFE_MS_MIN + rng() * (SPLASH_LIFE_MS_MAX - SPLASH_LIFE_MS_MIN);
    const highlight = rng() < 0.35;
    out.push({
      ox: (rng() - 0.5) * 10,
      oy: (rng() - 0.5) * 4,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      radius: highlight ? 1.6 + rng() * 1.4 : 2.2 + rng() * 2.4,
      lifeMs,
      highlight,
      alpha: highlight ? 0.85 : 0.55 + rng() * 0.3,
    });
  }
  return out;
}

/** 依初速與壽命估計位移（給 tween 用；簡化為等速＋輕微下墜）。 */
export function splashTravel(
  d: Pick<SplashDroplet, 'vx' | 'vy' | 'lifeMs'>,
): { dx: number; dy: number } {
  const t = d.lifeMs / 1000;
  const gravity = 220; // px/s² 輕微下墜，更像水滴
  return { dx: d.vx * t, dy: d.vy * t + 0.5 * gravity * t * t };
}
