import type { FrameQualityReport } from '../types/index.js';

/**
 * Assesses frame quality using Canvas API only (no WASM).
 * Runs at Level 1 to reject bad frames before paying the WASM processing cost.
 *
 * @remarks
 * Metrics: Laplacian variance (blur), histogram std dev (contrast), pixel saturation (glare).
 * Target: complete in ≤ 15ms on mobile mid-range (docs/02-prd.md RNF-001).
 *
 * Implemented in T-008.
 */
export class FrameQualityAssessor {
  /**
   * @param imageData - Raw image data from Canvas API
   * @param minScore - Minimum score to set shouldProcess=true
   * @returns Quality report with score, issues and suggestion
   */
  assess(_imageData: ImageData, _minScore: number): FrameQualityReport {
    // TODO (T-008): Implement Laplacian variance + histogram analysis
    throw new Error('Not yet implemented. See docs/04-tasks.md T-008.');
  }
}
