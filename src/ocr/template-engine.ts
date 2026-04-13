import type { Segment } from './symbol-segmenter.js';
import { TEMPLATES } from './templates/index.js';
import type { CMC7Char } from './templates/index.js';

export interface RecognitionResult {
  char: CMC7Char | '?';
  score: number;
}

/**
 * Recognizes segmented CMC-7 characters using pixel-level template matching (Cross-Correlation / SAD).
 */
export class TemplateEngine {
  private templates: Record<CMC7Char, Uint8Array>;
  private minThreshold: number;

  /**
   * @param templates Map of character keys to 32x64 8-bit templates
   * @param threshold Minimum score (0.0 to 1.0) required to accept a recognition
   */
  constructor(templates: Record<CMC7Char, Uint8Array> = TEMPLATES, threshold = 0.6) {
    this.templates = templates;
    this.minThreshold = threshold;
  }

  /**
   * Given a list of normalized 32x64 segments, returns the array of recognized characters.
   */
  recognize(segments: Segment[]): RecognitionResult[] {
    return segments.map((seg) => this.recognizeSegment(seg));
  }

  /**
   * Matches a single 32x64 segment against all templates and returns the best match.
   */
  recognizeSegment(segment: Segment): RecognitionResult {
    const data = segment.imageData.data;
    let bestChar: CMC7Char | '?' = '?';
    let bestScore = -1;

    // Both segment and template should mathematically have 2048 pixels.
    for (const [char, templatePixels] of Object.entries(this.templates)) {
      let scoreAccumulator = 0;

      for (let i = 0; i < 2048; i++) {
        // Obter pixel R (o segmento binarizado tem R=G=B).
        // array imageData contem rgba (4 iteradores).
        const segPixel = data[i * 4]!;
        const tmplPixel = templatePixels[i]!;

        // Diferença absoluta de cor
        const diff = Math.abs(segPixel - tmplPixel);

        // Transformar diferença em similaridade (0 = dif maxima, 1 = iguais)
        scoreAccumulator += (255 - diff) / 255.0;
      }

      const score = scoreAccumulator / 2048.0;

      if (score > bestScore) {
        bestScore = score;
        bestChar = char as CMC7Char;
      }
    }

    if (bestScore < this.minThreshold) {
      return { char: '?', score: bestScore };
    }

    return { char: bestChar, score: bestScore };
  }
}
