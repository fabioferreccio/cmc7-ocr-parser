/**
 * Image preprocessor — Levels 1 (Canvas) and 2 (OpenCV.js WASM).
 *
 * @remarks
 * DECISÃO (AD-02): Hybrid pipeline — Canvas API for L1 (lightweight, no WASM cost),
 * OpenCV.js custom build for L2 (advanced operations).
 * See docs/03-arquitetura.md §1.2.
 *
 * DECISÃO (AD-07): Uses OpenCV.js single-thread build to avoid CORP/COOP
 * header requirements that would impact consumers' deployment.
 *
 * Implemented in T-009 (L1) and T-010 (L2).
 */
export class ImagePreprocessor {
  // TODO (T-009): L1 — grayscale, resize, crop (Canvas API)
  // TODO (T-010): L2 — adaptiveThreshold, morphology, deskew (OpenCV.js)
}
