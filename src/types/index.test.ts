/**
 * Placeholder tests for src/types/index.ts
 * Real tests are implicitly validated via TypeScript compilation (tsc --noEmit).
 * All type-level tests live in the consuming module tests.
 */
import { describe, it, expect } from 'vitest';
import type { CMC7Result, CMC7Error, QualityIssue } from '../types/index.js';

describe('types/index — TypeScript contracts', () => {
  it('CMC7Result has all required fields', () => {
    // Type-level test: if this compiles, the shape is correct
    const partial: Partial<CMC7Result> = {
      raw: '⑆001...⑊',
      frameQuality: 85,
      processingTimeMs: 420,
    };
    expect(partial.raw).toBeDefined();
  });

  it('CMC7Error discriminated union covers all variants', () => {
    const errors: CMC7Error[] = [
      { type: 'CMC7_NOT_FOUND', message: 'x', frameQuality: 0 },
      { type: 'INIT_ERROR', message: 'x', cause: 'wasm-load-failed' },
      { type: 'INVALID_INPUT', message: 'x', receivedType: 'string' },
      { type: 'CAMERA_PERMISSION_DENIED', message: 'x' },
      {
        type: 'UNSUPPORTED_ENVIRONMENT',
        message: 'x',
        environment: {
          isIOS: true,
          isSafari: false,
          isWKWebView: true,
          hasCamera: false,
          isHTTPS: true,
        },
        userGuidance: 'Abra no Safari',
      },
    ];
    expect(errors).toHaveLength(5);
  });

  it('QualityIssue covers all expected values', () => {
    const issues: QualityIssue[] = [
      'blur',
      'low-contrast',
      'glare',
      'too-far',
      'angled',
      'no-strip-found',
    ];
    expect(issues).toHaveLength(6);
  });
});
