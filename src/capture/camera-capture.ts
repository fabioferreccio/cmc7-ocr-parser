import { detectEnvironment } from './environment-detector.js';


export type CameraCaptureEvent = 'unsupported-environment' | 'error';

/**
 * Manages the camera MediaStream and binding to HTMLVideoElement.
 *
 * @remarks
 * Handles permissions and secure context checks (docs/03-arquitetura.md §1.1).
 */
export class CameraCapture {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private handlers: Map<string, Array<(...args: any[]) => void>> = new Map();

  /**
   * Starts the camera capture.
   *
   * @param videoElement - The target video element to attach the stream to.
   * @param constraints - Optional MediaTrackConstraints.
   * @throws CMC7PermissionError | CMC7InitError
   */
  async start(
    videoElement: HTMLVideoElement,
    constraints?: MediaTrackConstraints,
  ): Promise<void> {
    const env = detectEnvironment();

    if (!env.isHTTPS) {
      throw {
        type: 'INIT_ERROR',
        message: 'Acesso à câmera requer HTTPS ou localhost.',
        cause: 'wasm-load-failed', // Reusando campo da interface, embora a causa seja segurança
      } as const;
    }

    if (env.isWKWebView || !env.hasCamera) {
      this.emit('unsupported-environment', env);
      throw {
        type: 'UNSUPPORTED_ENVIRONMENT',
        message: 'Ambiente não suportado.',
        environment: env,
        userGuidance: env.userGuidance,
      } as const;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          ...constraints,
        },
        audio: false,
      });

      this.videoElement = videoElement;
      this.videoElement.srcObject = this.stream;
      
      // video.play() returns a Promise that resolves when playback starts
      await this.videoElement.play();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw {
          type: 'CAMERA_PERMISSION_DENIED',
          message: 'Permissão de câmera negada pelo usuário.',
        } as const;
      }
      throw error;
    }
  }

  /**
   * Stops the capture and releases all resources.
   */
  async stop(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * Simple event emitter implementation.
   */
  on(event: CameraCaptureEvent, handler: (...args: any[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
    return this;
  }

  private emit(event: CameraCaptureEvent, ...args: any[]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }
}
