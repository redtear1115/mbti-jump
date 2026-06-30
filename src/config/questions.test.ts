import { describe, it, expect } from 'vitest';
import {
  QUESTIONS,
  DIMENSIONS,
  LETTERS_OF,
  questionsForDimension,
} from './questions';

describe('questions data integrity', () => {
  it('has exactly 5 questions per dimension', () => {
    for (const d of DIMENSIONS) {
      expect(questionsForDimension(d)).toHaveLength(5);
    }
  });

  it('every choice side belongs to its dimension letter pair', () => {
    for (const q of QUESTIONS) {
      const pair = LETTERS_OF[q.dimension];
      expect(pair).toContain(q.yes.side);
      expect(pair).toContain(q.no.side);
      expect(q.yes.side).not.toBe(q.no.side);
    }
  });

  it('every question has non-empty text and labels', () => {
    for (const q of QUESTIONS) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.yes.label.length).toBeGreaterThan(0);
      expect(q.no.label.length).toBeGreaterThan(0);
    }
  });
});
