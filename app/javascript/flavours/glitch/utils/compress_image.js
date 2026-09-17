// Resizes and compresses an image client-side via the Canvas API before
// upload. Shared by every image-upload path in the app (compose, Community
// Directory entries, Member Stories, Community Listings) so they use one
// implementation instead of several near-identical copies that can drift.
//
// - GIFs and non-image files (video, audio) pass through untouched --
//   re-encoding a GIF to JPEG would destroy its animation.
// - PNGs are resized and kept as PNG only if they actually use transparency
//   (checked via the canvas alpha channel) -- an opaque PNG (very common
//   from phone screenshots/saved photos) is converted to JPEG instead,
//   since PNG's lossless format is dramatically larger than JPEG for
//   photographic content with nothing to gain from it.
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

// How many pixels apart to sample when checking a PNG's alpha channel for
// real transparency. Transparency in a real image is always a sizeable
// region (a logo's background, a cutout shape) -- never an isolated pixel --
// so sampling instead of scanning every pixel stays reliable while keeping
// this fast even on multi-megapixel photos, where a full scan is the
// expensive path precisely because it can't early-exit (nothing to find).
const ALPHA_SAMPLE_STRIDE_PX = 25;

const hasRealTransparency = (ctx, width, height) => {
  let data;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // getImageData can throw on a tainted canvas (e.g. cross-origin source);
    // treat as "has transparency" so we fall back to the always-safe PNG path.
    return true;
  }
  const strideBytes = ALPHA_SAMPLE_STRIDE_PX * 4;
  for (let i = 3; i < data.length; i += strideBytes) {
    if (data[i] < 255) return true;
  }
  return false;
};

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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const keepAsPng = file.type === 'image/png' && hasRealTransparency(ctx, width, height);

      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) {
          resolve(file); // compression didn't help (or failed) -- use original
          return;
        }
        const extension = keepAsPng ? '.png' : '.jpg';
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, extension), { type: blob.type }));
      }, keepAsPng ? 'image/png' : 'image/jpeg', keepAsPng ? undefined : quality);
    };

    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
