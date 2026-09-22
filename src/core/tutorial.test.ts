import { describe, it, expect } from 'vitest';
import { shouldShowTutorial } from './tutorial';

describe('shouldShowTutorial', () => {
  it('shows when flag is missing or empty', () => {
    expect(shouldShowTutorial(null)).toBe(true);
    expect(shouldShowTutorial(undefined)).toBe(true);
    expect(shouldShowTutorial('')).toBe(true);
    expect(shouldShowTutorial('0')).toBe(true);
  });

  it('hides once marked done', () => {
    expect(shouldShowTutorial('1')).toBe(false);
    expect(shouldShowTutorial('true')).toBe(false);
    expect(shouldShowTutorial('done')).toBe(false);
  });
});
