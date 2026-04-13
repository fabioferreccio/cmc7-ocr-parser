import {
  type CMC7Reader,
  type CMC7Result,
  type CMC7ReaderOptions,
  type CMC7Error,
  type BankSpec,
  type FrameQualityReport,
  type EnvironmentInfo,
} from './types/index.js';
import { ImagePreprocessor } from './pipeline/image-preprocessor.js';
import { ROIDetector } from './pipeline/roi-detector.js';
import { SymbolSegmenter } from './ocr/symbol-segmenter.js';
import { TemplateEngine } from './ocr/template-engine.js';
import { CMC7Parser } from './parser/cmc7-parser.js';
import { BankRegistry } from './validation/bank-registry.js';
import { FieldExtractor } from './parser/field-extractor.js';
import { FrameQualityAssessor } from './ocr/quality/assessor.js';
import { detectEnvironment } from './capture/environment-detector.js';

/**
 * Implementation of the CMC7Reader interface.
 * Coordinates between Capture, Pipeline, and Parser layers.
 */
class ReaderImpl implements CMC7Reader {
  private readonly handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  private qualityAssessor = new FrameQualityAssessor();
  private isRunning = false;
  private iteratorQueue: CMC7Result[] = [];
  private iteratorResolvers: ((value: IteratorResult<CMC7Result>) => void)[] = [];
  private unsupportedEnvInfo: unknown = null;

  // Pipeline components
  private readonly preprocessor = new ImagePreprocessor();
  private readonly roiDetector = new ROIDetector();
  private readonly segmenter = new SymbolSegmenter();
  private readonly ocrEngine = new TemplateEngine();
  private readonly bankRegistry = new BankRegistry();
  private readonly parser: CMC7Parser;
  private readonly extractor: FieldExtractor;

  constructor(private readonly options: CMC7ReaderOptions = {}) {
    this.parser = new CMC7Parser(this.bankRegistry);
    this.extractor = new FieldExtractor(this.parser);

    // AD-02: Check environment compatibility on initialization (docs/03-arquitetura.md §4.3)
    const env = detectEnvironment();
    if (env.isWKWebView || !env.hasCamera || !env.isHTTPS) {
      this.unsupportedEnvInfo = env;
      // Also queue for those already listening (if any)
      queueMicrotask(() => this.emit('unsupported-environment', env));
    }
  }

  private loopId: number | null = null;
  private lastProcessTime = 0;
  private videoElement: HTMLVideoElement | null = null;

  // eslint-disable-next-line @typescript-eslint/require-await -- implements CMC7Reader interface; camera wiring in M6 will add awaits
  async start(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isRunning) return;
    this.videoElement = videoElement;
    this.isRunning = true;
    this.lastProcessTime = 0;

