import { useState, useEffect, useCallback, useRef } from 'react';
import { createCMC7Reader } from './reader';
import type {
  CMC7Reader,
  CMC7ReaderOptions,
  CMC7Result,
  FrameQualityReport,
  CMC7Error,
} from './types/index.js';

/**
 * Hook React para gerenciar o ciclo de vida do leitor CMC-7.
 *
 * @param options - Opções de configuração do leitor.
 * @returns Objeto contendo o estado do leitor e funções de controle.
 *
 * @example
 * ```tsx
 * function Scanner() {
 *   const videoRef = useRef<HTMLVideoElement>(null);
 *   const { result, isReady, start } = useCMC7Reader();
 *
 *   useEffect(() => {
 *     if (isReady && videoRef.current) {
 *       start(videoRef.current);
 *     }
 *   }, [isReady, start]);
 *
 *   return <video ref={videoRef} />;
 * }
 * ```
 */
export function useCMC7Reader(options?: CMC7ReaderOptions): {
  reader: CMC7Reader | null;
  isReady: boolean;
  result: CMC7Result | null;
  lastQuality: FrameQualityReport | null;
  error: CMC7Error | null;
  isReading: boolean;
  start: (videoElement: HTMLVideoElement) => Promise<void>;
  stop: () => Promise<void>;
} {
  const [reader, setReader] = useState<CMC7Reader | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState<CMC7Result | null>(null);
  const [lastQuality, setLastQuality] = useState<FrameQualityReport | null>(null);
  const [error, setError] = useState<CMC7Error | null>(null);
  const [isReading, setIsReading] = useState(false);

  const readerRef = useRef<CMC7Reader | null>(null);

  useEffect(() => {
    let active = true;

    // Inicialização assíncrona — createCMC7Reader retorna Promise<CMC7Reader>
    void createCMC7Reader(options).then((newReader) => {
      // Se o componente foi desmontado durante a inicialização (StrictMode),
      // paramos o reader imediatamente.
      if (!active) {
        void newReader.stop();
        return;
      }

      newReader.on('result', (res: CMC7Result) => setResult(res));
      newReader.on('frame-quality', (q: FrameQualityReport) => setLastQuality(q));
      newReader.on('error', (err: CMC7Error) => setError(err));
      newReader.on('reading', () => setIsReading(true));

      readerRef.current = newReader;
      setReader(newReader);
      setIsReady(true);
    });

    return () => {
      active = false;
      if (readerRef.current) {
        // DECISÃO (AD-08): Stop automático na desmontagem.
        // Garante que a câmera seja liberada e recursos WASM limpos.
        void readerRef.current.stop();
        readerRef.current = null;
      }
    };
    // eslint-disable-next-line -- options intentionally omitted from deps: initialized once per mount
  }, []); // Só inicializa uma vez por montagem

  const start = useCallback(async (videoElement: HTMLVideoElement) => {
    if (readerRef.current) {
      await readerRef.current.start(videoElement);
      setIsReading(true);
    }
  }, []);

  const stop = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.stop();
      setIsReading(false);
      setResult(null);
    }
  }, []);

  return {
    reader,
    isReady,
    result,
    lastQuality,
    error,
    isReading,
    start,
    stop,
  };
}
