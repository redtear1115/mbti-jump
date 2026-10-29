import type { Letter } from '../config/questions';

/** 語意色票。數字色供 Phaser Graphics/背景；字串色供 Text style。 */
export const PALETTE = {
  // 16Personalities 四族群色（基底）
  explorer: 0xe4ae3a, // SP 探險家 黃
  diplomat: 0x33a474, // NF 外交官 綠
  analyst: 0x88619a, // NT 分析師 紫
  sentinel: 0x4298b4, // SJ 守護者 藍

  surface: 0x1a1c2c,
  surfaceAlt: 0x2a2d42,
  yes: 0x38b764, // 綠 = Yes 台階
  no: 0xb13e53, // 紅 = No 台階
  accent: 0xffcc00,

  textOn: '#0f1220', // 亮底上的深字（按鈕）
  textLight: '#ffffff',
  textMuted: '#ffffffaa',
} as const;

/** 四章紙色（校園／心動／雨／祭典）。僅美術，不對應字母語意。 */
export const LEVEL_BG: readonly [number, number, number, number] = [
  0xf7f1df, 0xfbe7ef, 0xe5eef6, 0xf3e6fa,
];

/** 八字母語意色（由四族群原色混出，brainstorm 方案 B）。供答案台階、得分條、分享卡沿用。 */
export const LETTER_COLORS: Record<Letter, number> = {
  E: 0xf0b84a, I: 0x2e6d86, // 外向暖黃 / 內向深藍
  S: 0x8fb14a, N: 0x6e79b0, // 務實黃綠 / 抽象紫藍
  T: 0x8a5fa0, F: 0x33a474, // 邏輯紫 / 和諧綠
  J: 0x3a9a9a, P: 0xe09a3a, // 秩序青 / 隨性橙
};

/** 字母色的 CSS 字串版，供 Phaser Text style 使用。 */
export function letterHex(letter: Letter): string {
  return '#' + LETTER_COLORS[letter].toString(16).padStart(6, '0');
}
