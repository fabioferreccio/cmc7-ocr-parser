import type { BankRegistry } from '../validation/bank-registry.js';

/** The 5 delimiter symbols used in a CMC-7 Brazilian check line. */
const S1 = '\u2446'; // ⑆ — start + inner separator
const S2 = '\u2447'; // ⑇
const S3 = '\u2448'; // ⑈
const S4 = '\u2449'; // ⑉
const S5 = '\u244A'; // ⑊ — end

export interface CMC7Fields {
  bankCode: string;
  agency: string | null;
  account: string | null;
  checkNum: string | null;
}

export interface ParseResult {
  success: boolean;
  rawString: string;
  fields?: CMC7Fields;
  error?: 'INVALID_STRUCTURE';
  warning?: 'bank-spec-unknown';
}

/**
 * Parses a raw CMC-7 string into structured banking fields.
 * Depends on BankRegistry for per-bank block layout.
 */
export class CMC7Parser {
  constructor(private readonly bankRegistry: BankRegistry) {}

  /**
   * Parses a CMC-7 raw string into structured fields.
   * Grammar: ⑆ Block1 ⑆ Block2 ⑇ N ⑈ Block3 ⑉ Block4 ⑊
   *
   * @param raw - The raw OCR string containing CMC-7 symbols and digits.
   * @returns ParseResult with structured fields or error information.
   */
  parse(raw: string): ParseResult {
    // 1. Validate structure: must contain all 5 delimiter symbols in correct order.
    //    Occurrences: ⑆ appears twice (positions 0 and 1), ⑇ once, ⑈ once, ⑉ once, ⑊ once.
    const validStructure = this.isValidStructure(raw);
    if (!validStructure) {
      return { success: false, rawString: raw, error: 'INVALID_STRUCTURE' };
    }

    // 2. Split by symbols to extract blocks.
    //    raw = ⑆ block1 ⑆ block2 ⑇ N ⑈ block3 ⑉ block4 ⑊
    //    split('⑆') → ['', block1, block2⑇N⑈block3⑉block4⑊]
    const afterFirstSym = raw.slice(S1.length); // strip leading ⑆
    const block1EndIdx = afterFirstSym.indexOf(S1);
    const block1 = afterFirstSym.slice(0, block1EndIdx);

    // 3. Extract bank code — first 3 digits of Block1
    const bankCode = block1.slice(0, 3);

    // 4. Lookup bank spec
    const spec = this.bankRegistry.getSpec(bankCode);

    if (!spec) {
      return {
        success: true,
        rawString: raw,
        warning: 'bank-spec-unknown',
        fields: {
          bankCode,
          agency: null,
          account: null,
          checkNum: null,
        },
      };
    }

    // 5. Slice Block1 using bank-specific layout
    // Block1 = bankCode(3) + agency(agencyDigits) + account(accountDigits) + checkNum(checkNumDigits) + DV(1)
    const { agencyDigits, accountDigits, checkNumDigits } = spec.block1Layout;
    let offset = 3; // skip bankCode
    const agency = block1.slice(offset, offset + agencyDigits);
    offset += agencyDigits;
    const account = block1.slice(offset, offset + accountDigits);
    offset += accountDigits;
    const checkNum = block1.slice(offset, offset + checkNumDigits);

    return {
      success: true,
      rawString: raw,
      fields: { bankCode, agency, account, checkNum },
    };
  }

  /**
   * Validates that the raw string contains the required 5 delimiters in the correct order.
   * Expected pattern: ⑆...⑆...⑇...⑈...⑉...⑊
   */
  private isValidStructure(raw: string): boolean {
    // Must start with S1 and contain each delimiter exactly the right number of times
    const countS1 = (raw.match(/\u2446/g) ?? []).length;
    const countS2 = (raw.match(/\u2447/g) ?? []).length;
    const countS3 = (raw.match(/\u2448/g) ?? []).length;
    const countS4 = (raw.match(/\u2449/g) ?? []).length;
    const countS5 = (raw.match(/\u244A/g) ?? []).length;

    if (countS1 !== 2 || countS2 !== 1 || countS3 !== 1 || countS4 !== 1 || countS5 !== 1) {
      return false;
    }

    // Check ordering: ⑆...⑆...⑇...⑈...⑉...⑊
    const idx1a = raw.indexOf(S1);
    const idx1b = raw.indexOf(S1, idx1a + 1);
    const idx2  = raw.indexOf(S2);
    const idx3  = raw.indexOf(S3);
    const idx4  = raw.indexOf(S4);
    const idx5  = raw.indexOf(S5);

    return idx1a < idx1b && idx1b < idx2 && idx2 < idx3 && idx3 < idx4 && idx4 < idx5;
  }
}

