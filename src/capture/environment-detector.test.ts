import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectEnvironment } from './environment-detector.js';

describe('EnvironmentDetector', () => {
  const originalNavigator = global.navigator;
  const originalLocation = global.location;

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent: '',
      mediaDevices: { getUserMedia: vi.fn() },
    });
    vi.stubGlobal('location', {
      protocol: 'https:',
      hostname: 'example.com',
    });
  });

  afterEach(() => {
    vi.stubGlobal('navigator', originalNavigator);
    vi.stubGlobal('location', originalLocation);
  });

  it('deve detectar Safari iOS como ambiente compatível', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      mediaDevices: { getUserMedia: vi.fn() },
    });
    const info = detectEnvironment();
    expect(info.isIOS).toBe(true);
    expect(info.isSafari).toBe(true);
    expect(info.isWKWebView).toBe(false);
    expect(info.hasCamera).toBe(true);
  });

  it('deve detectar Chrome iOS como WKWebView (incompatível)', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.108 Mobile/15E148 Safari/604.1',
      mediaDevices: { getUserMedia: undefined },
    });
    const info = detectEnvironment();
    expect(info.isIOS).toBe(true);
    expect(info.isSafari).toBe(false);
    expect(info.isWKWebView).toBe(true);
    // Na WKWebView de terceiros no iOS, navigator.mediaDevices costuma ser undefined
    expect(info.hasCamera).toBe(false);
    expect(info.userGuidance).toContain('Safari');
  });

  it('deve detectar Chrome Android como compatível', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      mediaDevices: { getUserMedia: vi.fn() },
    });
    const info = detectEnvironment();
    expect(info.isIOS).toBe(false);
    expect(info.hasCamera).toBe(true);
  });

  it('deve detectar Safari desktop como compatível', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
      mediaDevices: { getUserMedia: vi.fn() },
    });
    const info = detectEnvironment();
    expect(info.isSafari).toBe(true);
    expect(info.isIOS).toBe(false);
  });

  it('deve retornar isHTTPS: false em protocolo HTTP', () => {
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'example.com' });
    const info = detectEnvironment();
    expect(info.isHTTPS).toBe(false);
  });

  it('deve retornar isHTTPS: true em localhost mesmo via HTTP', () => {
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
    const info = detectEnvironment();
    expect(info.isHTTPS).toBe(true);
  });

  it('deve retornar hasCamera: false quando mediaDevices é undefined', () => {
    vi.stubGlobal('navigator', { userAgent: '...', mediaDevices: undefined });
    const info = detectEnvironment();
    expect(info.hasCamera).toBe(false);
  });

  it('deve gerar userGuidance em português quando WKWebView detectado', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/117.0 Mobile/15E148 Safari/604.1',
      mediaDevices: undefined,
    });
    const info = detectEnvironment();
    expect(info.isWKWebView).toBe(true);
    expect(info.userGuidance).toMatch(/abra.*Safari/i);
  });
});
