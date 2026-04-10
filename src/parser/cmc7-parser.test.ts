import { describe, it, expect } from 'vitest';
import { CMC7Parser } from './cmc7-parser.js';
import { BankRegistry } from '../validation/bank-registry.js';

// CMC-7 symbols (Unicode)
const SYM = {
  START: '\u2446',  // ⑆
  SEP1:  '\u2446',  // ⑆ (second occurrence)
  SEP2:  '\u2447',  // ⑇
  SEP3:  '\u2448',  // ⑈
  SEP4:  '\u2449',  // ⑉
  END:   '\u244A',  // ⑊
};

// Structurally valid synthetic CMC-7 string following the FEBRABAN grammar:
// ⑆ Block1 ⑆ Block2 ⑇ N ⑈ Block3 ⑉ Block4 ⑊
// BB (001): bankCode(3) + agency(4) + account(8) + checkNum(6) + DV(1) = 22 digits in Block1
const BB_BLOCK1  = '0010002' + '00000001' + '000001' + '5'; // 3+4+8+6+1 = 22  (simplified, DV not validated here)
const GENERIC_B2 = '0000001000' + '0';                       // 10 + DV
const GENERIC_N  = '1';
const GENERIC_B3 = '0010000000' + '0';
const GENERIC_B4 = '0001023456' + '7';

const VALID_BB_RAW =
  SYM.START + BB_BLOCK1 + SYM.SEP1 + GENERIC_B2 + SYM.SEP2 + GENERIC_N +
  SYM.SEP3 + GENERIC_B3 + SYM.SEP4 + GENERIC_B4 + SYM.END;

// Bradesco (237): bankCode(3) + agency(4) + account(7) + checkNum(6) + DV(1) = 21 digits
const BRAD_BLOCK1 = '2370001' + '0000001' + '000001' + '9'; // 3+4+7+6+1 = 21
const VALID_BRAD_RAW =
  SYM.START + BRAD_BLOCK1 + SYM.SEP1 + GENERIC_B2 + SYM.SEP2 + GENERIC_N +
  SYM.SEP3 + GENERIC_B3 + SYM.SEP4 + GENERIC_B4 + SYM.END;

describe('CMC7Parser', () => {
  const registry = new BankRegistry();
  const parser = new CMC7Parser(registry);

  it('deve identificar os 5 símbolos delimitadores em string válida', () => {
    const result = parser.parse(VALID_BB_RAW);
    expect(result.rawString).toBe(VALID_BB_RAW);
    expect(result.success).toBe(true);
  });

  it('deve retornar INVALID_STRUCTURE se a contagem de símbolos for incorreta', () => {
    // Missing the ⑊ end symbol
    const broken = SYM.START + BB_BLOCK1 + SYM.SEP1 + GENERIC_B2;
    const result = parser.parse(broken);
    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_STRUCTURE');
    expect(result.rawString).toBe(broken);
  });

  it('deve extrair bankCode dos 3 primeiros dígitos após ⑆', () => {
    const result = parser.parse(VALID_BB_RAW);
    expect(result.success).toBe(true);
    expect(result.fields?.bankCode).toBe('001');
  });

  it('deve usar BankRegistry para determinar layout correto do Block1', () => {
    const result = parser.parse(VALID_BB_RAW);
    expect(result.success).toBe(true);
    // BB spec has accountDigits = 8
    expect(result.fields?.account).toHaveLength(8);
  });

  it('deve retornar parseWarning "bank-spec-unknown" para banco desconhecido', () => {
    // Use an unknown bank code: 999
    const UNKNOWN_B1 = '9990001' + '00000001' + '000001' + '5';
    const unknownRaw =
      SYM.START + UNKNOWN_B1 + SYM.SEP1 + GENERIC_B2 + SYM.SEP2 + GENERIC_N +
      SYM.SEP3 + GENERIC_B3 + SYM.SEP4 + GENERIC_B4 + SYM.END;
    const result = parser.parse(unknownRaw);
    expect(result.success).toBe(true); // still parses generically
    expect(result.warning).toBe('bank-spec-unknown');
    expect(result.fields?.bankCode).toBe('999');
  });

  it('deve fazer parse do Block1 corretamente para Banco do Brasil (001)', () => {
    const result = parser.parse(VALID_BB_RAW);
    expect(result.success).toBe(true);
    expect(result.fields?.bankCode).toBe('001');
    expect(result.fields?.agency).toHaveLength(4);    // BB: agencyDigits = 4
    expect(result.fields?.account).toHaveLength(8);   // BB: accountDigits = 8
    expect(result.fields?.checkNum).toHaveLength(6);  // checkNumDigits = 6
  });

  it('deve fazer parse do Block1 corretamente para Bradesco (237)', () => {
    const result = parser.parse(VALID_BRAD_RAW);
    expect(result.success).toBe(true);
    expect(result.fields?.bankCode).toBe('237');
    expect(result.fields?.agency).toHaveLength(4);    // Bradesco: agencyDigits = 4
    expect(result.fields?.account).toHaveLength(7);   // Bradesco: accountDigits = 7
    expect(result.fields?.checkNum).toHaveLength(6);
  });

  it('deve incluir rawString no resultado em todos os casos', () => {
    const result1 = parser.parse(VALID_BB_RAW);
    expect(result1.rawString).toBe(VALID_BB_RAW);

    const broken = 'not-a-cmc7-string';
    const result2 = parser.parse(broken);
    expect(result2.rawString).toBe(broken);
  });

  it('deve retornar campos null (não undefined) quando banco desconhecido', () => {
    const UNKNOWN_B1 = '9990001' + '00000001' + '000001' + '5';
    const unknownRaw =
      SYM.START + UNKNOWN_B1 + SYM.SEP1 + GENERIC_B2 + SYM.SEP2 + GENERIC_N +
      SYM.SEP3 + GENERIC_B3 + SYM.SEP4 + GENERIC_B4 + SYM.END;
    const result = parser.parse(unknownRaw);
    
    expect(result.success).toBe(true);
    // For unknown banks, agency / account / checkNum are null (not undefined)
    expect(result.fields?.agency).toBeNull();
    expect(result.fields?.account).toBeNull();
    expect(result.fields?.checkNum).toBeNull();
  });
});
