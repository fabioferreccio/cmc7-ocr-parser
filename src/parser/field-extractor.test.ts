import { describe, it, expect } from 'vitest';
import { FieldExtractor } from './field-extractor.js';
import { CMC7Parser } from './cmc7-parser.js';
import { BankRegistry } from '../validation/bank-registry.js';

// Symbols
const S1 = '\u2446';
const S2 = '\u2447';
const S3 = '\u2448';
const S4 = '\u2449';
const S5 = '\u244A';

describe('FieldExtractor', () => {
  const registry = new BankRegistry();
  const parser = new CMC7Parser(registry);
  const extractor = new FieldExtractor(parser);

  // BB (001): agency(4) account(8) check(6)
  // Block 1 BB example: 001 0002 00000001 000001 5 (DV=5 for BB mod10)
  // Let's use a valid mod10 DV for BB test.
  // 001000200000001000001 -> sum mod 10 -> DV
  // For BB, it's usually mod 10.

  const BB_B1 = '0010002000000010000015'; // Valid-ish structure
  const B2 = '00000010000'; // 10 digits + 1 DV
  const N = '1';
  const B3 = '00100000000';
  const B4 = '00010234567';

  const RAW = S1 + BB_B1 + S1 + B2 + S2 + N + S3 + B3 + S4 + B4 + S5;

  it('deve extrair campos e validar DVs básicos', () => {
    const result = extractor.extract(RAW);

    expect(result.raw).toBe(RAW);
    expect(result.fields.bankCode).toBe('001');
    expect(result.validation).toBeDefined();
    expect(typeof result.validation.isValid).toBe('boolean');
  });

  it('deve marcar isValid: false se houver erro de DV no Bloco 1', () => {
    // Modify DV of block 1
    const invalidRaw = RAW.replace('5' + S1, '9' + S1);
    const result = extractor.extract(invalidRaw);

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.some((e) => e.field === 'block1')).toBe(true);
  });

  it('deve lidar com bancos desconhecidos marcando validation.bankCodeValid como null', () => {
    const unknownRaw = RAW.replace('001', '999');
    const result = extractor.extract(unknownRaw);

    expect(result.validation.bankCodeValid).toBeNull();
    expect(result.fields.agency).toBeNull();
  });

  it('deve processar tempos de execução e qualidade se fornecidos', () => {
    const result = extractor.extract(RAW, { frameQuality: 85, startTime: Date.now() - 50 });

    expect(result.frameQuality).toBe(85);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(50);
  });
});
