import type { CMC7ReaderOptions } from '../types/index.js';

export type FrameSamplerEvent = 'frame';

/**
 * Periodically samples frames from a HTMLVideoElement.
 *
 * @remarks
 * Uses createImageBitmap for efficiency (docs/03-arquitetura.md §1.1).
 */
export class FrameSampler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private readonly intervalMs: number;
  private handlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  constructor(
    private readonly videoElement: HTMLVideoElement,
    options: Pick<CMC7ReaderOptions, 'frameIntervalMs'> = {},
  ) {
    this.intervalMs = options.frameIntervalMs ?? 300;
  }

  /**
   * Starts periodic sampling.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      void this.sample();
    }, this.intervalMs);
  }

  /**
   * Stops sampling.
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async sample(): Promise<void> {
    if (!this.isRunning) return;

    // Boundary check: video must have dimensions
    if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
      return;
    }

    try {
      // DECISÃO (AD-01): Usamos ImageBitmap transferível para eficiência.
      const bitmap = await createImageBitmap(this.videoElement);
      this.emit('frame', bitmap);
    } catch (error) {
      // Silently fail frame capture (e.g. video paused/stopped)
    }
  }

  /**
   * Simple event emitter implementation.
   */
  on(event: FrameSamplerEvent, handler: (...args: unknown[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
    return this;
  }

  private emit(event: FrameSamplerEvent, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }
}
