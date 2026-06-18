// src/utils/imageUtils.ts
// Compresses an image URL/ObjectURL preserving transparency (PNG output).
// Uses an offscreen Canvas — safe on Android/iOS WebView.

export const compressImageToBase64 = (
  imageSrc: string,
  maxSide = 600,
  // quality param kept for API compatibility but ignored for PNG
  // (PNG is lossless; size reduction comes from resizing only)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Scale down preserving aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxSide) { height = Math.round((height * maxSide) / width); width = maxSide; }
        } else {
          if (height > maxSide) { width = Math.round((width * maxSide) / height); height = maxSide; }
        }

        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No se pudo obtener contexto 2D del canvas")); return; }

        // ── CRITICAL: do NOT fill a white background ──────────────────────
        // Canvas is transparent by default. Filling white destroys the alpha
        // channel that remove.bg worked hard to produce.
        // ctx.fillStyle = "#ffffff";  ← REMOVED
        // ctx.fillRect(...);          ← REMOVED

        ctx.drawImage(img, 0, 0, width, height);

        // Use PNG to preserve the transparent background
        const base64 = canvas.toDataURL("image/png");

        if (!base64 || base64 === "data:,") {
          reject(new Error("Canvas produjo un resultado vacío")); return;
        }

        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("No se pudo cargar la imagen en el canvas"));
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
  });
};