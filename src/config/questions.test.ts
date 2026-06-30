import { describe, it, expect } from 'vitest';
import { QUESTIONS, DIMENSIONS, LETTERS_OF, questionsForDimension } from './questions';

describe('questions structure', () => {
  it('has exactly 5 questions per dimension', () => {
    for (const d of DIMENSIONS) expect(questionsForDimension(d)).toHaveLength(5);
  });

  it('every side belongs to its dimension pair, yes != no', () => {
    for (const q of QUESTIONS) {
      const pair = LETTERS_OF[q.dimension];
      expect(pair).toContain(q.yes.side);
      expect(pair).toContain(q.no.side);
      expect(q.yes.side).not.toBe(q.no.side);
    }
  });

  it('yes side is the first letter of the pair (E/S/T/J), no the second', () => {
    for (const q of QUESTIONS) {
      const [first, second] = LETTERS_OF[q.dimension];
      expect(q.yes.side).toBe(first);
      expect(q.no.side).toBe(second);
    }
  });

  it('ids are unique', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
