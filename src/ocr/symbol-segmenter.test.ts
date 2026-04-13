import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SymbolSegmenter } from './symbol-segmenter.js';
import { mockCV, mockImageData } from '../test-helpers/mocks.js';

// Mock loadOpenCV
vi.mock('../wasm/opencv-loader.js', async (importOriginal) => {
  const { mockCV } = await import('../test-helpers/mocks.js');
  return {
    ...(await importOriginal<any>()),
    loadOpenCV: vi.fn().mockResolvedValue(mockCV),
  };
});

describe('SymbolSegmenter', () => {
  let segmenter: SymbolSegmenter;

  beforeEach(() => {
    vi.clearAllMocks();
    segmenter = new SymbolSegmenter();

    // Setup mock findContours to return some fake boxes if needed.
    // However, since we might use OpenCV in the implementation, we need mockCV to support basic contour logic or we can mock cv methods.
    // To simplify the unit test, we can just spy on the segment implementation if we use pure Math/vertical projection,
    // OR we provide a mock cv.findContours that works.
    // The easiest way to test this logic without full OpenCV is to use vertical projection in the actual implementation, which is faster and doesn't need WASM!
  });

  it('deve segmentar caracteres agrupando barras com distância < 5px', () => {
    // Vamos criar uma faixa imaginária. Binarizada: 0 é preto, 255 é branco
    const img = mockImageData(200, 50);
    img.data.fill(255); // Branco

    // Desenha Caractere 1 (duas barras próximas)
    drawBar(img, 10, 10, 5, 30); // x=10, w=5
    drawBar(img, 18, 10, 5, 30); // x=18, w=5 (distância 3px)

    // Desenha Caractere 2 (longe do Caractere 1)
    drawBar(img, 50, 10, 5, 30);
    drawBar(img, 58, 10, 5, 30);

    const segments = segmenter.segment(img);
    expect(segments).toHaveLength(2);

    // As caixas delimitadoras (bounding boxes) devem englobar as duas barras
    expect(segments[0]!.x).toBe(10);
    expect(segments[0]!.width).toBe(13); // 18 + 5 - 10

    expect(segments[1]!.x).toBe(50);
    expect(segments[1]!.width).toBe(13);
  });

  it('deve filtrar ruídos com altura < 30% da faixa', () => {
    const img = mockImageData(200, 50);
    img.data.fill(255);

    // Caractere válido
    drawBar(img, 10, 10, 20, 30); // altura 30 (60% de 50)

    // Ruído
    drawBar(img, 80, 25, 10, 10); // altura 10 (20% de 50) -> deve ser ignorado

    const segments = segmenter.segment(img);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.x).toBe(10);
  });

  it('deve normalizar cada segmento para 32x64', () => {
    const img = mockImageData(200, 50);
    img.data.fill(255);
    drawBar(img, 10, 10, 15, 30); // Um caractere qualquer

    const segments = segmenter.segment(img);
    expect(segments).toHaveLength(1);

    const charImg = segments[0]!.imageData;
    expect(charImg.width).toBe(32);
    expect(charImg.height).toBe(64);
  });

  // Função auxiliar para desenhar no mockImageData
  function drawBar(img: ImageData, x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        const idx = (j * img.width + i) * 4;
        img.data[idx] = 0; // Black
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
      }
    }
  }
});
