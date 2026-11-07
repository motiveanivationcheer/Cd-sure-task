/**
 * High-performance client-side image compression utility.
 * Resizes images to max 1080px width, JPEG quality 70%, max file size 800KB.
 */

export interface CompressionResult {
  blob: Blob;
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number; // 0.0 to 1.0 (0.7 = 70%)
  maxSizeKB?: number; // 800KB
  onProgress?: (message: string, progress: number) => void;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1080,
    quality = 0.7,
    maxSizeKB = 800,
    onProgress,
  } = options;

  onProgress?.('Preparing image...', 10);

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      onProgress?.('Resizing and optimizing...', 30);
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image'));

      img.onload = () => {
        try {
          let { width, height } = img;

          // Resize if width exceeds maxWidth (1080px)
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * ratio);
          }

          onProgress?.('Compressing proof screenshot (70% quality)...', 60);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context unavailable'));
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Compression loop ensuring file is under maxSizeKB
          let currentQuality = quality;

          const tryCompress = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  return reject(new Error('Image optimization failed'));
                }

                const sizeKB = blob.size / 1024;

                // If still above max size and quality can be reduced, reduce slightly
                if (sizeKB > maxSizeKB && q > 0.4) {
                  const nextQ = Math.max(0.4, q - 0.1);
                  return tryCompress(nextQ);
                }

                onProgress?.('Image ready for fast upload', 100);

                const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                const optimizedFile = new File([blob], cleanFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                const previewUrl = URL.createObjectURL(blob);
                const reduction = Math.max(
                  0,
                  Math.round(((file.size - blob.size) / file.size) * 100)
                );

                resolve({
                  blob,
                  file: optimizedFile,
                  previewUrl,
                  originalSize: file.size,
                  compressedSize: blob.size,
                  reductionPercentage: reduction,
                });
              },
              'image/jpeg',
              q
            );
          };

          tryCompress(currentQuality);
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
