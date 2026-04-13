# cmc7-ocr-parser

> TypeScript library for reading Brazilian CMC-7 check lines via camera — fully client-side, zero data leakage.

[![npm version](https://badge.fury.io/js/cmc7-ocr-parser.svg)](https://www.npmjs.com/package/cmc7-ocr-parser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## Overview

`cmc7-ocr-parser` reads the **CMC-7 magnetic ink character recognition** line found at the bottom of Brazilian bank checks (cheques) entirely in the browser — no backend required, no image ever leaves the device.

**Key features:**
- 📷 Real-time camera capture with automatic CMC-7 strip detection
- 🧠 Dual OCR engine: template matching (fast) + CNN via ONNX Runtime Web (accurate)
- ✅ Automatic DV (check digit) validation for the 5 major Brazilian banks
- 🔒 Zero network traffic — all processing runs in a Web Worker
- 📦 < 50 KB gzip for the core bundle (OpenCV.js and ONNX model loaded lazily)
- 🌐 Works in React, Vue and vanilla JS projects

---

## Installation

```bash
npm install cmc7-ocr-parser
# or
yarn add cmc7-ocr-parser
# or
pnpm add cmc7-ocr-parser
```

### Peer dependencies (optional)

Install only what you need:

```bash
# For the React hook
npm install react

# For the Vue composable
npm install vue
```

---

## Quick Start

### Vanilla JS / TypeScript

```typescript
import { createCMC7Reader } from 'cmc7-ocr-parser';

const videoEl = document.querySelector<HTMLVideoElement>('#camera')!;

const reader = await createCMC7Reader({
  recognitionMode: 'template', // or 'cnn'
  assetsBaseUrl: '/assets/',   // path to opencv.wasm and cmc7-cnn.onnx
});

reader.on('result', (result) => {
  console.log('Bank code:', result.fields.bankCode);
  console.log('Check number:', result.fields.checkNumber);
  console.log('Valid:', result.fields.isValid);
});

reader.on('frame-quality', (report) => {
  if (!report.shouldProcess) {
    console.warn('Low quality frame:', report.issue, report.suggestion);
  }
});

await reader.start(videoEl);

// Later, to clean up:
await reader.stop();
```

### Reading a static image

```typescript
const result = await reader.readImage(fileInput.files[0]);
console.log(result.fields);
```

---

## API Reference

### `createCMC7Reader(options?)`

Creates and initializes a `CMC7Reader` instance.

```typescript
const reader = await createCMC7Reader({
  recognitionMode: 'template',   // 'template' | 'cnn' | 'auto'
  frameIntervalMs: 300,          // sampling interval (default: 300ms)
  assetsBaseUrl: '/assets/',     // base URL for opencv.wasm and cmc7-cnn.onnx
  qualityThreshold: 40,          // minimum quality score to process a frame (0–100)
  onUnsupportedEnvironment: (msg) => alert(msg), // WKWebView / no camera
});
```

**Returns:** `Promise<CMC7Reader>`  
**Throws:** `CMC7InitError` if WebAssembly is not supported.

---

### `reader.start(videoElement)`

Starts the real-time processing loop using the device camera.

```typescript
await reader.start(videoEl);
```

**Throws:** `CMC7PermissionError` if the user denies camera access.  
**Throws:** `CMC7InitError` if not running over HTTPS (except `localhost`).

---

### `reader.stop()`

Stops the processing loop and releases all camera resources.

```typescript
await reader.stop();
```

---

### `reader.readImage(input)`

Processes a single static image.

```typescript
const result = await reader.readImage(file);      // File | Blob
const result = await reader.readImage(imageEl);   // HTMLImageElement
const result = await reader.readImage(bitmap);    // ImageBitmap
```

**Throws:** `CMC7InvalidInputError` for unsupported file types.  
**Throws:** `CMC7NotFoundError` if no CMC-7 line is detected.

---

### `reader.on(event, handler)` / `reader.off(event, handler)`

Subscribe to events:

| Event | Payload | Description |
|-------|---------|-------------|
| `'result'` | `CMC7Result` | A CMC-7 line was successfully read |
| `'frame-quality'` | `FrameQualityReport` | Quality report for a rejected frame |
| `'error'` | `CMC7Error` | An error occurred during processing |
| `'unsupported-environment'` | `{ message: string }` | WKWebView or incompatible browser detected |

---

### `reader.registerBank(spec)`

Register a custom bank specification for DV validation:

```typescript
reader.registerBank({
  compeCode: '999',
  name: 'My Bank',
  dvAlgorithm: 'mod10',
  block1Layout: [/* ... */],
});
```

---

### CMC7Result

```typescript
interface CMC7Result {
  rawString: string;           // full CMC-7 string as recognized
  fields: CMC7Fields;
  frameQuality: number;        // 0–100 quality score of the captured frame
  processingTimeMs: number;
  recognitionMode: 'template' | 'cnn';
}

interface CMC7Fields {
  bankCode: string | null;     // COMPE code (e.g. '341' for Itaú)
  bankName: string | null;
  agency: string | null;
  checkNumber: string | null;
  accountNumber: string | null;
  isValid: boolean;
  checkDigitsValid: boolean | 'unknown';
  parseWarnings: string[];
  errors: DVError[];
}
```

---

## React Hook

```bash
npm install cmc7-ocr-parser react
```

```tsx
import { useRef } from 'react';
import { useCMC7Reader } from 'cmc7-ocr-parser/react';

function CheckScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isReady, result, error, start, stop } = useCMC7Reader({
    recognitionMode: 'template',
    assetsBaseUrl: '/assets/',
  });

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted />
      <button onClick={() => start(videoRef.current!)} disabled={!isReady}>
        Start Camera
      </button>
      <button onClick={stop}>Stop</button>
      {result && (
        <div>
          <p>Bank: {result.fields.bankName}</p>
          <p>Check: {result.fields.checkNumber}</p>
          <p>Valid: {result.fields.isValid ? '✅' : '❌'}</p>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </div>
  );
}
```

---

## Vue Composable

```bash
npm install cmc7-ocr-parser vue
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useCMC7Reader } from 'cmc7-ocr-parser/vue';

const videoRef = ref<HTMLVideoElement | null>(null);
const { isReady, result, error, start, stop } = useCMC7Reader({
  recognitionMode: 'template',
  assetsBaseUrl: '/assets/',
});
</script>

<template>
  <div>
    <video ref="videoRef" autoplay playsinline muted />
    <button @click="start(videoRef!)" :disabled="!isReady">Start Camera</button>
    <button @click="stop">Stop</button>
    <div v-if="result">
      <p>Bank: {{ result.fields.bankName }}</p>
      <p>Check: {{ result.fields.checkNumber }}</p>
      <p>Valid: {{ result.fields.isValid ? '✅' : '❌' }}</p>
    </div>
    <p v-if="error" style="color: red">{{ error.message }}</p>
  </div>
</template>
```

---

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome (desktop) | ≥ 88 | Full support |
| Firefox (desktop) | ≥ 85 | Full support |
| Edge | ≥ 88 | Full support |
| Safari (desktop) | ≥ 14 | Full support |
| Chrome for Android | ≥ 88 | Full support |
| Safari iOS | ≥ 14 | Full support — use `facingMode: 'environment'` |
| Chrome iOS / iOS browsers | Any | ⚠️ **WKWebView limitation** — `getUserMedia` is not available. The library emits `'unsupported-environment'` with a user-friendly guidance message directing the user to open the page in Safari. |
| Firefox iOS | Any | Same WKWebView limitation as Chrome iOS |

### HTTPS Requirement

The library requires **HTTPS** (or `localhost`) to access the camera via `getUserMedia`. HTTP connections will trigger a `CMC7InitError`.

### Asset Hosting

Copy the lazy-loaded assets to your static assets directory:

```bash
# After building your project
cp node_modules/cmc7-ocr-parser/dist/wasm/opencv.wasm ./public/assets/
cp node_modules/cmc7-ocr-parser/dist/models/cmc7-cnn.onnx ./public/assets/
```

Then configure `assetsBaseUrl` to point to that directory.

---

## Privacy

> 🔒 **Zero data leaves the device.**

- All image processing runs in a **Web Worker** — never blocks the main thread
- No frames, images, or CMC-7 data are ever sent to any server
- No analytics, telemetry, or tracking of any kind
- No `fetch()`, `XMLHttpRequest`, or `WebSocket` calls in the library source
- Each frame is discarded immediately after processing; nothing is stored in `localStorage`, `sessionStorage`, or `IndexedDB`

This makes `cmc7-ocr-parser` suitable for use in banking and fintech environments with strict data compliance requirements.

---

## Supported Banks

Out of the box, `cmc7-ocr-parser` validates DV digits for the 5 largest Brazilian banks by check volume:

| COMPE Code | Bank | DV Algorithm |
|------------|------|--------------|
| 001 | Banco do Brasil | Módulo 10 |
| 033 | Santander | Módulo 10 |
| 104 | Caixa Econômica Federal | Módulo 11 |
| 237 | Bradesco | Módulo 11 |
| 341 | Itaú Unibanco | Módulo 10 |

Use `reader.registerBank()` to add support for other banks.

---

## License

MIT © 2026 Fábio Ferreccio

### Production Dependencies

| Package | License | Purpose |
|---------|---------|---------|
| `onnxruntime-web` | MIT | CNN inference engine (lazy-loaded) |

### Optional Peer Dependencies

| Package | License | Required for |
|---------|---------|-------------|
| `react` | MIT | `useCMC7Reader` React hook |
| `vue` | MIT | `useCMC7Reader` Vue composable |

The OpenCV.js WASM build used is the [TechStark build v4.9.0](https://github.com/TechStark/opencv-js), licensed under **Apache 2.0**.
