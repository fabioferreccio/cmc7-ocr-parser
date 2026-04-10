import { describe, it, expect } from 'vitest';
import { FieldExtractor } from '../parser/field-extractor.js';
import { CMC7Parser } from '../parser/cmc7-parser.js';
import { BankRegistry } from '../validation/bank-registry.js';

describe('Layer 3 Integration - End-to-End Validation', () => {
  const registry = new BankRegistry();
  const parser = new CMC7Parser(registry);
  const extractor = new FieldExtractor(parser);

  // Valid BB CMC-7 string (Synthetic but mathematically correct)
  // Block 1 (BB 001): 001000200000001000001 -> DV 0
  // Block 2: 0000001000 -> DV 9
  // Block 3: 0010000000 -> DV 9
  // Block 4: 0001023456 -> DV 5
  const BB_VALID = '\u24460010002000000010000010\u244600000010009\u24471\u244800100000009\u244900010234565\u244A';

  it('deve processar string CMC-7 completa do BB e retornar CMC7Result válido', () => {
    const result = extractor.extract(BB_VALID);
    
    expect(result.validation.isValid).toBe(true);
    expect(result.fields.bankCode).toBe('001');
    expect(result.fields.agency).toBe('0002');
  });

  it('deve retornar parseWarning correto para banco desconhecido', () => {
    // 999 is unknown
    const UNKNOWN_VALID = BB_VALID.replace('001', '999');
    const result = extractor.extract(UNKNOWN_VALID);
    
    expect(result.fields.parseWarnings).toContain('bank-spec-unknown');
    expect(result.fields.bankCode).toBe('999');
    expect(result.fields.agency).toBeNull();
  });
});
