/**
 * Template Matching OCR Engine for CMC-7 characters.
 *
 * @remarks
 * DECISÃO (AD-03): Template matching is the default engine (recognitionMode: 'template').
 * Discarded alternative: Tesseract.js — bundle too large (5–20 MB traineddata),
 * latency 500ms–2s violates RNF-001. See docs/03-arquitetura.md §2.1.
 *
 * Pipeline: segmentation (findContours) → normalize (32×64) → matchTemplate.
 * Implemented in T-013.
 */
export class TemplateMatchingEngine {
  // TODO (T-013): Implement character segmentation + normalized template matching
}
