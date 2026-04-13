# Changelog

All notable changes to `cmc7-ocr-parser` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [1.0.0] — 2026-04-13

### Added

#### Core Pipeline
- **EnvironmentDetector** — Detects WKWebView (Chrome/Firefox iOS), Safari iOS, and HTTPS requirements; provides user-facing guidance in Portuguese (`src/capture/environment-detector.ts`)
- **CameraCapture & FrameSampler** — `getUserMedia` wrapper with `facingMode: 'environment'` default; frame extraction loop with configurable `frameIntervalMs` (`src/capture/`)
- **Web Worker infrastructure** — Typed message protocol (`WorkerInbound` / `WorkerOutbound`) with `ImageBitmap` transfer for off-main-thread processing (`src/workers/`)

#### Image Pipeline (Camada 1)
- **ImagePreprocessor L1** — Canvas-based grayscale conversion (ITU-R 601 weights), resize to max 960px, and bottom-third crop (`src/pipeline/image-preprocessor.ts`)
- **ImagePreprocessor L2** — OpenCV.js `GaussianBlur`, `adaptiveThreshold`, morphological ops and deskew up to ±15° (`src/pipeline/image-preprocessor.ts`)
- **ROIDetector** — Horizontal projection analysis to locate the CMC-7 strip in the image (`src/pipeline/roi-detector.ts`)
- **FrameQualityAssessor** — Canvas-based blur (Laplacian variance), low-contrast, and glare detection; ~5ms at 960×540 (`src/ocr/quality/assessor.ts`)

#### OCR Engine (Camada 2)
- **CMC-7 Templates** — Synthetic 32×64 pixel Uint8Array templates for all 15 CMC-7 characters (10 digits + 5 symbols ⑆⑇⑈⑉⑊); total ≤ 35 KB (`src/ocr/templates/`)
- **TemplateMatchingEngine** — Normalized cross-correlation segmentation and recognition; ≥ 95% character accuracy (`src/ocr/template-engine.ts`)
- **CNNEngine** — Lazy-loaded ONNX Runtime Web session; accepts `[1,1,64,32]` tensor, returns `[1,15]` logits; target < 200ms inference (`src/ocr/cnn-engine.ts`)
- Python training pipeline (`tools/train/`): dataset generation with augmentation, CNN training with early stopping, INT8 quantization export ≤ 2 MB

#### Validation & Parsing (Camada 3)
- **DVValidator** — Módulo 10 and Módulo 11 with custom weight support; handles remainder=1 → 'X' edge case (`src/validation/dv-validator.ts`)
- **BankRegistry** — Pre-configured specs for BB (001), Caixa (104), Bradesco (237), Itaú (341), Santander (033); extensible via `registerBank()` (`src/validation/bank-registry.ts`)
- **CMC7Parser** — Parses the 5 CMC-7 delimiters, extracts `bankCode` and block fields per bank spec; degrades gracefully for unknown banks (`src/parser/cmc7-parser.ts`)
- **FieldExtractor** — Composes `CMC7Fields` from `ParseResult`; runs DV validation and annotates `isValid`, `checkDigitsValid`, and `errors` (`src/parser/field-extractor.ts`)

#### Public API (Camada 4)
- **`createCMC7Reader(options?)`** — Factory returning a fully initialized `CMC7Reader`; throws typed `CMC7InitError` on WebAssembly failure
- **`reader.start(videoElement)`** — Initiates real-time processing loop; emits `'result'`, `'frame-quality'`, `'error'`, `'unsupported-environment'`
- **`reader.stop()`** — Stops loop, releases camera tracks, terminates Worker
- **`reader.readImage(input)`** — Static image processing; accepts `File`, `Blob`, `HTMLImageElement`, `ImageBitmap`
- **`reader.on()` / `reader.off()`** — Typed event subscription
- **`for await...of reader`** — Async iterator interface over results

#### Framework Integrations (Camada 5)
- **`useCMC7Reader` React hook** — Handles React StrictMode double-mount; exposes `isReady`, `result`, `error`, `start`, `stop` (`src/react.ts`)
- **`useCMC7Reader` Vue composable** — `onMounted` / `onUnmounted` lifecycle bindings with reactive refs (`src/vue.ts`)
- Subpath exports: `cmc7-ocr-parser/react` and `cmc7-ocr-parser/vue`

#### Build & Tooling
- **tsup** — Dual ESM + CJS output with `.d.ts` declarations; `sideEffects: false`; WASM asset copy via `scripts/prepare-opencv-assets.js`
- **Bundle size**: core bundle < 50 KB gzip; OpenCV WASM 3.45 MB; CNN model < 2 MB (all lazy-loaded)
- **Vitest** test suite with jsdom environment and ≥ 80% coverage thresholds
- **Playwright** E2E tests in Chromium and WebKit
- **GitHub Actions** CI with bundle size gate, license check, and Playwright matrix

### Infrastructure
- OpenCV.js: TechStark build v4.9.0 (Apache 2.0) — 3.45 MB total (JS + WASM), single-thread (no COOP/CORP headers required)
- ONNX Runtime Web v1.24.3 (MIT) — lazy-loaded for CNN mode

---

[1.0.0]: https://github.com/fabioferreccio/cmc7-ocr-parser/releases/tag/v1.0.0
