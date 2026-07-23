import { signal, effect } from '@preact/signals';

export const geminiApiKey = signal(localStorage.getItem('gemini_api_key') || '');
export const preferredOcrEngine = signal(localStorage.getItem('ocr_engine') || 'auto');
export const selectedCameraId = signal(localStorage.getItem('camera_id') || '');

effect(() => {
  const key = geminiApiKey.value;
  if (key) localStorage.setItem('gemini_api_key', key);
  else localStorage.removeItem('gemini_api_key');
});

effect(() => localStorage.setItem('ocr_engine', preferredOcrEngine.value));

effect(() => {
  const id = selectedCameraId.value;
  if (id) localStorage.setItem('camera_id', id);
});
