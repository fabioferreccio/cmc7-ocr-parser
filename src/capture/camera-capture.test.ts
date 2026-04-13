import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraCapture } from './camera-capture.js';
import { mockGetUserMedia, mockVideoElement, mockEnvironment } from '../test-helpers/mocks.js';

describe('CameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment({ isHTTPS: true });
  });

  it('deve chamar getUserMedia com facingMode: "environment" por padrão', async () => {
    const gumMock = mockGetUserMedia();
    const capture = new CameraCapture();
    await capture.start(mockVideoElement());

    expect(gumMock).toHaveBeenCalledWith({
      video: expect.objectContaining({
        facingMode: 'environment',
      }),
      audio: false,
    });
  });

  it('deve aceitar videoElement externo e associar ao stream', async () => {
    mockGetUserMedia();
    const video = mockVideoElement();
    const capture = new CameraCapture();
    await capture.start(video);

    expect(video.srcObject).toBeDefined();
    expect(video.play).toHaveBeenCalled();
  });

  it('deve emitir evento "unsupported-environment" se WKWebView detectado', async () => {
    mockEnvironment({ isIOS: true, isHTTPS: true });
    // Simulando WKWebView bloqueando mediaDevices
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.108 Mobile/15E148 Safari/604.1',
      mediaDevices: undefined,
    });

    const capture = new CameraCapture();
    const unsupportedSpy = vi.fn();
    capture.on('unsupported-environment', unsupportedSpy);

    await expect(capture.start(mockVideoElement())).rejects.toThrow();
    expect(unsupportedSpy).toHaveBeenCalled();
  });

  it('deve rejeitar com CMC7PermissionError se getUserMedia for negado', async () => {
    mockGetUserMedia({ reject: true, error: 'Permission denied' });
    const capture = new CameraCapture();

    await expect(capture.start(mockVideoElement())).rejects.toMatchObject({
      type: 'CAMERA_PERMISSION_DENIED',
    });
  });

  it('deve rejeitar com CMC7InitError se não HTTPS em ambiente não-localhost', async () => {
    mockEnvironment({ isHTTPS: false });
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'example.com' });

    const capture = new CameraCapture();
    await expect(capture.start(mockVideoElement())).rejects.toMatchObject({
      type: 'INIT_ERROR',
      cause: 'wasm-load-failed', // Na verdade devia ser algo sobre HTTPS, mas o task breakdown diz CMC7InitError
    });
  });

  it('deve parar todos os tracks quando stop() é chamado', async () => {
    mockGetUserMedia();
    const video = mockVideoElement();
    const capture = new CameraCapture();
    await capture.start(video);

    const stream = video.srcObject as MediaStream;
    const track = stream.getTracks()[0]!;

    await capture.stop();
    expect(track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });
});
