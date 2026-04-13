/** 
 * Represents the detection region for the CMC-7 strip.
 */
export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ROIDetector {
  // Configuração baseada na anatomia do CMC-7 (docs/03-arquitetura.md)
  private readonly MIN_WIDTH_PERCENT = 0.3; // 30% da largura deve ter pixels pretos
  private readonly MIN_STRIP_HEIGHT = 15;   // Altura mínima esperada (pixels)
  private readonly MAX_STRIP_HEIGHT = 100;  // Altura máxima esperada (pixels)

  /**
   * Detects the y-position and height of the CMC-7 strip.
   *
   * @param binaryImageData - Binarized image data (single channel logic).
   * @returns The detected ROI or null if not found.
   */
  detect(binaryImageData: ImageData): ROI | null {
    const { width, height, data } = binaryImageData;
    const projection = new Int32Array(height);

    // 1. Projeção Horizontal: Conta pixels pretos (< 128) por linha
    for (let y = 0; y < height; y++) {
      let blackPixels = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Na binarização, R=G=B. Olhamos apenas o R.
        if (data[idx]! < 128) {
          blackPixels++;
        }
      }
      projection[y]! = blackPixels;
    }

    // 2. Identificação da maior sequência de linhas densas
    let bestY = -1;
    let bestHeight = 0;
    
    let currentStart = -1;
    let currentHeight = 0;

    const threshold = width * this.MIN_WIDTH_PERCENT;

    for (let y = 0; y < height; y++) {
      if (projection[y]! >= threshold) {
        if (currentStart === -1) currentStart = y;
        currentHeight++;
      } else {
        if (currentHeight > 0) {
          if (this.isValidStrip(currentHeight) && currentHeight > bestHeight) {
            bestY = currentStart;
            bestHeight = currentHeight;
          }
          // Reset
          currentStart = -1;
          currentHeight = 0;
        }
      }
    }

    // Verifica última sequência se a imagem terminar em preto
    if (currentHeight > 0 && this.isValidStrip(currentHeight) && currentHeight > bestHeight) {
      bestY = currentStart;
      bestHeight = currentHeight;
    }

    if (bestY === -1) return null;

    return { 
      x: 0, 
      y: bestY, 
      width: width, 
      height: bestHeight 
    };
  }

  private isValidStrip(height: number): boolean {
    return height >= this.MIN_STRIP_HEIGHT && height <= this.MAX_STRIP_HEIGHT;
  }
}
