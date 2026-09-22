/** First-run onboarding: left = Yes, right = No. Persist so it never blocks again. */

export const TUTORIAL_KEY = 'mbti-jump.tutorial.v1';
export const TUTORIAL_DONE = '1';

/** Pure: show tutorial unless the stored flag marks it done. */
export function shouldShowTutorial(flag: string | null | undefined): boolean {
  return flag !== TUTORIAL_DONE && flag !== 'true' && flag !== 'done';
}

export function readTutorialFlag(): string | null {
  try {
    return (globalThis as any).localStorage?.getItem(TUTORIAL_KEY) ?? null;
  } catch {
    return null;
  }
}

export function markTutorialDone(): void {
  try {
    (globalThis as any).localStorage?.setItem(TUTORIAL_KEY, TUTORIAL_DONE);
  } catch {
    /* localStorage 不可用時略過 */
  }
}
