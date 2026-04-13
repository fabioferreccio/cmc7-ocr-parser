/**
 * Global test setup — mocks for browser APIs unavailable in jsdom.
 * Imported by vitest.config.ts setupFiles.
 */
import { vi } from 'vitest';

// ─── Browser Globals ─────────────────────────────────────────────────────────
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(...args: any[]) {
      if (args.length === 2) {
        this.width = args[0];
        this.height = args[1];
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = args[0];
        this.width = args[1];
        this.height = args[2];
      }
    }
  };
}

// ─── ImageBitmap mock (not in jsdom) ────────────────────────────────────────
if (typeof globalThis.ImageBitmap === 'undefined') {
  (globalThis as any).ImageBitmap = class ImageBitmap {
    constructor() {
      throw new TypeError('Illegal constructor');
    }
    width = 0;
    height = 0;
    close() {}
  };
}

globalThis.createImageBitmap = vi
  .fn()
  .mockImplementation(async (_source: unknown): Promise<ImageBitmap> => {
    const bitmap = Object.create(ImageBitmap.prototype);
    Object.assign(bitmap, { width: 960, height: 540, close: vi.fn() });
    return bitmap as ImageBitmap;
  });

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
// ─── Canvas Context mock (not fully implemented in jsdom) ───────────────────
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
  if (contextId === '2d') {
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((_x, _y, w, h) => ({
        data: new Uint8ClampedArray(w * h * 4).fill(0),
        width: w,
        height: h,
      })),
      putImageData: vi.fn(),
      canvas: { width: 0, height: 0 },
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as any;

if (!globalThis.OffscreenCanvas) {
  globalThis.OffscreenCanvas = class {
    constructor(
      public width: number,
      public height: number,
    ) {}
    getContext(id: string) {
      return (document.createElement('canvas') as any).getContext(id);
    }
    convertToBlob() {
      return Promise.resolve(new Blob());
    }
    transferToImageBitmap() {
      return {} as ImageBitmap;
    }
  } as any;
}
