import type { 
  CMC7Reader, 
  CMC7ReaderOptions, 
  CMC7Result, 
  CMC7Error, 
  FrameQualityReport, 
  EnvironmentInfo,
  BankSpec
} from './types/index.js';

/**
 * Implementation of the CMC7Reader interface.
 * Coordinates between Capture, Pipeline, and Parser layers.
 */
class ReaderImpl implements CMC7Reader {
  private readonly handlers: Map<string, Set<(...args: any[]) => void>> = new Map();
  private isRunning = false;
  private iteratorQueue: CMC7Result[] = [];
  private iteratorResolvers: ((value: IteratorResult<CMC7Result>) => void)[] = [];

  constructor(private readonly options: CMC7ReaderOptions = {}) {}

  async start(videoElement: HTMLVideoElement): Promise<void> {
    this.isRunning = true;
    // Implementation will follow in subsequent tasks
  }

  async startCamera(container?: HTMLElement): Promise<HTMLVideoElement> {
    // Implementation will follow
    throw new Error('Method not implemented.');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    // Implementation will follow
  }

  async readImage(input: any): Promise<CMC7Result> {
    // Implementation will follow in T-020
    throw new Error('Method not implemented.');
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
    // Integration with BankRegistry will follow
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

