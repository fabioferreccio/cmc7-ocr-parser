import type { CMC7Reader, CMC7ReaderOptions } from './types/index.js';

/**
 * Creates and initializes a CMC-7 reader instance.
 *
 * @param options - Optional configuration. See {@link CMC7ReaderOptions}.
 * @returns Promise resolving to a ready-to-use {@link CMC7Reader}.
 * @throws {@link CMC7InitError} If WebAssembly is not supported.
 *
 * @example
 * ```typescript
 * const reader = await createCMC7Reader({ recognitionMode: 'template' });
 * reader.on('result', (result) => console.log(result.fields.bankCode));
 * await reader.start(videoElement);
 * // ...later:
 * await reader.stop();
 * ```
 */
export async function createCMC7Reader(
  _options?: CMC7ReaderOptions,
): Promise<CMC7Reader> {
  // TODO (T-019): Implement full reader lifecycle
  // This is a placeholder shell — implementation begins in Milestone 6
  throw new Error('Not yet implemented. See docs/04-tasks.md T-019.');
}