    this.loop();
  }

  private stream: MediaStream | null = null;

  async startCamera(container: HTMLElement = document.body): Promise<HTMLVideoElement> {
    if (this.stream) return this.videoElement!;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // RF-002: Preferencialmente câmera traseira
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...this.options.cameraConstraints,
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('data-testid', 'camera-video'); // Useful for E2E
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.srcObject = this.stream;

      container.appendChild(video);

      // Aguarda metadados para garantir que o vídeo tenha dimensões e esteja pronto
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timeout waiting for video metadata')),
          5000,
        );
        if (video.readyState >= 2) {
          clearTimeout(timeout);
          resolve();
        }
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video element error'));
        };
      });

      try {
        await video.play();
      } catch (_e) {
        // On some mobile browsers, play() might fail without user gesture.
        // Silently ignore — the stream will still be active (Rule 4.1: no-console).
      }

      this.videoElement = video;
      await this.start(video);

      return video;
    } catch (err) {
      const error = err as Error;
      throw {
        type: 'CAMERA_PERMISSION_DENIED',
        message: error.message || 'Camera access denied by user',
      } as CMC7Error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- implements CMC7Reader interface; no async op needed for cleanup
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.loopId !== null) {
      cancelAnimationFrame(this.loopId);
      this.loopId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement && this.videoElement.parentElement) {
      // Logic on whether to remove video element from DOM is debatable,
      // but for simple startCamera/stop cycle, we'll clean it up.
      this.videoElement.remove();
      this.videoElement = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = Date.now();
    const interval = this.options.frameIntervalMs || 300;

    if (now - this.lastProcessTime >= interval) {
      this.processFrame().catch((err) => {
        this.emit('error', err);
      });
      this.lastProcessTime = now;
    }

    this.loopId = requestAnimationFrame(this.loop);
  };

  private async processFrame(): Promise<void> {
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    // Use current video frame as input
    try {
      // 1. Quality Assessment
      const imageData = await this.ensureImageData(this.videoElement);
      const quality = this.qualityAssessor.assess(imageData);

      this.emit('frame-quality', quality);

      if (quality.score < (this.options.minFrameQualityScore || 40)) {
        return;
      }

      // 2. Full OCR Pipeline
      const result = await this.readImage(imageData);
      this.emit('result', result);
    } catch (e) {
      const err = e as { type?: string };
      // Ignore "NotFound" in real-time loop to avoid flooding errors
      if (err.type !== 'CMC7_NOT_FOUND') {
        this.emit('error', e);
      }
    }
  }

  /**
   * Processes a static image source and returns the CMC-7 result.
   */
  async readImage(
    input:
      | HTMLCanvasElement
      | HTMLImageElement
      | ImageBitmap
      | File
      | Blob
      | string
      | ImageData
      | HTMLVideoElement,
  ): Promise<CMC7Result> {
    const startTime = Date.now();

    // 1. Get ImageData from input
    const imageData = await this.ensureImageData(input);

    // 2. Preprocessing & OCR Pipeline
    // Level 1: Resize and Grayscale
    const { imageData: grayData } = await this.preprocessor.process(imageData, { grayscale: true });

    // Level 2: Binarization (Required for ROI Detection and Segmentation)
    const binary = await this.preprocessor.binarize(grayData!);

    // Layer 1 integration: ROI Detection
    const roi = this.roiDetector.detect(binary);

    if (!roi) {
      throw {
        type: 'CMC7_NOT_FOUND',
        message: 'No CMC-7 strip detected in image.',
        frameQuality: 0, // Quality assessment will be integrated later
      } as CMC7Error;
    }

    // Layer 2: Character Extraction
    const segments = this.segmenter.segment(binary, roi);
    const matches = this.ocrEngine.recognize(segments);
    const rawString = matches.map((m) => m.char).join('');

    // Layer 3: Parsing & Validation
    const result = this.extractor.extract(rawString, {
      frameQuality: 100, // Placeholder
      startTime,
    });

    return result;
  }

  private async ensureImageData(
    input:
      | HTMLCanvasElement
      | HTMLImageElement
      | ImageBitmap
      | File
      | Blob
      | string
      | ImageData
      | HTMLVideoElement,
  ): Promise<ImageData> {
    if (input instanceof ImageData) return input;

    let source: CanvasImageSource;

    if (typeof input === 'string' || input instanceof Blob) {
      source = await this.loadImage(input);
    } else {
      source = input;
    }

    const canvas = source instanceof HTMLCanvasElement ? source : this.imageToCanvas(source);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private loadImage(input: Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image source'));
      if (input instanceof Blob) {
        img.src = URL.createObjectURL(input);
      } else {
        img.src = input;
      }
    });
  }

  private imageToCanvas(img: CanvasImageSource): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    if (img instanceof HTMLImageElement) {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
    } else if (img instanceof HTMLVideoElement) {
      canvas.width = img.videoWidth || img.width;
      canvas.height = img.videoHeight || img.height;
    } else if (img instanceof ImageBitmap || img instanceof HTMLCanvasElement) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    const ctx = canvas.getContext('2d');
    if (
      img instanceof HTMLVideoElement ||
      img instanceof HTMLCanvasElement ||
      img instanceof HTMLImageElement ||
      img instanceof ImageBitmap
    ) {
      ctx?.drawImage(img as CanvasImageSource, 0, 0);
    }

    return canvas;
  }

  on(event: 'result', handler: (result: CMC7Result) => void): this;
  on(event: 'frame-quality', handler: (report: FrameQualityReport) => void): this;
  on(event: 'error', handler: (error: CMC7Error) => void): this;
  on(event: 'unsupported-environment', handler: (info: EnvironmentInfo) => void): this;
  on(event: 'reading', handler: () => void): this;
  // Implementation signature — must be broader than all overloads
  on(event: string, handler: (...args: never[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as (...args: unknown[]) => void);

    // AD-02: If this is an environment warning and we already have info, emit immediately
    if (event === 'unsupported-environment' && this.unsupportedEnvInfo) {
      (handler as (info: unknown) => void)(this.unsupportedEnvInfo);
    }

    return this;
  }

  off(event: string, handler: (...args: unknown[]) => void): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  registerBank(spec: BankSpec): void {
    this.bankRegistry.register(spec);
  }

  /** Internal helper to emit events to listeners. */
  private emit(event: string, ...args: unknown[]): void {
    if (event === 'result') {
      const result = args[0] as CMC7Result;
      if (this.iteratorResolvers.length > 0) {
        const resolver = this.iteratorResolvers.shift()!;
        resolver({ value: result, done: false });
      } else {
        this.iteratorQueue.push(result);
      }
    }

    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (_e) {
        // Silently swallow handler errors to prevent one bad handler from breaking others
        // (Rule 4.1: no-console — errors are surfaced via the 'error' event)
      }
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<CMC7Result> {
    return {
      next: (): Promise<IteratorResult<CMC7Result>> => {
        if (this.iteratorQueue.length > 0) {
          return Promise.resolve({ value: this.iteratorQueue.shift()!, done: false });
        }
        return new Promise((resolve) => {
          this.iteratorResolvers.push(resolve);
        });
      },
    };
  }
}

/**
 * Creates and initializes a CMC-7 reader instance.
 *
 * @param options - Optional configuration.
 * @returns The initialized {@link CMC7Reader} instance.
 * @throws {@link CMC7InitError} If WebAssembly is not supported by the browser.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- future M6 integration will load WASM here; kept async for public API contract and test compatibility
export async function createCMC7Reader(options: CMC7ReaderOptions = {}): Promise<CMC7Reader> {
  // Check for WebAssembly support (RNF-003)
  if (typeof WebAssembly !== 'object' || !WebAssembly.instantiate) {
    throw {
      type: 'INIT_ERROR',
      message: 'WebAssembly not supported in this environment',
      cause: 'webassembly-not-supported',
    } as CMC7Error;
  }

  const reader = new ReaderImpl(options);

  // Environment check will follow in integration

  return reader;
}
