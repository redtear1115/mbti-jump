import { GAME } from '../config/gameConfig';

/**
 * 將裝置左右傾角（DeviceOrientationEvent.gamma，單位度）映射到 [-1, 1]。
 * 負值向左、正值向右；小於死區回 0，超過最大角度裁切到 ±1。
 */
export function tiltToAxis(gamma: number): number {
  const dead = GAME.tiltDeadZoneDeg;
  const max = GAME.tiltMaxDeg;
  const sign = Math.sign(gamma);
  const mag = Math.abs(gamma);
  if (mag <= dead) return 0;
  const scaled = (mag - dead) / (max - dead);
  return sign * Math.min(1, scaled);
}
