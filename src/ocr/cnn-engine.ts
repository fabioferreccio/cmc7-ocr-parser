import type { CMC7InitError } from '../types';

const CMC7_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '\u2446', '\u2447', '\u2448', '\u2449', '\u244A'
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
  private session: any | null = null;
  private ort: any;

  /**
   * Inicializa a sessão ONNX lazily.
   * @param modelUrl Caminho para o arquivo .onnx
   */
  async init(modelUrl: string): Promise<void> {
    if (this.session) return; // already initialized
    
    try {
      // Lazy import to keep bundle small
      this.ort = await import('onnxruntime-web');
      this.session = await this.ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm']
      });
    } catch (e: any) {
      throw {
        type: 'INIT_ERROR',
        message: `Failed to load ONNX model from ${modelUrl}: ${e.message}`,
        cause: 'model-load-failed'
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
      floatData[i] = charImageBuffer[i] / 255.0; // scale 0-1
    }

    // Tensor shape: [batch=1, channels=1, height=64, width=32]
    const tensor = new this.ort.Tensor('float32', floatData, [1, 1, 64, 32]);
    
    // Setup inputs dynamically based on session definition
    const inputName = this.session.inputNames?.[0] || 'input';
    const outputName = this.session.outputNames?.[0] || 'output';
    
    const feeds: Record<string, any> = {};
    feeds[inputName] = tensor;

    const results = await this.session.run(feeds);
    const outputTensor = results[outputName];
    const logits = outputTensor.data as Float32Array;

    const result = this.argmax(logits);
    return {
      char: CMC7_CHARS[result.index]!,
      score: result.score
    };
  }

  private argmax(arr: Float32Array): { index: number; score: number } {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return { index: maxIdx, score: maxVal };
  }
}
