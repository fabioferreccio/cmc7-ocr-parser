/**
 * Placeholder tests for src/ocr/templates/index.ts
 * Full tests implemented in T-012.
 */
import { describe, it, expect } from 'vitest';
import { TEMPLATES } from './index.js';
import type { CMC7Char } from './index.js';

const EXPECTED_CHARS: CMC7Char[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '\u2446',
  '\u2447',
  '\u2448',
  '\u2449',
  '\u244A',
];

describe('templates/index — structure [T-012 placeholder]', () => {
  it('has exactly 15 templates', () => {
    expect(Object.keys(TEMPLATES)).toHaveLength(15);
  });

  it('each template is a Uint8Array of 2048 bytes (32×64)', () => {
    for (const char of EXPECTED_CHARS) {
      expect(TEMPLATES[char]).toBeInstanceOf(Uint8Array);
      expect(TEMPLATES[char]!.length).toBe(32 * 64);
    }
  });

  it('has correct Unicode keys for all 5 CMC-7 symbols', () => {
    expect(TEMPLATES['\u2446']).toBeDefined(); // ⑆
    expect(TEMPLATES['\u2447']).toBeDefined(); // ⑇
    expect(TEMPLATES['\u2448']).toBeDefined(); // ⑈
    expect(TEMPLATES['\u2449']).toBeDefined(); // ⑉
    expect(TEMPLATES['\u244A']).toBeDefined(); // ⑊
  });

  it('[PROVISÓRIA] total size does not exceed 35 KB', () => {
    const totalBytes = Object.values(TEMPLATES).reduce((sum, buf) => sum + buf.length, 0);
    // NOTE: Placeholder arrays are zeros — real check after T-012
    expect(totalBytes).toBeLessThanOrEqual(35_000);
  });
});
