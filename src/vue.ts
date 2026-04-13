import { ref, onMounted, onUnmounted } from 'vue';
import { createCMC7Reader } from './reader';
import type {
  CMC7Reader,
  CMC7ReaderOptions,
  CMC7Result,
  FrameQualityReport,
  CMC7Error,
} from './types/index.js';

/**
 * Composable Vue 3 para gerenciar o leitor CMC-7.
 *
 * @param options - Opções de configuração do leitor.
 * @returns Objeto reativo contendo o estado e métodos de controle.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useCMC7Reader } from 'cmc7-ocr-parser/vue';
 * const { result, start } = useCMC7Reader();
 * </script>
 * ```
 */
export function useCMC7Reader(options?: CMC7ReaderOptions): {
  reader: import('vue').Ref<CMC7Reader | null>;
  isReady: import('vue').Ref<boolean>;
  result: import('vue').Ref<CMC7Result | null>;
  lastQuality: import('vue').Ref<FrameQualityReport | null>;
  error: import('vue').Ref<CMC7Error | null>;
  isReading: import('vue').Ref<boolean>;
  start: (videoElement: HTMLVideoElement) => Promise<void>;
  stop: () => Promise<void>;
} {
  const reader = ref<CMC7Reader | null>(null);
  const isReady = ref(false);
  const result = ref<CMC7Result | null>(null);
  const lastQuality = ref<FrameQualityReport | null>(null);
  const error = ref<CMC7Error | null>(null);
  const isReading = ref(false);

  onMounted(async () => {
    const newReader = await createCMC7Reader(options);

    newReader.on('result', (res: CMC7Result) => {
      result.value = res;
    });
    newReader.on('frame-quality', (q: FrameQualityReport) => {
      lastQuality.value = q;
    });
    newReader.on('error', (err: CMC7Error) => {
      error.value = err;
    });
    newReader.on('reading', () => {
      isReading.value = true;
    });

    reader.value = newReader;
    isReady.value = true;
  });

  onUnmounted(async () => {
    if (reader.value) {
      await reader.value.stop();
      reader.value = null;
    }
  });

  const start = async (videoElement: HTMLVideoElement): Promise<void> => {
    if (reader.value) {
      await reader.value.start(videoElement);
      isReading.value = true;
    }
  };

  const stop = async (): Promise<void> => {
    if (reader.value) {
      await reader.value.stop();
      isReading.value = false;
      result.value = null;
    }
  };

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
