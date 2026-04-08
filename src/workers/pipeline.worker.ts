/**
 * Pipeline Web Worker — runs all heavy processing off the main thread.
 *
 * @remarks
 * All OpenCV.js (cv.*) calls MUST occur here — never in the main thread (docs/05-regras.md §2.2).
 * Receives ImageBitmap via transfer (zero-copy, AD-01).
 * Responds with typed WorkerOutbound messages.
 *
 * Implemented in T-007.
 */

// ─── Message Protocol (docs/05-regras.md §1.3) ───────────────────────────────

type WorkerInbound =
  | { type: 'PROCESS_FRAME'; bitmap: ImageBitmap }
  | { type: 'STOP' };

type WorkerOutbound =
  | { type: 'RESULT'; payload: unknown } // typed as CMC7Result after T-018
  | { type: 'FRAME_QUALITY'; payload: unknown }
  | { type: 'ERROR'; payload: unknown };

// TODO (T-007): Implement self.onmessage handler
self.onmessage = (_event: MessageEvent<WorkerInbound>): void => {
  // Placeholder — implementation in T-007
};

// Satisfy TypeScript for Worker global scope
export type { WorkerInbound, WorkerOutbound };
