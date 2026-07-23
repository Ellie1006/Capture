let worker = null;
let initPromise = null;

async function initWorker() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const Tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
    worker = await Tesseract.createWorker('spa', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    });
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
