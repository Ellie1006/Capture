let worker = null;
let initPromise = null;

async function initWorker() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { createWorker, PSM } = await import('tesseract.js');
    worker = await createWorker('spa');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    return worker;
  })();

  return initPromise;
}

function preprocessImage(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = gray > 128 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

export async function transcribeWithTesseract(imageDataUrl) {
  const w = await initWorker();
  const processed = await preprocessImage(imageDataUrl);
  const { data } = await w.recognize(processed);
  return data.text.trim();
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    initPromise = null;
  }
}
