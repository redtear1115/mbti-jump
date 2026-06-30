/** 全域可調參數。所有座標以邏輯畫布 450×800 為準。 */
export const GAME = {
  width: 450,
  height: 800,

  // 物理
  gravityY: 1400,
  jumpVelocity: -780, // 觸碰平台時的向上彈跳速度
  playerMaxSpeedX: 380, // 水平最大速度（px/s）

  // 平台
  platformWidth: 90,
  platformHeight: 18,
  platformGapY: 130, // 相鄰平台垂直間距
  questionGapForks: 2, // 每隔幾個普通平台插入一組題目分叉

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
