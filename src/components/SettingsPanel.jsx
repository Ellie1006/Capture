import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { geminiApiKey, geminiModel, preferredOcrEngine, selectedCameraId } from '../state/settings.js';
import { listCameras } from '../services/camera-service.js';
import { clearSession } from '../services/storage-service.js';

export const showSettings = signal(false);

export function SettingsPanel() {
  const [cameras, setCameras] = useState([]);
  const [verifyStatus, setVerifyStatus] = useState(null);
  const [availableModels, setAvailableModels] = useState(null);

  useEffect(() => {
    listCameras().then(setCameras).catch(() => {});
  }, []);

  async function verifyGeminiKey() {
    const apiKey = geminiApiKey.value;
    if (!apiKey) {
      setVerifyStatus({ ok: false, msg: 'No hay API key ingresada' });
      return;
    }

    setVerifyStatus({ ok: null, msg: 'Verificando...' });
    const model = geminiModel.value;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }]
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setVerifyStatus({
          ok: false,
          msg: `Error ${res.status} con ${model}: ${body.error?.message || res.statusText}`
        });
        return;
      }

      await res.json();
      setVerifyStatus({
        ok: true,
        msg: `Key valida. Modelo ${model} funciona correctamente.`
      });
    } catch (err) {
      setVerifyStatus({ ok: false, msg: 'Error de red: ' + err.message });
    }
  }

  async function listAvailableModels() {
    const apiKey = geminiApiKey.value;
    if (!apiKey) return;

    setAvailableModels({ loading: true });

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        setAvailableModels({ error: `Error ${res.status}` });
        return;
      }
      const data = await res.json();
      const models = (data.models || [])
        .map(m => m.name.replace('models/', ''))
        .filter(n => n.includes('flash') || n.includes('pro'))
        .sort();
      setAvailableModels({ models });
    } catch (err) {
      setAvailableModels({ error: err.message });
    }
  }

  if (!showSettings.value) return null;

  return (
    <>
      <div class="settings-backdrop" onClick={() => { showSettings.value = false; }} />
      <div class="settings-panel">
        <div class="settings-header">
          <h2>Configuración</h2>
          <button onClick={() => { showSettings.value = false; }} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-section">
          <label class="settings-label">API Key de Gemini</label>
          <input
            type="password"
            value={geminiApiKey.value}
            onInput={(e) => { geminiApiKey.value = e.target.value.trim(); setVerifyStatus(null); }}
            placeholder="AIza..."
          />
          <div style="display: flex; gap: 6px; margin-top: 6px">
            <button
              style="font-size: 12px; padding: 6px 12px; min-height: unset"
              onClick={verifyGeminiKey}
              disabled={verifyStatus?.msg === 'Verificando...'}
            >
              Verificar key
            </button>
            <button
              style="font-size: 12px; padding: 6px 12px; min-height: unset"
              onClick={listAvailableModels}
            >
              Ver modelos
            </button>
          </div>
          {verifyStatus && (
            <p class="settings-hint" style={{
              color: verifyStatus.ok === true ? 'var(--color-success)'
                : verifyStatus.ok === false ? 'var(--color-error)'
                : 'var(--color-warning)',
              marginTop: '6px',
              wordBreak: 'break-word'
            }}>
              {verifyStatus.msg}
            </p>
          )}
          {availableModels && (
            <div class="settings-hint" style={{ marginTop: '6px', wordBreak: 'break-word' }}>
              {availableModels.loading && 'Cargando modelos...'}
              {availableModels.error && <span style="color: var(--color-error)">{availableModels.error}</span>}
              {availableModels.models && (
                <div>
                  <strong>Modelos disponibles:</strong>
                  <div style="max-height: 120px; overflow-y: auto; font-size: 11px; margin-top: 4px">
                    {availableModels.models.map(m => (
                      <div
                        key={m}
                        style="padding: 2px 0; cursor: pointer; color: var(--color-accent)"
                        onClick={() => { geminiModel.value = m; setVerifyStatus(null); }}
                      >
                        {m} {m === geminiModel.value ? '(actual)' : '← usar'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <p class="settings-hint">Se guarda localmente en este dispositivo</p>
        </div>

        <div class="settings-section">
          <label class="settings-label">Modelo Gemini</label>
          <input
            type="text"
            value={geminiModel.value}
            onInput={(e) => { geminiModel.value = e.target.value.trim(); setVerifyStatus(null); }}
            placeholder="gemini-2.5-flash"
          />
          <p class="settings-hint">Toca "Ver modelos" para ver cuales estan disponibles</p>
        </div>

        <div class="settings-section">
          <label class="settings-label">Motor OCR</label>
          <select
            value={preferredOcrEngine.value}
            onChange={(e) => { preferredOcrEngine.value = e.target.value; }}
          >
            <option value="auto">Auto (Gemini → Tesseract fallback)</option>
            <option value="gemini">Solo Gemini</option>
            <option value="tesseract">Solo Tesseract (offline)</option>
          </select>
        </div>

        {cameras.length > 1 && (
          <div class="settings-section">
            <label class="settings-label">Camara</label>
            <select
              value={selectedCameraId.value}
              onChange={(e) => { selectedCameraId.value = e.target.value; }}
            >
              <option value="">Por defecto (trasera)</option>
              {cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camara ${cam.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <p class="settings-hint">Requiere recargar para aplicar</p>
          </div>
        )}

        <div class="settings-section">
          <button
            class="danger-btn"
            onClick={async () => {
              if (confirm('Borrar todos los bloques de la sesion actual?')) {
                await clearSession();
              }
            }}
          >
            Limpiar sesion
          </button>
        </div>
      </div>
    </>
  );
}
