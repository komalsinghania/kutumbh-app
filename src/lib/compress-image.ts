const MAX_DIMENSION = 900; // px
const MAX_BYTES = 200 * 1024; // 200 KB

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

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

      // Try decreasing quality until under MAX_BYTES
      // base64 length * 0.75 ≈ actual byte size
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.15) {
        quality = Math.round((quality - 0.08) * 100) / 100;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      // If still too large, shrink the canvas further
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
