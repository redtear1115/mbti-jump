import { describe, it, expect } from 'vitest';
import { EN } from './strings/en';
import { TABLES } from './t';
import { SUPPORTED_LOCALES } from './locales';
import { QUESTIONS } from '../config/questions';

const EN_KEYS = Object.keys(EN).sort();

describe('i18n completeness', () => {
  it('every locale has exactly the EN key set', () => {
    for (const loc of SUPPORTED_LOCALES) {
      const keys = Object.keys(TABLES[loc]).sort();
      expect(keys, `locale ${loc} key mismatch`).toEqual(EN_KEYS);
    }
  });

  it('every question id has text/yes/no in every locale', () => {
    for (const loc of SUPPORTED_LOCALES) {
      for (const q of QUESTIONS) {
        for (const part of ['text', 'yes', 'no'] as const) {
          const key = `q.${q.id}.${part}`;
          expect(TABLES[loc], `${loc} missing ${key}`).toHaveProperty(key);
          expect((TABLES[loc] as Record<string, string>)[key].length).toBeGreaterThan(0);
        }
      }
    }
  });
});
