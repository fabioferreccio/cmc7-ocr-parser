/**
 * Samples frames from a video element at a configured interval.
 * Transfers ImageBitmap (zero-copy) to the processing Worker.
 *
 * @remarks
 * DECISÃO (AD-01): Uses ImageBitmap transfer instead of OffscreenCanvas.
 * Reason: OffscreenCanvas not supported on Safari iOS < 16.4 (RNF-002).
 * See docs/03-arquitetura.md §1.1.
 *
 * Implemented in T-006.
 */
export class FrameSampler {
  // TODO (T-006): Implement setInterval + createImageBitmap + postMessage transfer
}
