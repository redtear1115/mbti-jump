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

/** 四維度背景（族群色深化版，僅美術用途、非語意對應維度）。 */
export const LEVEL_BG: readonly [number, number, number, number] = [
  0x2e3a59, 0x3a2e59, 0x594a2e, 0x2e594a,
];
