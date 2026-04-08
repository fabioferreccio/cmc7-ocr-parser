/**
 * CMC-7 character templates stored as Uint8Array (32×64px grayscale).
 *
 * @remarks
 * DECISÃO (AD-05): Templates are stored as pre-rasterized Uint8Array, NOT as
 * the original CMC-7 TTF font. This avoids font redistribution license issues.
 * See docs/03-arquitetura.md §2.2 and docs/05-regras.md §5.2.
 *
 * Generated at build time by tools/generate-templates.py (T-012).
 * Total size: 15 chars × 32×64 × 1 byte = 30,720 bytes ≈ 30 KB (before gzip).
 */

/** Valid CMC-7 character set: 10 digits + 5 special symbols */
export type CMC7Char =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '\u2446' // ⑆
  | '\u2447' // ⑇
  | '\u2448' // ⑈
  | '\u2449' // ⑉
  | '\u244A'; // ⑊

/**
 * Template data for all 15 CMC-7 characters.
 * Values are placeholder 1-pixel arrays until T-012 generates real templates.
 *
 * @remarks [PROVISÓRIA] Real templates generated after T-001 font license audit.
 */
export const TEMPLATES: Record<CMC7Char, Uint8Array> = {
  '0': new Uint8Array(32 * 64), // placeholder — T-012
  '1': new Uint8Array(32 * 64),
  '2': new Uint8Array(32 * 64),
  '3': new Uint8Array(32 * 64),
  '4': new Uint8Array(32 * 64),
  '5': new Uint8Array(32 * 64),
  '6': new Uint8Array(32 * 64),
  '7': new Uint8Array(32 * 64),
  '8': new Uint8Array(32 * 64),
  '9': new Uint8Array(32 * 64),
  '\u2446': new Uint8Array(32 * 64),
  '\u2447': new Uint8Array(32 * 64),
  '\u2448': new Uint8Array(32 * 64),
  '\u2449': new Uint8Array(32 * 64),
  '\u244A': new Uint8Array(32 * 64),
};
