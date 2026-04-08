/**
 * CNN-based OCR engine via onnxruntime-web (alternative to template matching).
 *
 * @remarks
 * DECISÃO (AD-04): Uses onnxruntime-web (MIT) over TensorFlow.js.
 * Reason: smaller footprint, MIT license (vs Apache-2.0), no TF ecosystem overhead.
 * See docs/03-arquitetura.md §2.1 and docs/03-arquitetura.md §2.3.
 *
 * DECISÃO (AD-03): This engine is loaded LAZILY — only when recognitionMode === 'cnn'.
 * The onnxruntime-web import happens inside the initializer, not at module level.
 *
 * Implemented in T-014.
 */
export class CNNEngine {
  // TODO (T-014): Implement lazy ONNX session loading + inference pipeline
}
