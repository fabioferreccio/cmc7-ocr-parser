import type { CMC7InitError } from '../types';

const CMC7_CHARS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '\u2446',
  '\u2447',
  '\u2448',
  '\u2449',
  '\u244A',
];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onnxruntime-web lazy-import has no type for InferenceSession (docs/05-regras.md Rule 7.2: DECISÃO AD-03)
  private session: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onnxruntime-web dynamic import namespace type
  private ort: unknown;

  /**
   * Inicializa a sessão ONNX lazily.
   * @param modelUrl Caminho para o arquivo .onnx
   */
  async init(modelUrl: string): Promise<void> {
    if (this.session) return; // already initialized

    try {
      // Lazy import to keep bundle small
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onnxruntime-web dynamic import
      this.ort = await import('onnxruntime-web') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.session = await (this.ort as any).InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw {
        type: 'INIT_ERROR',
        message: `Failed to load ONNX model from ${modelUrl}: ${msg}`,
        cause: 'model-load-failed',
      } as CMC7InitError;
    }
  }

  /**
   * Processa uma única imagem de caractere e retorna a classe prevista.
   * @param charImageBuffer Pixels da imagem binarizada (grayscale) 32x64
   */
  async recognize(charImageBuffer: Uint8Array): Promise<{ char: string; score: number }> {
    if (!this.session) {
      throw new Error('CNNEngine not initialized. Call init() first.');
    }

    // Normalize input
    const floatData = new Float32Array(charImageBuffer.length);
    for (let i = 0; i < charImageBuffer.length; i++) {
      floatData[i] = (charImageBuffer[i] ?? 0) / 255.0; // scale 0-1; ?? handles noUncheckedIndexedAccess
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ort/session untyped (lazy import)
    const ort = this.ort as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = this.session as any;

    // Tensor shape: [batch=1, channels=1, height=64, width=32]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const tensor = new ort.Tensor('float32', floatData, [1, 1, 64, 32]);

    // Setup inputs dynamically based on session definition
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const inputName = (session.inputNames?.[0] as string | undefined) ?? 'input';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const outputName = (session.outputNames?.[0] as string | undefined) ?? 'output';

    const feeds: Record<string, unknown> = {};
    feeds[inputName] = tensor;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const results = await session.run(feeds);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const outputTensor = results[outputName];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const logits = outputTensor.data as Float32Array;

    const result = this.argmax(logits);
    return {
      char: CMC7_CHARS[result.index]!,
      score: result.score,
    };
  }

  private argmax(arr: Float32Array): { index: number; score: number } {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      // noUncheckedIndexedAccess: arr[i] is always defined within arr.length bounds
      const val = arr[i] ?? -Infinity;
      if (val > maxVal) {
        maxVal = val;
        maxIdx = i;
      }
    }
    return { index: maxIdx, score: maxVal };
  }
}
