import type { CMC7Result, CMC7Validation, ParseWarning } from '../types/index.js';
import type { CMC7Parser } from './cmc7-parser.js';
import { mod10, validateField } from '../validation/dv-validator.js';

export interface ExtractionContext {
  frameQuality?: number;
  startTime?: number;
}

/**
 * Orchestrates the full Layer 3 pipeline: Parsing -> Validation -> Result Construction.
 */
export class FieldExtractor {
  constructor(private readonly parser: CMC7Parser) {}

  /**
   * Extracts structured data and performs validation on a raw CMC-7 string.
   * 
   * @param raw - Raw string from OCR.
   * @param context - Optional metadata (quality, timing).
   * @returns A complete CMC7Result.
   */
  extract(raw: string, context: ExtractionContext = {}): CMC7Result {
    const parseResult = this.parser.parse(raw);
    const endTime = Date.now();
    const processingTimeMs = context.startTime ? endTime - context.startTime : 0;

    const validation: CMC7Validation = {
      isValid: false,
      bankCodeValid: null,
      checkDigitsValid: 'unknown',
      errors: [],
    };

    const warnings: ParseWarning[] = [];
    if (parseResult.warning) {
      warnings.push(parseResult.warning);
    }

    if (!parseResult.success) {
      return {
        raw,
        fields: {
          bankCode: null,
          agency: null,
          account: null,
          checkNumber: null,
          symbolPositions: this.getEmptySymbolPositions(),
          parseWarnings: ['partial-parse'],
        },
        validation,
        frameQuality: context.frameQuality ?? 0,
        processingTimeMs,
      };
    }

    // Structure found, now validate blocks
    // ⑆ block1 ⑆ block2 ⑇ N ⑈ block3 ⑉ block4 ⑊
    const blocks = this.splitBlocks(raw);
    
    // Validate Block 1 (using bank spec if available)
    if (parseResult.warning === 'bank-spec-unknown') {
      validation.bankCodeValid = null;
    } else {
      validation.bankCodeValid = true; // If we found a spec, we assume it's valid for now
      
      // Block 1 DV validation
      // BB, etc. Usually mod 10 for block 1.
      const b1Valid = validateField(blocks.b1, 'mod10');
      if (!b1Valid) {
        validation.errors.push({
          field: 'block1',
          expected: mod10(blocks.b1.slice(0, -1)),
          received: parseInt(blocks.b1.slice(-1), 10),
          algorithm: 'mod10',
        });
      }
    }

    // Blocks 2, 3, 4 are usually Mod 10 in standard FEBRABAN
    const b2Valid = validateField(blocks.b2, 'mod10');
    const b3Valid = validateField(blocks.b3, 'mod10');
    const b4Valid = validateField(blocks.b4, 'mod10');

    if (!b2Valid) this.addError(validation, 'block2', blocks.b2, 'mod10');
    if (!b3Valid) this.addError(validation, 'block3', blocks.b3, 'mod10');
    if (!b4Valid) this.addError(validation, 'block4', blocks.b4, 'mod10');

    validation.isValid = parseResult.success && validation.errors.length === 0;
    validation.checkDigitsValid = validation.errors.length === 0 ? 'valid' : 'invalid';

    return {
      raw,
      fields: {
        bankCode: parseResult.fields?.bankCode ?? null,
        agency: parseResult.fields?.agency ?? null,
        account: parseResult.fields?.account ?? null,
        checkNumber: parseResult.fields?.checkNum ?? null,
        symbolPositions: this.findSymbolPositions(raw),
        parseWarnings: warnings,
      },
      validation,
      frameQuality: context.frameQuality ?? 0,
      processingTimeMs,
    };
  }

  private splitBlocks(raw: string) {
    const s1 = '\u2446';
    const s2 = '\u2447';
    const s3 = '\u2448';
    const s4 = '\u2449';
    const s5 = '\u244A';

    const b1 = raw.slice(raw.indexOf(s1) + 1, raw.indexOf(s1, 1));
    const b2 = raw.slice(raw.indexOf(s1, 1) + 1, raw.indexOf(s2));
    const n = raw.slice(raw.indexOf(s2) + 1, raw.indexOf(s3));
    const b3 = raw.slice(raw.indexOf(s3) + 1, raw.indexOf(s4));
    const b4 = raw.slice(raw.indexOf(s4) + 1, raw.indexOf(s5));

    return { b1, b2, n, b3, b4 };
  }

  private addError(validation: CMC7Validation, field: any, block: string, algo: 'mod10' | 'mod11') {
    validation.errors.push({
      field,
      expected: algo === 'mod10' ? mod10(block.slice(0, -1)) : 0, // Simplified for now
      received: parseInt(block.slice(-1), 10),
      algorithm: algo,
    });
  }

  private findSymbolPositions(raw: string): any {
    const symbols = ['⑆', '⑇', '⑈', '⑉', '⑊'] as const;
    const unicode = { '⑆': '\u2446', '⑇': '\u2447', '⑈': '\u2448', '⑉': '\u2449', '⑊': '\u244A' };
    const res: any = {};
    for (const s of symbols) {
      res[s] = [];
      let pos = raw.indexOf(unicode[s]);
      while (pos !== -1) {
        res[s].push(pos);
        pos = raw.indexOf(unicode[s], pos + 1);
      }
    }
    return res;
  }

  private getEmptySymbolPositions() {
    return { '⑆': [], '⑇': [], '⑈': [], '⑉': [], '⑊': [] };
  }
}

