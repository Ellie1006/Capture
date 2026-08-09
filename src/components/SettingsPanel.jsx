import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { geminiApiKey, preferredOcrEngine, selectedCameraId } from '../state/settings.js';
import { listCameras } from '../services/camera-service.js';
import { clearSession } from '../services/storage-service.js';

export const showSettings = signal(false);

export function SettingsPanel() {
  const [cameras, setCameras] = useState([]);
  const [verifyStatus, setVerifyStatus] = useState(null);

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

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setVerifyStatus({ ok: false, msg: `Error ${res.status}: ${body.error?.message || res.statusText}` });
        return;
      }

      const data = await res.json();
      const models = (data.models || []).map(m => m.name.replace('models/', ''));
      const flashModels = models.filter(n => n.includes('flash'));
      setVerifyStatus({
        ok: true,
        msg: `Key valida. Modelos flash disponibles: ${flashModels.slice(0, 5).join(', ') || 'ninguno'}`
      });
    } catch (err) {
      setVerifyStatus({ ok: false, msg: 'Error de red: ' + err.message });
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
          <div style="margin-top: 6px">
            <button
              style="font-size: 12px; padding: 6px 12px; min-height: unset"
              onClick={verifyGeminiKey}
              disabled={verifyStatus?.msg === 'Verificando...'}
            >
              Verificar key
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
          <p class="settings-hint">Se guarda localmente en este dispositivo</p>
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
            <label class="settings-label">Cámara</label>
            <select
              value={selectedCameraId.value}
              onChange={(e) => { selectedCameraId.value = e.target.value; }}
            >
              <option value="">Por defecto (trasera)</option>
              {cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Cámara ${cam.deviceId.slice(0, 8)}`}
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
              if (confirm('¿Borrar todos los bloques de la sesión actual?')) {
                await clearSession();
              }
            }}
          >
            Limpiar sesión
          </button>
        </div>
      </div>
    </>
  );
}
