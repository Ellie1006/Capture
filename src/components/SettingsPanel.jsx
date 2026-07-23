import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { geminiApiKey, preferredOcrEngine, selectedCameraId } from '../state/settings.js';
import { listCameras } from '../services/camera-service.js';
import { clearSession } from '../services/storage-service.js';

export const showSettings = signal(false);

export function SettingsPanel() {
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    listCameras().then(setCameras).catch(() => {});
  }, []);

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
            onInput={(e) => { geminiApiKey.value = e.target.value; }}
            placeholder="AIza..."
          />
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
