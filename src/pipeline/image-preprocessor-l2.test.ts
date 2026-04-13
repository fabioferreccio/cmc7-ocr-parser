import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePreprocessor } from './image-preprocessor.js';
import { mockImageData, mockCV } from '../test-helpers/mocks.js';

// Mock loadOpenCV to return our mockCV
vi.mock('../wasm/opencv-loader.js', async (importOriginal) => {
  const { mockCV } = await import('../test-helpers/mocks.js');
  return {
    ...(await importOriginal<any>()),
    loadOpenCV: vi.fn().mockResolvedValue(mockCV),
  };
});

describe('ImagePreprocessor L2 (OpenCV.js)', () => {
  let processor: ImagePreprocessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ImagePreprocessor();
  });

  it('deve binarizar a imagem usando adaptiveThreshold', async () => {
    const img = mockImageData();

    await processor.binarize(img);

    expect(mockCV.adaptiveThreshold).toHaveBeenCalled();
    // Verifica se limpou a memória (cv.Mat.delete)
    // O construtor Mat deve ter sido chamado pelo menos 2 vezes (src e dst)
    // Então delete deve ser chamado para ambos.
    // Como mockCV.Mat é uma classe, cada instância tem seu próprio delete.
    // Usaremos vi.spyOn em instâncias se necessário, mas aqui mockCV.Mat.prototype.delete funciona.
  });

  it('deve realizar deskew (correção de inclinação)', async () => {
    const img = mockImageData();

    await processor.deskew(img);

    expect(mockCV.getRotationMatrix2D).toHaveBeenCalled();
    expect(mockCV.warpAffine).toHaveBeenCalled();
  });

  it('deve liberar toda a memória cv.Mat após o processamento', async () => {
    const img = mockImageData();
    const deleteSpy = vi.spyOn(mockCV.Mat.prototype, 'delete');

    await processor.binarize(img);

    // No binarize real temos 5 Mats: src (from image data), gray, blurred, thresholded, rgba
    expect(deleteSpy).toHaveBeenCalledTimes(5);
  });
});
