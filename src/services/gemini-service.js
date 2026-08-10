import { geminiApiKey, geminiModel } from '../state/settings.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MAX_RETRIES = 2;

const TRANSCRIPTION_PROMPT = `Eres un sistema OCR. Tu única tarea es transcribir el texto visible en esta imagen.

Reglas:
1. Transcribe EXACTAMENTE lo que ves, carácter por carácter, sin interpretar ni corregir.
2. Mantén saltos de línea y estructura original.
3. Para fórmulas matemáticas usa LaTeX: $ inline, $$ display.
4. Si hay diagramas, descríbelos en [corchetes].
5. NO agregues comentarios, explicaciones, ni texto que no esté en la imagen.
6. El texto puede estar en español.

Responde SOLO con la transcripción.`;

export async function transcribeWithGemini(imageDataUrl) {
  const apiKey = geminiApiKey.value;
  if (!apiKey) throw new Error('NO_API_KEY');

  const base64 = imageDataUrl.split(',')[1];
  const mimeType = imageDataUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: TRANSCRIPTION_PROMPT },
        { inlineData: { mimeType, data: base64 } }
      ]
    }]
  });

  const url = `${API_BASE}${geminiModel.value}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = parseRetryDelay(response) || (15 * (attempt + 1));
      await sleep(waitSec * 1000);
      continue;
    }

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody.error?.message || JSON.stringify(errBody);
      } catch (_) {
        detail = response.statusText;
      }
      throw new Error(`GEMINI_${response.status}: ${detail}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.trim()) throw new Error('EMPTY_RESPONSE');

    return text.trim();
  }
}

async function parseRetryDelay(response) {
  try {
    const body = await response.clone().json();
    const msg = body.error?.message || '';
    const match = msg.match(/retry in ([\d.]+)s/i);
    return match ? Math.ceil(parseFloat(match[1])) : null;
  } catch (_) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
