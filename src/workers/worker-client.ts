import type { 
  WorkerMessage, 
  WorkerResponse, 
  CMC7ReaderOptions
} from '../types/index.js';

export type WorkerClientEvent = 'result' | 'quality' | 'error' | 'ready';

/**
 * Orchestrates the Lifecycle of the Pipeline Web Worker.
 * Handles message passing and ImageBitmap transfers (zero-copy).
 */
export class WorkerClient {
  private worker: Worker | null = null;
  private handlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();


  /**
   * Initializes the worker.
   *
   * @param options - Configuration for the worker (e.g. assetsBaseUrl).
   */
  init(options: Pick<CMC7ReaderOptions, 'assetsBaseUrl' | 'recognitionMode'> = {}): void {
    if (this.worker) return;

    // DECISÃO (AD-01): Worker isolado para manter Main Thread responsiva.
    // O caminho do worker em desenvolvimento aponta para o TS, 
    // em produção o bundler resolverá para o JS compilado.
    this.worker = new Worker(
      new URL('./pipeline.worker.js', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;
      this.emit(type, payload);
    };

    this.worker.onerror = (error) => {
      this.emit('error', {
        type: 'INIT_ERROR',
        message: 'Falha crítica no Web Worker.',
        cause: 'wasm-load-failed' // Proxying error
      });
      console.error('[WorkerClient] Erro:', error);
    };

    this.postMessage({ action: 'init', payload: { options } });
  }

  /**
   * Sends a frame to be processed by the worker.
   *
   * @param bitmap - The ImageBitmap to process.
   */
  process(bitmap: ImageBitmap): void {
    // REGRA (6.2): Transferência obrigatória para evitar cópia de memória.
    this.postMessage(
      { action: 'process', payload: { bitmap } },
      [bitmap]
    );
  }

  /**
   * Terminates the worker.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Simple event emitter implementation.
   */
  on(event: WorkerClientEvent, handler: (...args: unknown[]) => void): this {

    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }


  private postMessage(message: WorkerMessage, transfer?: Transferable[]): void {
    if (!this.worker) {
      throw new Error('Worker not initialized. Call init() first.');
    }
    this.worker.postMessage(message, transfer || []);
  }
}
