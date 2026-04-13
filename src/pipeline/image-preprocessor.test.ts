import { describe, it, expect, beforeEach } from 'vitest';
import { ImagePreprocessor } from './image-preprocessor.js';
import { mockImageBitmap } from '../test-helpers/mocks.js';

describe('ImagePreprocessor', () => {
  let preprocessor: ImagePreprocessor;

  beforeEach(() => {
    preprocessor = new ImagePreprocessor();
  });

  it('deve redimensionar imagem respeitando largura máxima de 960px', async () => {
    // Simula uma imagem 1920x1080
    const largeBitmap = mockImageBitmap(1920, 1080);
    const result = await preprocessor.process(largeBitmap);

    expect(result.canvas.width).toBe(960);
    expect(result.canvas.height).toBe(540);
  });

  it('deve manter dimensões originais se largura for menor que 960px', async () => {
    const smallBitmap = mockImageBitmap(800, 600);
    const result = await preprocessor.process(smallBitmap);

    expect(result.canvas.width).toBe(800);
    expect(result.canvas.height).toBe(600);
  });

  it('deve aplicar crop da ROI (terço inferior 40%) se solicitado', async () => {
    const bitmap = mockImageBitmap(1000, 1000);
    // Configuração de ROI definida na arquitetura: 60% a 100% da altura
    const result = await preprocessor.process(bitmap, { roiCrop: true });

    expect(result.canvas.width).toBe(960); // Redimensionado primeiro
    expect(result.canvas.height).toBe(384); // 960 * (1000/1000) * 0.4 = 384
  });

  it('deve retornar ImageData em tons de cinza se solicitado', async () => {
    const bitmap = mockImageBitmap(100, 100);
    const result = await preprocessor.process(bitmap, { grayscale: true });

    expect(result.imageData).toBeDefined();
    expect(result.imageData?.width).toBe(100);
  });
});
