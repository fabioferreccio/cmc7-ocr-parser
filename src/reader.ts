import type { 
  CMC7Reader, 
  CMC7ReaderOptions, 
  CMC7Result, 
  CMC7Error, 
  FrameQualityReport, 
  EnvironmentInfo,
  BankSpec
} from './types/index.js';
import { ImagePreprocessor } from './pipeline/image-preprocessor.js';
import { ROIDetector } from './pipeline/roi-detector.js';
import { SymbolSegmenter } from './ocr/symbol-segmenter.js';
import { TemplateEngine } from './ocr/template-engine.js';
import { CMC7Parser } from './parser/cmc7-parser.js';
import { BankRegistry } from './validation/bank-registry.js';
import { FieldExtractor } from './parser/field-extractor.js';

/**
 * Implementation of the CMC7Reader interface.
 * Coordinates between Capture, Pipeline, and Parser layers.
 */
class ReaderImpl implements CMC7Reader {
  private readonly handlers: Map<string, Set<(...args: any[]) => void>> = new Map();
  private isRunning = false;
  private iteratorQueue: CMC7Result[] = [];
  private iteratorResolvers: ((value: IteratorResult<CMC7Result>) => void)[] = [];

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
  }

  async start(videoElement: HTMLVideoElement): Promise<void> {
    this.isRunning = true;
    // Real-time loop implementation will follow in T-021
  }

  async startCamera(container?: HTMLElement): Promise<HTMLVideoElement> {
    throw new Error('Method not implemented.');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  /**
   * Processes a static image source and returns the CMC-7 result.
   */
  async readImage(input: HTMLCanvasElement | HTMLImageElement | ImageData): Promise<CMC7Result> {
    const startTime = Date.now();
    
    // 1. Get ImageData from input
    const imageData = this.ensureImageData(input);

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
        frameQuality: 0 // Quality assessment will be integrated later
      } as CMC7Error;
    }

    // Layer 2: Character Extraction
    const segments = this.segmenter.segment(binary, roi);
    const matches = this.ocrEngine.recognize(segments);
    const rawString = matches.map(m => m.char).join('');

    // Layer 3: Parsing & Validation
    const result = this.extractor.extract(rawString, {
      frameQuality: 100, // Placeholder
      startTime
    });

    return result;
  }

  private ensureImageData(input: HTMLCanvasElement | HTMLImageElement | ImageData): ImageData {
    if (input instanceof ImageData) return input;
    
    const canvas = input instanceof HTMLCanvasElement ? input : this.imageToCanvas(input);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    return canvas;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: (...args: any[]) => void): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  registerBank(spec: BankSpec): void {
    this.bankRegistry.register(spec);
  }

  /** Internal helper to emit events to listeners. */
  private emit(event: string, ...args: any[]): void {
    if (event === 'result') {
      const result = args[0] as CMC7Result;
      if (this.iteratorResolvers.length > 0) {
        const resolver = this.iteratorResolvers.shift()!;
        resolver({ value: result, done: false });
      } else {
        this.iteratorQueue.push(result);
      }
    }

    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<CMC7Result> {
    return {
      next: (): Promise<IteratorResult<CMC7Result>> => {
        if (this.iteratorQueue.length > 0) {
          return Promise.resolve({ value: this.iteratorQueue.shift()!, done: false });
        }
        return new Promise(resolve => {
          this.iteratorResolvers.push(resolve);
        });
      }
    };
  }
}

/**
 * Creates and initializes a CMC-7 reader instance.
 */
export async function createCMC7Reader(
  options: CMC7ReaderOptions = {},
): Promise<CMC7Reader> {
  // Check for WebAssembly support (RNF-003)
  if (typeof WebAssembly !== 'object' || !WebAssembly.instantiate) {
    throw {
      type: 'INIT_ERROR',
      message: 'WebAssembly not supported in this environment',
      cause: 'webassembly-not-supported'
    } as CMC7Error;
  }

  const reader = new ReaderImpl(options);
  
  // Environment check will follow in integration
  
  return reader;
}

