// ─────────────────────────────────────────────────────────────────────────────
// Client-side image compression utility.
//
// Resizes and recompresses uploaded prospect photos so they fit comfortably
// inside Firestore document limits (stored as base64 data URLs on the
// Prospect document, capped at 3 photos).
//
// Strategy:
//   1. Scale down to MAX_DIMENSION × MAX_DIMENSION (preserving aspect ratio).
//   2. Encode as JPEG and reduce quality in steps until the data URL is small
//      enough (base64 length × 0.75 ≈ actual byte size).
//   3. If quality reduction alone isn't enough, scale the canvas down further
//      with a geometry-based scale factor and re-encode at q=0.75.
// ─────────────────────────────────────────────────────────────────────────────

// Maximum pixel dimension for either side of the image after resizing.
const MAX_DIMENSION = 900; // px
// Target maximum size for the compressed output (stored as base64 in Firestore).
const MAX_BYTES = 200 * 1024; // 200 KB

/**
 * Compress a user-selected image file to a base64 JPEG data URL ≤ 200 KB.
 * Must be called in a browser context (uses HTMLCanvasElement + Image).
 */
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Create a temporary object URL so the <img> element can load the file.
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Release the blob URL — we have the pixel data in `img` now.
      URL.revokeObjectURL(objectUrl);

      // ── Step 1: Scale down so neither dimension exceeds MAX_DIMENSION ────
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // ── Step 2: Reduce JPEG quality until under MAX_BYTES ─────────────
      // base64 length * 0.75 ≈ actual byte size
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.15) {
        quality = Math.round((quality - 0.08) * 100) / 100;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      // ── Step 3: If still too large, shrink the canvas dimensions further ─
      // Use the ratio between current and target byte sizes to compute a
      // proportional scale (with a 10% safety margin).
      if (dataUrl.length * 0.75 > MAX_BYTES) {
        const scale = Math.sqrt((MAX_BYTES / (dataUrl.length * 0.75)) * 0.9);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      }

      console.log(
        `[compress-image] ${file.name} | original: ${(file.size / 1024).toFixed(0)} KB` +
        ` | compressed: ${((dataUrl.length * 0.75) / 1024).toFixed(0)} KB` +
        ` | quality: ${quality} | size: ${canvas.width}×${canvas.height}`
      );

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}
