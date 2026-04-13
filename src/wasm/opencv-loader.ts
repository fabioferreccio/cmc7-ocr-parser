/**
 * OpenCV Loader — ESM Wrapper for the custom WASM build.
 *
 * @remarks
 * This module provides an ESM-compatible interface to load the UMD-based OpenCV.js build.
 * It follows project rules:
 * - RNF-003: Loads build ≤ 4MB.
 * - RP-02: Single-threaded (no SharedArrayBuffer).
 * - Rule 4.1: Supports configurable assetsBaseUrl.
 */

/**
 * Minimal interface for the subset of OpenCV functions used in the project.
 * This allows for future replacement with a custom Rust/WASM module (Option C).
 */
export interface OpenCVSubset {
  // Core / Imgproc types
  Mat: new (rows?: number, cols?: number, type?: number) => any;
  Size: new (width: number, height: number) => any;
  Point: new (x: number, y: number) => any;
  Scalar: any;

  // Imgproc
  cvtColor(src: any, dst: any, code: number): void;
  GaussianBlur(
    src: any,
    dst: any,
    ksize: any,
    sigmaX: number,
    sigmaY?: number,
    borderType?: number,
  ): void;
  adaptiveThreshold(
    src: any,
    dst: any,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ): void;
  findContours(
    src: any,
    contours: any,
    hierarchy: any,
    mode: number,
    method: number,
    offset?: any,
  ): void;
  warpAffine(
    src: any,
    dst: any,
    M: any,
    dsize: any,
    flags?: number,
    borderMode?: number,
    borderValue?: any,
  ): void;
  getRotationMatrix2D(center: any, angle: number, scale: number): any;
  morphologyEx(
    src: any,
    dst: any,
    op: number,
    kernel: any,
    anchor?: any,
    iterations?: number,
    borderType?: number,
    borderValue?: any,
  ): void;
  getStructuringElement(shape: number, ksize: any, anchor?: any): any;
  matchTemplate(image: any, templ: any, result: any, method: number, mask?: any): void;
  minMaxLoc(src: any, mask?: any): { minVal: number; maxVal: number; minLoc: any; maxLoc: any };

  // Constants (subset)
  COLOR_RGBA2GRAY: number;
  COLOR_GRAY2RGBA: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY: number;
  THRESH_BINARY_INV: number;
  RETR_CCOMP: number;
  CHAIN_APPROX_SIMPLE: number;
  MORPH_RECT: number;
  MORPH_CLOSE: number;
  TM_CCOEFF_NORMED: number;

  /** emscripten memory management */
  delete(): void;
}

export type CV = OpenCVSubset;

let cvPromise: Promise<CV> | null = null;

/**
 * Loads OpenCV.js from the specified assets base URL.
 * Implements a singleton pattern to ensure WASM is loaded only once.
 */
export async function loadOpenCV(assetsBaseUrl: string = './'): Promise<CV> {
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    // 1. Detect environment
    const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';
    if (!isBrowser) {
      // In Node/Vitest, the loader should ideally be mocked.
      // If actually called in Node, we expect the user to provide a path or use the local build.
      // But per Rule 3.5, we use mocks for tests.
      return reject(
        new Error('OpenCV loader must be used in a browser/worker environment or mocked.'),
      );
    }

    // 2. Setup Module for Emscripten
    const Module: any = {
      locateFile: (path: string) => {
        if (path === 'opencv_js.wasm' || path === 'opencv.wasm') {
          return `${assetsBaseUrl}wasm/opencv.wasm`;
        }
        return path;
      },
      onRuntimeInitialized: () => {
        resolve(Module as CV);
      },
      onAbort: (err: any) => {
        reject(new Error(`OpenCV runtime aborted: ${err}`));
      },
    };

    // 3. Load the JS glue code
    // Since we are in a Worker (usually), we use importScripts or dynamic fetch
    const jsUrl = `${assetsBaseUrl}wasm/opencv.js`;

    if (typeof importScripts === 'function') {
      try {
        // emscripten build expects 'Module' to be in the global scope when it runs
        (self as any).Module = Module;
        importScripts(jsUrl);
        // Note: some builds might not trigger onRuntimeInitialized if loaded this way,
        // but TechStark usually does.
      } catch (e) {
        reject(new Error(`Failed to importScripts OpenCV: ${e}`));
      }
    } else {
      // Main thread or browser environment without importScripts
      const script = document.createElement('script');
      script.src = jsUrl;
      script.async = true;
      (window as any).Module = Module;
      script.onerror = () => reject(new Error('Failed to load OpenCV script.'));
      document.head.appendChild(script);
    }
  });

  return cvPromise;
}
