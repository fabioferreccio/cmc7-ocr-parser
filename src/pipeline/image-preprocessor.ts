import { loadOpenCV, type CV } from '../wasm/opencv-loader.js';

/**
 * Pre-processes images for CMC-7 OCR.
 *
 * @remarks
 * Level 1 Pipeline: Uses Canvas API for low-latency resizing, grayscale conversion,
 * and ROI cropping (docs/03-arquitetura.md §1.2).
 * 
 * Level 2 Pipeline: Uses OpenCV.js (WASM) for binarization and deskewing.
 */
export class ImagePreprocessor {
  private readonly MAX_WIDTH = 960;
  private cv: CV | null = null;

  /**
   * Processes a frame from the camera (Level 1 — Canvas).
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

  /**
   * Initializes OpenCV if not already loaded.
   */
  private async ensureOpenCV(): Promise<CV> {
    if (!this.cv) {
      this.cv = await loadOpenCV();
    }
    return this.cv;
  }

  /**
   * Binarizes an image using OpenCV adaptive thresholding.
   * Works on grayscale input.
   */
  async binarize(imageData: ImageData): Promise<ImageData> {
    const cv = await this.ensureOpenCV();
    
    // 1. Create Mats
    const src = (cv as any).matFromImageData(imageData);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresholded = new cv.Mat();
    const rgba = new cv.Mat();

    try {
      // 2. Convert to Gray if needed (ensure single channel)
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // 3. Noise reduction
      const ksize = new cv.Size(3, 3);
      cv.GaussianBlur(gray, blurred, ksize, 0);

      // 4. Adaptive Threshold
      cv.adaptiveThreshold(
        blurred,
        thresholded,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        11,
        2
      );

      // 5. Convert back to RGBA for ImageData compatibility
      cv.cvtColor(thresholded, rgba, cv.COLOR_GRAY2RGBA);

      // 6. Return as ImageData
      const resultData = new Uint8ClampedArray(rgba.data);
      return new ImageData(resultData, rgba.cols, rgba.rows);
    } finally {
      // REGRA (3.4): Liberar memória WASM imediatamente
      src.delete();
      gray.delete();
      blurred.delete();
      thresholded.delete();
      rgba.delete();
    }
  }

  /**
   * Corrects image skew (deskew) using OpenCV.
   * Detects angle based on binarized content.
   */
  async deskew(imageData: ImageData): Promise<ImageData> {
    const cv = await this.ensureOpenCV();
    
    const src = (cv as any).matFromImageData(imageData);
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const rotated = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Found non-zero points to compute angle
      cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

      const points = new cv.Mat();
      (cv as any).findNonZero(binary, points);
      
      let angle = 0;
      if (!points.empty()) {
        const rect = (cv as any).minAreaRect(points);
        angle = rect.angle;
        
        // OpenCV angle logic: normalize for CMC-7 strip
        if (rect.size.width < rect.size.height) {
          angle += 90;
        }
      }
      points.delete();

      // Only rotate if angle is significant and not extreme (> 45 deg probably a fail)
      if (Math.abs(angle) < 0.2 || Math.abs(angle) > 45) {
        return imageData;
      }

      // Compute rotation matrix
      const center = new cv.Point(src.cols / 2, src.rows / 2);
      const M = cv.getRotationMatrix2D(center, angle, 1.0);
      const dsize = new cv.Size(src.cols, src.rows);
      
      cv.warpAffine(src, rotated, M, dsize, (cv as any).INTER_LINEAR, (cv as any).BORDER_REPLICATE);
      M.delete();

      const resultData = new Uint8ClampedArray(rotated.data);
      return new ImageData(resultData, rotated.cols, rotated.rows);
    } finally {
      src.delete();
      gray.delete();
      binary.delete();
      rotated.delete();
    }
  }
}
