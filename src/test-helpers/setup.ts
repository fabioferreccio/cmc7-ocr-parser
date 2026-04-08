/**
 * Global test setup — mocks for browser APIs unavailable in jsdom.
 * Imported by vitest.config.ts setupFiles.
 */
import { vi } from 'vitest';

// ─── ImageBitmap mock (not in jsdom) ────────────────────────────────────────
globalThis.createImageBitmap = vi.fn().mockImplementation(
  async (_source: unknown): Promise<ImageBitmap> =>
    ({ width: 960, height: 540, close: vi.fn() }) as unknown as ImageBitmap,
);

// ─── Worker mock (not in jsdom) ──────────────────────────────────────────────
globalThis.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
  onerror: null,
})) as unknown as typeof Worker;

// ─── WebAssembly stub (not loaded in unit tests) ────────────────────────────
if (!globalThis.WebAssembly) {
  globalThis.WebAssembly = {
    instantiate: vi.fn(),
    compile: vi.fn(),
    validate: vi.fn(),
  } as unknown as typeof WebAssembly;
}
