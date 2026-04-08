/**
 * PoC de Segmentação CMC-7 — Benchmark de Algoritmos (T-002)
 *
 * Objetivo: Validar a acurácia da detecção de faixa (ROI) e segmentação de caracteres
 * usando projeção horizontal/vertical e componentes conectados simplificados.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// --- Mocks para ambiente sem 'canvas' nativo ---

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

// --- Algoritmos da PoC (Simulação das Camadas 1 e 2) ---

/**
 * Converte para escala de cinza (L1 Step 2)
 */
function toGrayscale(imageData: MockImageData): MockImageData {
  const { width, height, data } = imageData;
  const gray = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round(data[i]! * 0.299 + data[i+1]! * 0.587 + data[i+2]! * 0.114);
    gray[i] = gray[i+1] = gray[i+2] = v;
    gray[i+3] = 255;
  }
  return new MockImageData(gray, width, height);
}

/**
 * Threshold adaptativo simplificado (L2 Step 5)
 */
function simpleThreshold(imageData: MockImageData, threshold = 128): MockImageData {
  const { width, height, data } = imageData;
  const binary = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]! > threshold ? 255 : 0;
    binary[i] = binary[i+1] = binary[i+2] = v;
    binary[i+3] = 255;
  }
  return new MockImageData(binary, width, height);
}

/**
 * Detecta a faixa CMC-7 via Projeção Horizontal (L1 Step 8)
 */
function detectStrip(binaryImageData: MockImageData): { y: number; height: number } | null {
  const { width, height, data } = binaryImageData;
  const projection = new Int32Array(height).fill(0);

  // Considerar pixels pretos (valor 0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] === 0) {
        projection[y]++;
      }
    }
  }

  // Encontrar região com mais de 15% de densidade de pixels pretos
  const minDensity = width * 0.15;
  let startY = -1;
  const maxRegions: { y: number; height: number }[] = [];

  for (let y = 0; y < height; y++) {
    if (projection[y]! > minDensity) {
      if (startY === -1) startY = y;
    } else {
      if (startY !== -1) {
        const h = y - startY;
        if (h > 10) { // altura mínima
          maxRegions.push({ y: startY, height: h });
        }
        startY = -1;
      }
    }
  }

  // Retornar a região mais alta (CMC-7 costuma ter altura uniforme)
  if (maxRegions.length === 0) return null;
  return maxRegions.sort((a, b) => b.height - a.height)[0] || null;
}

/**
 * Segmenta caracteres via Projeção Vertical (L2 Step 1-4 simplificado)
 */
function segmentCharacters(stripImageData: MockImageData): { x: number; w: number }[] {
  const { width, height, data } = stripImageData;
  const projection = new Int32Array(width).fill(0);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4] === 0) {
        projection[x]++;
      }
    }
  }

  let startX = -1;
  const segments: { x: number; w: number }[] = [];

  for (let x = 0; x < width; x++) {
    const hasPixel = projection[x]! > 1; // algum ruído tolerado
    if (hasPixel && startX === -1) {
      startX = x;
    } else if (!hasPixel && startX !== -1) {
      const w = x - startX;
      if (w > 5) { // largura mínima de um caractere CMC-7
        segments.push({ x: startX, w });
      }
      startX = -1;
    }
  }

  return segments;
}

// --- Benchmark ---

describe('T-002 — PoC de Segmentação (Benchmark)', () => {
  const pocDir = join(process.cwd(), 'poc');
  const imagesDir = join(pocDir, 'images');
  const resultsDir = join(pocDir, 'results');

  beforeAll(() => {
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });
    if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  });

  it('deve segmentar Amostra Sintética Nítida', () => {
    const width = 800;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4).fill(255); // Fundo branco

    // Desenhar "faixa CMC-7" fake (blocos pretos)
    for (let i = 0; i < 30; i++) {
       const startX = 50 + i * 20;
       const endX = startX + 12;
       const startY = 80;
       const endY = 120;
       
       for (let y = startY; y < endY; y++) {
         for (let x = startX; x < endX; x++) {
           const idx = (y * width + x) * 4;
           data[idx] = 0; // Black
           data[idx+1] = 0;
           data[idx+2] = 0;
           data[idx+3] = 255;
         }
       }
    }

    const rawData = new MockImageData(data, width, height);
    const gray = toGrayscale(rawData);
    const binary = simpleThreshold(gray, 127);
    
    const strip = detectStrip(binary);
    expect(strip).not.toBeNull();
    expect(strip!.y).toBeGreaterThan(50);
    expect(strip!.y).toBeLessThan(100);
    expect(strip!.height).toBeGreaterThan(30);

    // Sub-imagem da strip
    const stripW = width;
    const stripH = strip!.height;
    const stripPixels = new Uint8ClampedArray(stripW * stripH * 4);
    for (let y = 0; y < stripH; y++) {
      const sourceY = y + strip!.y;
      const sourceOffset = sourceY * width * 4;
      const targetOffset = y * stripW * 4;
      stripPixels.set(data.subarray(sourceOffset, sourceOffset + stripW * 4), targetOffset);
    }
    
    const stripData = new MockImageData(stripPixels, stripW, stripH);
    const segments = segmentCharacters(stripData);
    
    // Deve encontrar 30 segmentos
    expect(segments.length).toBe(30);
    
    console.log(`[T-002] Segmentos detectados na imagem sintética: ${segments.length}`);
  });

  it('deve lidar com ruído e falha graciosamente', () => {
    const width = 800;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);

    // Desenhar algo que NÃO parece com a faixa densa do CMC-7 (pixels esparsos)
    for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const idx = (y * width + x) * 4;
        data[idx] = data[idx+1] = data[idx+2] = 100; // Gray noise
    }

    const rawData = new MockImageData(data, width, height);
    const binary = simpleThreshold(toGrayscale(rawData), 50);
    
    const strip = detectStrip(binary);
    // Não deve detectar faixa CMC-7 em ruído aleatório esparso
    expect(strip).toBeNull();
  });
});
