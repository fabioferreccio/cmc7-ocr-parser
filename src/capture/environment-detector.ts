import type { EnvironmentInfo } from '../types/index.js';

/**
 * Detects the current browser environment to determine camera availability.
 *
 * @remarks
 * Key detection: iOS + non-Safari = WKWebView = no camera access.
 * See docs/03-arquitetura.md §1.1 and docs/02-prd.md RNF-002.
 *
 * @returns {@link EnvironmentInfo} describing the current environment.
 */
export function detectEnvironment(): EnvironmentInfo {
  // TODO (T-005): Implement full detection logic
  // This shell exists to define the contract for T-005 tests
  throw new Error('Not yet implemented. See docs/04-tasks.md T-005.');
}
