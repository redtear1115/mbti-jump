import { describe, it, expect } from 'vitest';
import { hex, tintToward } from './draw';

describe('hex', () => {
  it('formats 24-bit color as css hex', () => {
    expect(hex(0x33a474)).toBe('#33a474');
    expect(hex(0x000012)).toBe('#000012');
  });
});

describe('tintToward', () => {
  it('amount 0 keeps color, amount 1 reaches white', () => {
    expect(tintToward(0x000000, 0)).toBe('rgb(0,0,0)');
    expect(tintToward(0x000000, 1)).toBe('rgb(255,255,255)');
  });
});
