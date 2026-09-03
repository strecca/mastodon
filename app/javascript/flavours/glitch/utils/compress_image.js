// Resizes and compresses an image client-side via the Canvas API before
// upload. Shared by every image-upload path in the app (compose, Community
// Directory entries, Member Stories, Community Listings) so they use one
// implementation instead of several near-identical copies that can drift.
//
// - GIFs and non-image files (video, audio) pass through untouched --
//   re-encoding a GIF to JPEG would destroy its animation.
// - PNGs are resized but kept as PNG, not forced to JPEG, to preserve
//   transparency.
// - Canvas draw always outputs sRGB, which as a side effect normalizes any
//   unusual input color profile (ACES, P3, AdobeRGB, etc.).
// - Falls back to the original file if canvas processing fails, or if the
//   "compressed" result isn't actually smaller than the source.
// - Rejects files over MAX_REJECT_MB (a browser can hang trying to decode
//   an extremely large image into a canvas) with an Error whose .sizeMB is
//   set, so callers can show a friendly "image too large" message. Calls
//   onLargeFile(sizeMB) for files over WARN_ABOVE_MB so callers can show a
//   "this may take a moment" message while compression runs.
const MAX_REJECT_MB = 80;
const WARN_ABOVE_MB = 10;

export const compressImage = (file, { maxPx = 1280, quality = 0.82, onLargeFile } = {}) =>
  new Promise((resolve, reject) => {
    const sizeMB = file.size / 1024 / 1024;

    if (sizeMB > MAX_REJECT_MB) {
      const err = new Error('too_large');
      err.sizeMB = Math.round(sizeMB);
      reject(err);
      return;
    }
    if (sizeMB > WARN_ABOVE_MB) onLargeFile?.(Math.round(sizeMB));

    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      if (file.type === 'image/jpeg' && img.width <= maxPx && img.height <= maxPx) {
        resolve(file);
        return;
      }

      const scale  = Math.min(1, maxPx / img.width, maxPx / img.height);
      const width  = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      const isPng = file.type === 'image/png';

      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) {
          resolve(file); // compression didn't help (or failed) -- use original
          return;
        }
        const extension = isPng ? '.png' : '.jpg';
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, extension), { type: blob.type }));
      }, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality);
    };

    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
