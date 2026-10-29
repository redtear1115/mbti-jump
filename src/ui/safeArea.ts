/**
 * Safe-area insets for notched devices (iPhone Dynamic Island / Android cutouts).
 * Requires `viewport-fit=cover` on the meta viewport (see index.html).
 */

export type Insets = { top: number; right: number; bottom: number; left: number };

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Pure: clamp a raw inset to ≥0, then enforce a minimum pad. */
export function clampInset(raw: number, min: number): number {
  if (!Number.isFinite(raw) || raw < 0) return min;
  return Math.max(raw, min);
}

function parseCssPx(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Measure CSS `env(safe-area-inset-*)` via a throwaway probe element.
 * Returns zeros when `document` is unavailable (SSR / unit tests).
 */
export function getSafeInsets(): Insets {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return { ...ZERO };
    const probe = document.createElement('div');
    probe.setAttribute('data-safe-area-probe', '1');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);' +
      'padding-right:env(safe-area-inset-right);' +
      'padding-bottom:env(safe-area-inset-bottom);' +
      'padding-left:env(safe-area-inset-left);';
    document.documentElement.appendChild(probe);
    const cs = getComputedStyle(probe);
    const insets: Insets = {
      top: parseCssPx(cs.paddingTop),
      right: parseCssPx(cs.paddingRight),
      bottom: parseCssPx(cs.paddingBottom),
      left: parseCssPx(cs.paddingLeft),
    };
    probe.remove();
    return insets;
  } catch {
    return { ...ZERO };
  }
}

/** Per-edge pad = max(measured inset, min). Default min 12 keeps UI off the canvas edge. */
export function safePad(min = 12): Insets {
  const i = getSafeInsets();
  return {
    top: clampInset(i.top, min),
    right: clampInset(i.right, min),
    bottom: clampInset(i.bottom, min),
    left: clampInset(i.left, min),
  };
}

/**
 * Mute button center: inset pad + 14 so a 44×44 hit stays clear of the edge
 * (with min=12 → (width-26, 26), matching the pre-safe-area anchor).
 */
export function muteAnchor(canvasWidth: number, min = 12): { x: number; y: number } {
  const p = safePad(min);
  return { x: canvasWidth - p.right - 14, y: p.top + 14 };
}

/** Extra top shift beyond the default 12px min pad (0 on non-notched devices). */
export function safeTopDelta(min = 12): number {
  return Math.max(0, safePad(min).top - min);
}
