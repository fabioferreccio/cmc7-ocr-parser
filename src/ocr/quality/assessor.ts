import type { FrameQualityReport, QualityIssue } from '../../types/index.js';

/**
 * Assesses frame quality using Canvas API data only (no WASM).
 * Runs at Level 1 to reject bad frames before paying the WASM processing cost.
 *
 * @remarks
 * Metrics: Laplacian variance (blur), histogram std dev (contrast), pixel saturation (glare).
 * Target: complete in ≤ 15ms on mobile mid-range (docs/02-prd.md RNF-001).
 */
export class FrameQualityAssessor {
  /**
   * Assesses the quality of an image.
   *
   * @param imageData - Raw image data from Canvas API
   * @param minScore - Minimum score to set shouldProcess to true (default: 40)
   * @returns Quality report with score, issues and suggestion
   */
  assess(imageData: ImageData, minScore = 40): FrameQualityReport {
    const { data, width, height } = imageData;

    const issues: QualityIssue[] = [];

    // --- 1. Glare & Contrast (Histogram) ---
    const histogram = new Int32Array(256);
    let totalPixels = 0;

    // We sample to ensure < 15ms on mobile (every 4th pixel = skip 16 pixels area basically)
    // Actually, imageData.data is [R,G,B,A, R,G,B,A...]
    for (let i = 0; i < data.length; i += 16) {
      const gray = data[i]!; // Assuming grayscale or just using Red channel as proxy for speed
      histogram[gray]!++;
      totalPixels++;
    }

    // 1.1 Glare detection (> 20% of pixels > 240)
    let brightPixels = 0;
    for (let i = 240; i < 256; i++) {
      brightPixels += histogram[i]!;
    }
    const glareRatio = brightPixels / totalPixels;
    if (glareRatio > 0.2) {
      issues.push('glare');
    }

    // 1.2 Contrast detection (Standard Deviation of histogram)
    let mean = 0;
    for (let i = 0; i < 256; i++) {
      mean += i * (histogram[i]! / totalPixels);
    }
    let variance = 0;
    for (let i = 0; i < 256; i++) {
      variance += Math.pow(i - mean, 2) * (histogram[i]! / totalPixels);
    }
    const stdDev = Math.sqrt(variance);
    if (stdDev < 30) {
      issues.push('low-contrast');
    }

    // --- 2. Blur (Simplified Laplacian Variance) ---
    // We sample a grid of pixels to check sharp transitions
    let lapSum = 0;
    let lapSumSq = 0;
    let lapCount = 0;

    // Use a small 3x3 window over 100 sampled points
    const samples = 100;
    for (let s = 0; s < samples; s++) {
      const x = Math.floor(Math.random() * (width - 2)) + 1;
      const y = Math.floor(Math.random() * (height - 2)) + 1;

      const idx = (y * width + x) * 4;
      const north = ((y - 1) * width + x) * 4;
      const south = ((y + 1) * width + x) * 4;
      const east = (y * width + (x + 1)) * 4;
      const west = (y * width + (x - 1)) * 4;

      // Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
      const L = data[north]! + data[south]! + data[east]! + data[west]! - 4 * data[idx]!;

      lapSum += L;
      lapSumSq += L * L;
      lapCount++;
    }

    const lapVariance = lapSumSq / lapCount - Math.pow(lapSum / lapCount, 2);
    if (lapVariance < 80) {
      issues.push('blur');
    }

    // --- 3. Scoring ---
    // Heuristic score: starts at 100, drops per issue
    let score = 100;
    if (issues.includes('blur')) score -= 40;
    if (issues.includes('low-contrast')) score -= 30;
    if (issues.includes('glare')) score -= 30;

    // Boundary check
    score = Math.max(0, score);

    const suggestion = this.getSuggestion(issues);
    return {
      score,
      issues,
      shouldProcess: score >= minScore,
      ...(suggestion !== undefined && { suggestion }),
    };
  }

  private getSuggestion(issues: QualityIssue[]): FrameQualityReport['suggestion'] {
    if (issues.includes('blur')) return 'stabilize';
    if (issues.includes('glare')) return 'reduce-glare';
    if (issues.includes('low-contrast')) return 'improve-lighting';
    return undefined;
  }
}
