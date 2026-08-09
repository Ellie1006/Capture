import { geminiApiKey } from '../state/settings.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const TRANSCRIPTION_PROMPT = `Transcribe todo el texto visible en esta imagen exactamente como está escrito.
El texto está en español. Conserva el formato original, incluyendo saltos de línea y estructura de párrafos.
Para fórmulas matemáticas, usa notación LaTeX: $ para inline y $$ para display.
Si la imagen contiene diagramas o elementos no textuales, descríbelos brevemente en [corchetes].
Devuelve solo la transcripción, sin comentarios adicionales.`;

export async function transcribeWithGemini(imageDataUrl) {
  const apiKey = geminiApiKey.value;
  if (!apiKey) throw new Error('NO_API_KEY');

  const base64 = imageDataUrl.split(',')[1];
  const mimeType = imageDataUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';

  const body = {
    contents: [{
      parts: [
        { text: TRANSCRIPTION_PROMPT },
        { inlineData: { mimeType, data: base64 } }
      ]
    }]
  };

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody.error?.message || JSON.stringify(errBody);
    } catch (_) {
      detail = response.statusText;
    }
    console.error('Gemini API error:', response.status, detail);
    throw new Error(`GEMINI_${response.status}: ${detail}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('EMPTY_RESPONSE');

  return text.trim();
}
