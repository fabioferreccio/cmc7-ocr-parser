/**
 * React hook for CMC-7 reader.
 * Exported via subpath export `cmc7-ocr-parser/react` (docs/03-arquitetura.md §5.3).
 *
 * @remarks
 * Handles React.StrictMode double-mount (T-024 test requirement).
 * NOT included in the main bundle — consumers who don't use React pay zero cost.
 *
 * Implemented in T-024.
 */

// TODO (T-024): Implement useCMC7Reader hook
// Requires: react as peerDependency (already listed in package.json)

export function useCMC7Reader(): never {
  throw new Error('React hook not yet implemented. See docs/04-tasks.md T-024.');
}
