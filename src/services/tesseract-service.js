let worker = null;
let initPromise = null;

async function initWorker() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('spa');
    return worker;
  })();

  return initPromise;
}

export async function transcribeWithTesseract(imageDataUrl) {
  const w = await initWorker();
  const { data } = await w.recognize(imageDataUrl);
  return data.text.trim();
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    initPromise = null;
  }
}
