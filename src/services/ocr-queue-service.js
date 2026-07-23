import { effect } from '@preact/signals';
import { ocrQueue, activeOcrTask } from '../state/ocr.js';
import { captureBlocks, blockCounter } from '../state/notepad.js';
import { geminiApiKey, preferredOcrEngine } from '../state/settings.js';
import { syncRole } from '../state/sync.js';
import { transcribeWithGemini } from './gemini-service.js';
import { transcribeWithTesseract } from './tesseract-service.js';
import { broadcastToAll } from './peer-service.js';

const THROTTLE_MS = 4200;
let processing = false;
let lastGeminiCall = 0;

async function processNext() {
  if (processing) return;

  const queue = ocrQueue.value;
  const next = queue.find(t => t.status === 'pending');
  if (!next) return;

  processing = true;
  activeOcrTask.value = next.id;

  ocrQueue.value = queue.map(t =>
    t.id === next.id ? { ...t, status: 'processing' } : t
  );

  let text = null;
  const engine = preferredOcrEngine.value;

  if (engine !== 'tesseract' && geminiApiKey.value) {
    const elapsed = Date.now() - lastGeminiCall;
    if (elapsed < THROTTLE_MS) {
      await sleep(THROTTLE_MS - elapsed);
    }

    try {
      text = await transcribeWithGemini(next.imageBase64);
      lastGeminiCall = Date.now();
    } catch (_) {
      text = null;
    }
  }

  if (text === null) {
    try {
      text = await transcribeWithTesseract(next.imageBase64);
    } catch (_) {
      text = '[Error: no se pudo transcribir esta captura]';
    }
  }

  ocrQueue.value = ocrQueue.value.map(t =>
    t.id === next.id ? { ...t, status: 'completed' } : t
  );

  const num = blockCounter.value + 1;
  blockCounter.value = num;
  const block = { id: crypto.randomUUID(), questionNum: num, text, timestamp: Date.now() };
  captureBlocks.value = [...captureBlocks.value, block];

  if (syncRole.value === 'host') {
    broadcastToAll({ type: 'APPEND_CAPTURE', block });
  }

  activeOcrTask.value = null;
  processing = false;

  const stillPending = ocrQueue.value.some(t => t.status === 'pending');
  if (stillPending) processNext();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

effect(() => {
  const hasPending = ocrQueue.value.some(t => t.status === 'pending');
  if (hasPending && !processing) {
    processNext();
  }
});
