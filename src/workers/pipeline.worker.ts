/**
 * Web Worker for heavy image processing and OCR.
 *
 * @remarks
 * Environment: Web Worker (threads).
 * Assets: OpenCV.js WASM and ONNX models are loaded here.
 */
import type { WorkerMessage, WorkerResponse } from '../types/index.js';

// No Worker, utilizamos self para referenciar o escopo global
const ctx: Worker = self as any;

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { action, payload } = event.data;

  switch (action) {
    case 'init':
      // Em T-010 aqui carregaremos o OpenCV.js
      ctx.postMessage({ type: 'ready' } as WorkerResponse);
      break;

    case 'process':
      if (payload?.bitmap) {
        // Fluxo de processamento real virá nas tasks M3 e M4.
        // Por enquanto, apenas fechamos o bitmap para evitar leaks.
        payload.bitmap.close();
        
        ctx.postMessage({ 
          type: 'quality', 
          payload: { score: 100, issues: [], shouldProcess: true } 
        } as WorkerResponse);
      }
      break;

    case 'stop':
      // Encerramento controlado se necessário
      break;
  }
};
