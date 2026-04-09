import { vi } from 'vitest';
import type { EnvironmentInfo } from '../types/index.js';

// ─── Camera / MediaStream mocks ─────────────────────────────────────────────

/**
 * Mocks navigator.mediaDevices.getUserMedia to return a fake stream.
 * Must be imported from this file — no inline mocks (docs/05-regras.md §3.5).
 */
export function mockGetUserMedia(
  config: { reject?: boolean; error?: string } = {},
): ReturnType<typeof vi.fn> {
  const track = { stop: vi.fn(), kind: 'video', enabled: true };
  const stream = {
    getTracks: vi.fn().mockReturnValue([track]),
    getVideoTracks: vi.fn().mockReturnValue([track]),
    active: true,
  } as unknown as MediaStream;

  const mock = config.reject
    ? vi.fn().mockRejectedValue(new DOMException(config.error ?? 'Permission denied', 'NotAllowedError'))
    : vi.fn().mockResolvedValue(stream);

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: mock },
    configurable: true,
  });

  return mock;
}

/**
 * Creates a mock HTMLVideoElement with realistic dimensions.
 */
export function mockVideoElement(width = 1280, height = 720): HTMLVideoElement {
  return Object.assign(document.createElement('video'), {
    videoWidth: width,
    videoHeight: height,
    readyState: 4, // HAVE_ENOUGH_DATA
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  });
}

// ─── ImageBitmap mock ────────────────────────────────────────────────────────

export function mockImageBitmap(width = 960, height = 80): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

// ─── ImageData mock ──────────────────────────────────────────────────────────

export function mockImageData(width = 960, height = 540): ImageData {
  const data = new Uint8ClampedArray(width * height * 4).fill(128);
  return { data, width, height } as ImageData;
}

// ─── Environment stubs ───────────────────────────────────────────────────────

export function mockEnvironment(overrides: Partial<EnvironmentInfo> = {}): void {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: overrides.isIOS
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    configurable: true,
  });

  Object.defineProperty(globalThis.location, 'protocol', {
    value: overrides.isHTTPS === false ? 'http:' : 'https:',
    configurable: true,
  });
}

// ─── OpenCV.js mock ──────────────────────────────────────────

/**
 * Mock of the OpenCV.js cv object. Prevents WASM loading in unit tests.
 * Align with OpenCVSubset interface in src/wasm/opencv-loader.ts.
 */
export const mockCV = {
  Mat: class {
    data = new Uint8Array(100);
    rows = 10;
    cols = 10;
    delete = vi.fn();
  },
  Size: class { constructor(public width: number, public height: number) {} },
  Point: class { constructor(public x: number, public y: number) {} },
  Scalar: vi.fn(),
  
  cvtColor: vi.fn(),
  GaussianBlur: vi.fn(),
  adaptiveThreshold: vi.fn(),
  findContours: vi.fn(),
  warpAffine: vi.fn(),
  getRotationMatrix2D: vi.fn(),
  morphologyEx: vi.fn(),
  getStructuringElement: vi.fn(),
  matchTemplate: vi.fn(),
  minMaxLoc: vi.fn().mockReturnValue({ minVal: 0, maxVal: 0.9, minLoc: { x: 0, y: 0 }, maxLoc: { x: 0, y: 0 } }),

  COLOR_RGBA2GRAY: 6,
  ADAPTIVE_THRESH_GAUSSIAN_C: 1,
  THRESH_BINARY: 0,
  RETR_CCOMP: 2,
  CHAIN_APPROX_SIMPLE: 2,
  MORPH_RECT: 0,
  MORPH_CLOSE: 3,
  TM_CCOEFF_NORMED: 5,

  delete: vi.fn(),
};

