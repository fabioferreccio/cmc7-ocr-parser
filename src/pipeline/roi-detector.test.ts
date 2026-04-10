import { describe, it, expect, beforeEach } from 'vitest';
import { ROIDetector } from './roi-detector.js';
import { mockImageData } from '../test-helpers/mocks.js';

describe('ROIDetector', () => {
  let detector: ROIDetector;

  beforeEach(() => {
    detector = new ROIDetector();
  });

  it('deve detectar a faixa CMC-7 em uma imagem binarizada ideal', () => {
    // Imagem 960x200 (ROI do Preprocessor)
    const img = mockImageData(960, 200);
    // Em imagem binarizada preta=0, branca=255
    img.data.fill(255); 

    // Desenha uma "faixa" preta entre y=80 e y=120 (altura 40)
    const stripY = 80;
    const stripHeight = 40;
    for (let y = stripY; y < stripY + stripHeight; y++) {
      for (let x = 100; x < 860; x++) { 
        const idx = (y * 960 + x) * 4;
        img.data[idx] = 0; // Black
        img.data[idx+1] = 0;
        img.data[idx+2] = 0;
        img.data[idx+3] = 255;
      }
    }

    const roi = detector.detect(img);
    expect(roi).not.toBeNull();
    expect(roi!.y).toBeGreaterThanOrEqual(stripY - 2);
    expect(roi!.y).toBeLessThanOrEqual(stripY + 2);
    expect(roi!.height).toBeGreaterThanOrEqual(stripHeight - 2);
  });

  it('deve retornar null se não houver faixa detectável', () => {
    const img = mockImageData(960, 200);
    img.data.fill(255); // Branca
    
    expect(detector.detect(img)).toBeNull();
  });

  it('deve ignorar ruídos pequenos (faixas muito estreitas)', () => {
    const img = mockImageData(960, 200);
    img.data.fill(255);

    // Desenha um "ponto" ou faixa curta que não deve ser CMC-7
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 50; x++) { // Apenas 40px de largura
        const idx = (y * 960 + x) * 4;
        img.data[idx] = 0;
      }
    }

    expect(detector.detect(img)).toBeNull();
  });
});
