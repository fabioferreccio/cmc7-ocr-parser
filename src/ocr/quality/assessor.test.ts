import { describe, it, expect, beforeEach } from 'vitest';
import { FrameQualityAssessor } from './assessor.js';
import { mockImageData } from '../../test-helpers/mocks.js';

describe('FrameQualityAssessor', () => {
  let assessor: FrameQualityAssessor;

  beforeEach(() => {
    assessor = new FrameQualityAssessor();
  });

  it('deve rejeitar imagem com muito blur (variância baixa)', () => {
    // Imagem uniforme (zero variância)
    const blurImg = mockImageData(100, 100);
    blurImg.data.fill(128); 

    const report = assessor.assess(blurImg, 40);
    expect(report.shouldProcess).toBe(false);
    expect(report.issues).toContain('blur');
  });

  it('deve rejeitar imagem com baixo contraste', () => {
    const lowContrastImg = mockImageData(100, 100);
    // Pixels variando pouco (ex: cinza sobre cinza)
    for (let i = 0; i < lowContrastImg.data.length; i += 4) {
      const v = 120 + (i % 5);
      lowContrastImg.data[i] = v;
      lowContrastImg.data[i+1] = v;
      lowContrastImg.data[i+2] = v;
      lowContrastImg.data[i+3] = 255;
    }

    const report = assessor.assess(lowContrastImg, 40);
    expect(report.shouldProcess).toBe(false);
    expect(report.issues).toContain('low-contrast');
  });

  it('deve rejeitar imagem com brilho excessivo (glare)', () => {
    const glareImg = mockImageData(100, 100);
    glareImg.data.fill(250); 

    const report = assessor.assess(glareImg, 40);
    expect(report.shouldProcess).toBe(false);
    expect(report.issues).toContain('glare');
  });

  it('deve aceitar imagem nítida e bem iluminada', () => {
    const goodImg = mockImageData(100, 100);
    // Padrão de alta frequência (alternando preto e branco para forçar variância e contraste)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const i = (y * 100 + x) * 4;
        const v = (x + y) % 2 === 0 ? 20 : 200;
        goodImg.data[i] = v;
        goodImg.data[i+1] = v;
        goodImg.data[i+2] = v;
        goodImg.data[i+3] = 255;
      }
    }



    const report = assessor.assess(goodImg, 40);
    expect(report.shouldProcess).toBe(true);
    expect(report.issues.length).toBe(0); // No issues expected

    expect(report.score).toBeGreaterThan(60);
  });
});
