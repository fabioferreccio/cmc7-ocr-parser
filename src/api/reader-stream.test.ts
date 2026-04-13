import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCMC7Reader } from '../index.js';

// Mock loadOpenCV to return a dummy subset
vi.mock('../wasm/opencv-loader.js', () => ({
  loadOpenCV: vi.fn().mockResolvedValue({
    matFromImageData: () => ({ delete: () => {} }),
    Mat: class {
      delete() {}
      cols = 100;
      rows = 20;
      data = new Uint8Array(2000);
      empty() {
        return false;
      }
    },
    Size: class {},
    Point: class {},
    cvtColor: vi.fn(),
    GaussianBlur: vi.fn(),
    adaptiveThreshold: vi.fn(),
    COLOR_RGBA2GRAY: 0,
    ADAPTIVE_THRESH_GAUSSIAN_C: 0,
    THRESH_BINARY: 0,
  }),
}));

describe('CMC7Reader Stream (Real-Time Loop)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // requestAnimationFrame mock
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deve processar frames periodicamente respeitando intervalo', async () => {
    const reader = await createCMC7Reader({ frameIntervalMs: 100 });
    const mockVideo = {
      readyState: 2,
      width: 100,
      height: 100,
      getContext: () => ({
        getImageData: () => ({ width: 100, height: 100, data: new Uint8ClampedArray(40000) }),
      }),
    } as any;

    // Spy on internal processFrame
    const spy = vi.spyOn(reader as any, 'processFrame');

    await reader.start(mockVideo);

    // Advance time
    vi.advanceTimersByTime(250);

    // 100ms interval -> should have called approx 2 times (0ms and 100ms and 200ms maybe?)
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);

    await reader.stop();
  });

  it('deve parar o loop ao chamar stop()', async () => {
    const reader = await createCMC7Reader({ frameIntervalMs: 10 });
    const mockVideo = { readyState: 2 };
    const spy = vi.spyOn(reader as any, 'processFrame');

    await reader.start(mockVideo as any);
    await reader.stop();

    const countAfterStop = spy.mock.calls.length;
    vi.advanceTimersByTime(100);

    expect(spy.mock.calls.length).toBe(countAfterStop);
  });
});
