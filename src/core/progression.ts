/**
 * 無縫爬塔的「跳題保險」判斷（純函式，可單元測試）。
 *
 * 當本維度所有題目分叉都已生成（`nextQuestionIdx >= totalQuestions`），
 * 且玩家已明顯爬過最後一題分叉（高於 `lastForkY` 達 0.75 個螢幕高，y 往上為遞減）時，
 * 就以目前已記錄的答案鎖定本維度，避免玩家跳過題目後無限往上卡關。
 */
export const AUTO_COMPLETE_SCREENS = 0.75;

export function shouldAutoComplete(
  nextQuestionIdx: number,
  totalQuestions: number,
  playerY: number,
  lastForkY: number,
  screenHeight: number,
): boolean {
  if (nextQuestionIdx < totalQuestions) return false;
  return playerY < lastForkY - screenHeight * AUTO_COMPLETE_SCREENS;
}
