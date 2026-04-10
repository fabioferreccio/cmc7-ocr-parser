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
  // private readonly specs: Map<string, BankSpec> = new Map();

  constructor() {
    // TODO (T-016): Populate with validated specs for BB, CEF, Bradesco, Itaú, Santander
  }

  /**
   * Returns the spec for the given COMPE bank code.
   * @returns `null` if bank is not registered (emits 'bank-spec-unknown' warning upstream)
   */
  getSpec(_compeCode: string): BankSpec | null {
    // TODO (T-016): Implement lookup
    throw new Error('Not yet implemented. See docs/04-tasks.md T-016.');
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
  register(_spec: BankSpec): void {
    // TODO (T-016): this.specs.set(spec.compeCode, spec)
    throw new Error('Not yet implemented. See docs/04-tasks.md T-016.');
  }
}
