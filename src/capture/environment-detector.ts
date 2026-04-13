import type { EnvironmentInfo } from '../types/index.js';

/**
 * Detects browser environment compatibility for CMC-7 reading.
 *
 * @remarks
 * Handles the Safari vs. WKWebView distinction on iOS which is critical
 * for getUserMedia availability (docs/03-arquitetura.md §1.1).
 *
 * @returns Object including compatibility flags and user guidance.
 */
export function detectEnvironment(): EnvironmentInfo & { userGuidance: string } {
  const ua = navigator.userAgent;

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  // Safari detection (Safari identifies as Safari, but not as Chrome/Firefox/etc.)
  // On iOS, Chrome is "CriOS" and Firefox is "FxiOS"
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  // WKWebView is generally any browser on iOS that is NOT the system Safari
  const isWKWebView = isIOS && !isSafari;

  const hasCamera = !!navigator.mediaDevices?.getUserMedia;

  const isHTTPS =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  let userGuidance = '';
  if (isWKWebView) {
    userGuidance =
      'Para utilizar a câmera, abra este site diretamente no navegador Safari do seu iPhone/iPad.';
  } else if (!isHTTPS && location.hostname !== 'localhost') {
    userGuidance = 'O acesso à câmera requer uma conexão segura (HTTPS).';
  } else if (!hasCamera) {
    userGuidance = 'Câmera não detectada ou acesso não suportado neste navegador.';
  }

  return {
    isIOS,
    isSafari,
    isWKWebView,
    hasCamera,
    isHTTPS,
    userGuidance,
  };
}
