/**
 * Pre-processes images for CMC-7 OCR.
 *
 * @remarks
 * Level 1 Pipeline: Uses Canvas API for low-latency resizing, grayscale conversion,
 * and ROI cropping (docs/03-arquitetura.md §1.2).
 */
export class ImagePreprocessor {
  private readonly MAX_WIDTH = 960;

  /**
   * Processes a frame from the camera.
   *
   * @param input - The raw frame (ImageBitmap or similar).
   * @param options - Processing options.
   * @returns Processed canvas and optional ImageData.
   */
  async process(
    input: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
    options: { grayscale?: boolean; roiCrop?: boolean } = {},
  ): Promise<{ canvas: HTMLCanvasElement; imageData?: ImageData }> {
    const { width: originalWidth, height: originalHeight } = input;

    // 1. Resize logic
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > this.MAX_WIDTH) {
      const ratio = this.MAX_WIDTH / originalWidth;
      targetWidth = this.MAX_WIDTH;
      targetHeight = originalHeight * ratio;
    }

    // Prepare canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // 2. Draw and Resize
    ctx.drawImage(input, 0, 0, targetWidth, targetHeight);

    // 3. ROI Crop (Bottom 40% typically contains judicial/bank code line)
    // Architecture §1.2: ROI Search Area is y: 60%-100%
    if (options.roiCrop) {
      const roiHeight = targetHeight * 0.4;
      const roiY = targetHeight * 0.6;
      
      const roiCanvas = document.createElement('canvas');
      roiCanvas.width = targetWidth;
      roiCanvas.height = roiHeight;
      const roiCtx = roiCanvas.getContext('2d');
      
      if (roiCtx) {
        roiCtx.drawImage(
          canvas,
          0, roiY, targetWidth, roiHeight, // Source
          0, 0, targetWidth, roiHeight,    // Dest
        );
        return this.finalize(roiCanvas, options.grayscale);
      }
    }

    return this.finalize(canvas, options.grayscale);
  }

  private finalize(
    canvas: HTMLCanvasElement,
    grayscale?: boolean,
  ): { canvas: HTMLCanvasElement; imageData?: ImageData } {
    if (!grayscale) {
      return { canvas };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return { canvas };

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Luminance formula: 0.299R + 0.587G + 0.114B
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      // alpha (i+3) is kept
    }

    ctx.putImageData(imageData, 0, 0);
    return { canvas, imageData };
  }
}
