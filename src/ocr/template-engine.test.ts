import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateEngine } from './template-engine.js';
import { mockImageData } from '../test-helpers/mocks.js';
import type { Segment } from './symbol-segmenter.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    // Inject custom templates for deterministic testing. 
    // This avoids dependency on the real build-time python generated templates, 
    // ensuring the unit test passes regardless of the template image shapes.
    const customTemplates = {
      '0': createPattern(2048, 0),    // Preenchido com 0
      '1': createPattern(2048, 100),  // Preenchido com 100
      '2': createPattern(2048, 255),  // Preenchido com 255
    } as any;

    engine = new TemplateEngine(customTemplates);
  });

  it('deve retornar o caractere com o maior score de correlação (exato)', () => {
    // Simula um segmento que é exatamente igual ao template "0" (valor 0)
    const segment = createMockSegment(createPattern(2048, 0));
    
    const result = engine.recognizeSegment(segment);
    expect(result.char).toBe('0');
    expect(result.score).toBe(1.0); // 100% de similaridade
  });

  it('deve retornar a escolha correta com leve ruído tolerável (score > 0.85)', () => {
    // Simula um template "1" (valor base 100) com um "ruído"
    // No nosso algoritmo, o max diff por pixel seria 255, 
    // um desvio de 20 sobre 255 é pequeno e deve manter o score bem alto.
    const noiseArray = createPattern(2048, 120); 
    const segment = createMockSegment(noiseArray);

    const result = engine.recognizeSegment(segment);
    // Qual é o mais próximo de 120? O '1' (que é 100).
    expect(result.char).toBe('1');
    expect(result.score).toBeGreaterThan(0.85);
  });

  it('deve processar múltiplos segmentos via recognize() mantendo a ordem X', () => {
    const segments: Segment[] = [
      { x: 50, y: 0, width: 20, height: 40, imageData: createRgbaImageDataFromGreyscale(createPattern(2048, 255)) }, // Match '2'
      { x: 10, y: 0, width: 20, height: 40, imageData: createRgbaImageDataFromGreyscale(createPattern(2048, 0)) },   // Match '0'
    ];

    // Ordenamos como se o SymbolSegmenter já tivesse ordenado por X
    segments.sort((a, b) => a.x - b.x);

    const results = engine.recognize(segments);
    
    expect(results).toHaveLength(2);
    expect(results[0]!.char).toBe('0'); // x=10
    expect(results[1]!.char).toBe('2'); // x=50
  });

  it('deve retornar um caractere "?" se nenhum template exceder o limite mínimo (Threshold)', () => {
    // Limite padrão usualmente é configurado (ex: 0.5 ou 0.6).
    // O template '1' é 100, mas o motor recebe algo muito diferente (ex: padrao xadrez que dá match baixo com tudo)
    // Para simplificar, vou alterar o threshold no motor se for injetável.
    // Com padrão 0 VS 255, a similaridade de 0 com 255 é 0.0.
    engine = new TemplateEngine({ '0': createPattern(2048, 0) } as any, 0.95 /* threshold muito alto */);
    
    // Segmento tem valor 128 (distância 128 de 0 == ~0.5 score)
    const segment = createMockSegment(createPattern(2048, 128));
    
    const result = engine.recognizeSegment(segment);
    expect(result.char).toBe('?');
    expect(result.score).toBeLessThan(0.95);
  });
});

// -- Utils para testes

function createPattern(length: number, value: number): Uint8Array {
  const arr = new Uint8Array(length);
  arr.fill(value);
  return arr;
}

function createRgbaImageDataFromGreyscale(greyscale: Uint8Array): ImageData {
  const img = mockImageData(32, 64);
  for(let i=0; i<2048; i++) {
    const val = greyscale[i]!;
    img.data[i*4] = val;
    img.data[i*4+1] = val;
    img.data[i*4+2] = val;
    img.data[i*4+3] = 255;
  }
  return img;
}

function createMockSegment(greyscale: Uint8Array): Segment {
  return {
    x: 0, y: 0, width: 32, height: 64,
    imageData: createRgbaImageDataFromGreyscale(greyscale)
  };
}
