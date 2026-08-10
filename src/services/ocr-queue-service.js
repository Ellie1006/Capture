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
  let usedEngine = null;
  const engine = preferredOcrEngine.value;
  let geminiError = null;
  let tesseractError = null;

  if (engine !== 'tesseract' && geminiApiKey.value) {
    const elapsed = Date.now() - lastGeminiCall;
    if (elapsed < THROTTLE_MS) {
      await sleep(THROTTLE_MS - elapsed);
    }

    try {
      text = await transcribeWithGemini(next.imageBase64);
      usedEngine = 'gemini';
      lastGeminiCall = Date.now();
    } catch (err) {
      geminiError = err;
      console.error('Gemini OCR failed:', err.message || err);
      text = null;
    }
  }

  if (text === null) {
    try {
      text = await transcribeWithTesseract(next.imageBase64);
      usedEngine = 'tesseract';
    } catch (err) {
      tesseractError = err;
      console.error('Tesseract OCR failed:', err.message || err);
      usedEngine = 'error';
      const details = [];
      if (geminiError) details.push('Gemini: ' + (geminiError.message || geminiError));
      if (tesseractError) details.push('Tesseract: ' + (tesseractError.message || tesseractError));
      text = '[Error OCR] ' + details.join(' | ');
    }
  }

  ocrQueue.value = ocrQueue.value.map(t =>
    t.id === next.id ? { ...t, status: 'completed' } : t
  );

  const num = blockCounter.value + 1;
  blockCounter.value = num;
  const thumbnail = await createThumbnail(next.imageBase64);
  const finalText = text || '[Sin texto detectado]';
  const block = { id: crypto.randomUUID(), questionNum: num, text: finalText, engine: usedEngine, imagePreview: thumbnail, timestamp: Date.now() };
  captureBlocks.value = [...captureBlocks.value, block];

  if (syncRole.value === 'host') {
    broadcastToAll({ type: 'APPEND_CAPTURE', block });
  }

  activeOcrTask.value = null;
  processing = false;

  const stillPending = ocrQueue.value.some(t => t.status === 'pending');
  if (stillPending) processNext();
}

function createThumbnail(dataUrl) {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        canvas.getContext('2d').drawImage(img, 0, 0, 160, 120);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch (_) {
      resolve(null);
    }
  });
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
