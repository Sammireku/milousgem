/**
 * Client-Side Image Compression & Resizing Utility
 * Optimizes portrait and scene images before storage and network transmission,
 * ensuring fast loading times, reduced memory usage, and high visual fidelity.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.85)
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
  maxSizeBytes?: number; // Target max size (e.g., 500 * 1024)
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.85,
  mimeType: 'image/webp',
  maxSizeBytes: 600 * 1024, // 600 KB
};

/**
 * Calculates byte size of a Base64 / DataURL string
 */
export function getBase64ByteSize(base64String: string): number {
  if (!base64String) return 0;
  const padding = (base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0);
  const base64Length = base64String.includes(',') ? base64String.split(',')[1].length : base64String.length;
  return Math.round((base64Length * 3) / 4 - padding);
}

/**
 * Formats bytes to human-readable string (e.g. 1.2 MB or 340 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Loads an HTMLImageElement from a URL or Base64 string
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for compression: ' + err));
    img.src = src;
  });
}

/**
 * Resizes and compresses an image data URL / Base64 string
 */
export async function compressImageDataUrl(
  dataUrl: string,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = getBase64ByteSize(dataUrl);

  try {
    const img = await loadImage(dataUrl);

    let { width, height } = img;
    const maxWidth = opts.maxWidth;
    const maxHeight = opts.maxHeight;

    // Calculate aspect ratio dimensions
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Create offscreen canvas for smooth bicubic downsampling
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image onto canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Test browser support for WebP, fallback to JPEG if needed
    let outputMime = opts.mimeType;
    let compressedDataUrl = canvas.toDataURL(outputMime, opts.quality);

    // If webp is not supported or results in png header, check jpeg
    if (outputMime === 'image/webp' && !compressedDataUrl.startsWith('data:image/webp')) {
      outputMime = 'image/jpeg';
      compressedDataUrl = canvas.toDataURL('image/jpeg', opts.quality);
    }

    let compressedSize = getBase64ByteSize(compressedDataUrl);

    // If still larger than maxSizeBytes and quality can be reduced further
    let currentQuality = opts.quality;
    while (compressedSize > opts.maxSizeBytes && currentQuality > 0.4) {
      currentQuality -= 0.15;
      compressedDataUrl = canvas.toDataURL(outputMime, currentQuality);
      compressedSize = getBase64ByteSize(compressedDataUrl);
    }

    const reductionPercentage = originalSize > 0
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
      : 0;

    return {
      dataUrl: compressedDataUrl,
      originalSize,
      compressedSize,
      reductionPercentage,
      width,
      height,
      format: outputMime,
    };
  } catch (error) {
    console.warn('Image compression fallback:', error);
    return {
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      reductionPercentage: 0,
      width: 0,
      height: 0,
      format: 'original',
    };
  }
}

/**
 * Resizes and compresses a File object from an input element or drag-and-drop
 */
export async function compressImageFile(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawDataUrl = e.target?.result as string;
        if (!rawDataUrl) {
          throw new Error('Failed to read image file');
        }
        const result = await compressImageDataUrl(rawDataUrl, options);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
