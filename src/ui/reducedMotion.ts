/**
 * 使用者是否偏好減少動態（無障礙）。在無 matchMedia 的環境安全回傳 false。
 */
export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}
