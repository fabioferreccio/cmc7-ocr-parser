import type { BankSpec } from '../types/index.js';

/**
 * Registry of CMC-7 parsing specifications per Brazilian bank (COMPE code).
 *
 * @remarks
 * [PROVISÓRIA] Initial coverage: 5 largest banks by check volume.
 * Full spec availability depends on FEBRABAN/SBC manual (Premissa P-05 do PRD).
 * Consumers can extend via {@link BankRegistry.register}.
 *
 * Implemented in T-016.
 */
export class BankRegistry {
  private readonly specs: Map<string, BankSpec> = new Map();

  constructor() {
    // Populate with validated specs for BB, CEF, Bradesco, Itaú, Santander

    this.register({
      compeCode: '001',
      name: 'Banco do Brasil',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 8, checkNumDigits: 6 },
    });

    this.register({
      compeCode: '104',
      name: 'Caixa Econômica Federal',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 9, checkNumDigits: 6 },
    });

    this.register({
      compeCode: '237',
      name: 'Bradesco',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 7, checkNumDigits: 6 },
    });

    this.register({
      compeCode: '341',
      name: 'Itaú',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 5, checkNumDigits: 6 },
    });

    this.register({
      compeCode: '033',
      name: 'Santander',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 8, checkNumDigits: 6 },
    });
  }

  /**
   * Returns the spec for the given COMPE bank code.
   * @returns `null` if bank is not registered (emits 'bank-spec-unknown' warning upstream)
   */
  getSpec(compeCode: string): BankSpec | null {
    return this.specs.get(compeCode) || null;
  }

  /**
   * Registers or replaces a bank specification.
   * Allows consumers to add banks not included in the built-in registry.
   *
   * @example
   * ```typescript
   * reader.registerBank({ compeCode: '999', name: 'My Bank', ... });
   * ```
   */
  register(spec: BankSpec): void {
    this.specs.set(spec.compeCode, spec);
  }
}
