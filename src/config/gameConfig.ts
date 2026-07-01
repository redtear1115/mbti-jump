/** 全域可調參數。所有座標以邏輯畫布 450×800 為準。 */
export const GAME = {
  width: 450,
  height: 800,

  // 物理
  gravityY: 1150,
  jumpVelocity: -780, // 觸碰平台時的向上彈跳速度
  playerMaxSpeedX: 380, // 水平最大速度（px/s）

  // 平台
  platformWidth: 90, // 材質基準寬 + 題目分叉（Yes/No）固定寬
  // 普通平台寬度隨機（有長有短）：短易錯過、長好踩，平均比 90 寬 → 整體更好踩。
  platformWidthMin: 70,
  platformWidthMax: 160,
  platformHeight: 18,
  platformGapY: 105, // 相鄰平台垂直間距
  // 每隔幾個普通平台插入一組題目分叉。畫面高 800 / 平台間距 130 ≈ 6 平台/螢幕，
  // 取 12 → 分叉間隔約 (12+1)*130 = 1690px ≈ 2.1 個螢幕，避免連續答題。
  questionGapForks: 12,

  // 題目分叉
  forkLeftX: 110, // Yes 台階中心 x
  forkRightX: 340, // No 台階中心 x

  // 關卡
  questionsPerLevel: 5,

  // 操控（傾斜）
  tiltDeadZoneDeg: 3, // 小於此角度視為不動
  tiltMaxDeg: 30, // 達此角度即最大速度

  // 掉落判定：玩家低於「相機底部 + 此緩衝」即死亡
  fallMargin: 60,
} as const;
