import type { ROI } from '../pipeline/roi-detector.js';

export interface Segment {
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: ImageData; // The 32x64 normalized crop
}

export class SymbolSegmenter {
  private readonly MAX_GAP = 5; // distâncias < 5px são fundidas
  private readonly MIN_HEIGHT_PERCENT = 0.3; // 30% da altura da imagem

  /**
   * Segments the CMC-7 strip into individual characters.
   * 
   * @param image - The binarized image.
   * @param roi - Optional region of interest.
   * @returns Array of ordered, normalized segments (32x64px).
   */
  segment(image: ImageData, roi?: ROI): Segment[] {
    const { width, height, data } = image;
    
    // Bounds to scan
    const startX = roi ? roi.x : 0;
    const endX = roi ? roi.x + roi.width : width;
    const startY = roi ? roi.y : 0;
    const endY = roi ? roi.y + roi.height : height;

    const colHasPixel = new Array(width).fill(false);
    const colMinY = new Array(width).fill(height);
    const colMaxY = new Array(width).fill(0);

    // 1. Scan columns
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const idx = (y * width + x) * 4;
        if (data[idx]! < 128) { // Black pixel
          colHasPixel[x] = true;
          if (y < colMinY[x]) colMinY[x] = y;
          if (y > colMaxY[x]) colMaxY[x] = y;
        }
      }
    }

    // 2. Group columns into raw segments
    const rawSegments: { x: number; width: number; y: number; height: number }[] = [];
    let currentSeg: { startX: number; endX: number; minY: number; maxY: number } | null = null;
    let gapCount = 0;

    for (let x = 0; x < width; x++) {
      if (colHasPixel[x]) {
        if (!currentSeg) {
          currentSeg = { startX: x, endX: x, minY: colMinY[x], maxY: colMaxY[x] };
        } else {
          currentSeg.endX = x;
          if (colMinY[x] < currentSeg.minY) currentSeg.minY = colMinY[x];
          if (colMaxY[x] > currentSeg.maxY) currentSeg.maxY = colMaxY[x];
        }
        gapCount = 0;
      } else {
        if (currentSeg) {
          gapCount++;
          if (gapCount > this.MAX_GAP) {
            rawSegments.push({
              x: currentSeg.startX,
              width: currentSeg.endX - currentSeg.startX + 1,
              y: currentSeg.minY,
              height: currentSeg.maxY - currentSeg.minY + 1
            });
            currentSeg = null;
            gapCount = 0;
          }
        }
      }
    }
    
    // Close the last segment if open
    if (currentSeg) {
      rawSegments.push({
        x: currentSeg.startX,
        width: currentSeg.endX - currentSeg.startX + 1,
        y: currentSeg.minY,
        height: currentSeg.maxY - currentSeg.minY + 1
      });
    }

    // 3. Filter and normalize
    const minHeight = height * this.MIN_HEIGHT_PERCENT;
    const finalSegments: Segment[] = [];

    for (const seg of rawSegments) {
      if (seg.height >= minHeight) {
        finalSegments.push({
          ...seg,
          imageData: this.normalizeSegment(image, seg)
        });
      }
    }

    // Sort by X position (already sorted by nature of column scan, but explicit is good)
    finalSegments.sort((a, b) => a.x - b.x);

    return finalSegments;
  }

  private normalizeSegment(source: ImageData, box: { x: number; y: number; width: number; height: number }): ImageData {
    // We assume globalThis.ImageData exists (mocked in setup.ts for Node, native in browsers)
    const targetW = 32;
    const targetH = 64;
    const result = new ImageData(targetW, targetH);
    
    // Fill with white
    for (let i = 0; i < result.data.length; i++) {
        result.data[i] = 255;
    }

    // Nearest neighbor interpolation to map 32x64 back into the bounding box
    for (let ty = 0; ty < targetH; ty++) {
      for (let tx = 0; tx < targetW; tx++) {
        const sx = box.x + Math.floor((tx / targetW) * box.width);
        const sy = box.y + Math.floor((ty / targetH) * box.height);

        // Bounds check
        if (sx >= 0 && sx < source.width && sy >= 0 && sy < source.height) {
          const sIdx = (sy * source.width + sx) * 4;
          const tIdx = (ty * targetW + tx) * 4;

          result.data[tIdx]! = source.data[sIdx]!;
          result.data[tIdx + 1]! = source.data[sIdx + 1]!;
          result.data[tIdx + 2]! = source.data[sIdx + 2]!;
          result.data[tIdx + 3]! = source.data[sIdx + 3]!;
        }
      }
    }

    return result;
  }
}
