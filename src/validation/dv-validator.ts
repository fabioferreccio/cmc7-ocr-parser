/**
 * Validates CMC-7 check digits using Modulo 10 and Modulo 11 algorithms.
 *
 * @remarks
 * Coverage requirement: 100% line coverage (docs/05-regras.md §3.4).
 * This is deterministic financial logic — no untested branches acceptable.
 *
 * Implemented in T-015.
 */

/**
 * Calculates the Modulo 10 check digit.
 * Alternating weights 2 and 1, right to left; digit-sum of products.
 *
 * @param digits - Digit string WITHOUT the check digit
 * @returns Expected check digit (0–9)
 */
export function mod10(_digits: string): number {
  // TODO (T-015): Implement — write tests first
  throw new Error('Not yet implemented. See docs/04-tasks.md T-015.');
}

/**
 * Calculates the Modulo 11 check digit.
 *
 * @param digits - Digit string WITHOUT the check digit
 * @param weights - Cycle of weights applied right-to-left. Default: [2,3,4,5,6,7]
 * @returns Expected check digit (0–9) or `'X'` when remainder is 1
 */
export function mod11(_digits: string, _weights?: number[]): number | 'X' {
  // TODO (T-015): Implement — write tests first
  throw new Error('Not yet implemented. See docs/04-tasks.md T-015.');
}
