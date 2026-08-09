import { signal } from '@preact/signals';
import { sendToHost } from '../services/peer-service.js';
import { connectionStatus } from '../state/sync.js';

const cooldown = signal(false);

export function RemoteCaptureView({ onExit }) {
  const connected = connectionStatus.value === 'connected';
  const disabled = !connected || cooldown.value;

  function handleRemoteCapture() {
    if (disabled) return;
    sendToHost({ type: 'REMOTE_CAPTURE' });
    cooldown.value = true;
    setTimeout(() => { cooldown.value = false; }, 2000);
  }

  return (
    <div class="remote-capture-view">
      <button class="remote-capture-exit" onClick={onExit} aria-label="Salir">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button
        class={`remote-capture-trigger ${cooldown.value ? 'cooldown' : ''}`}
        onClick={handleRemoteCapture}
        disabled={disabled}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="3" />
          <circle cx="40" cy="40" r="26" fill="currentColor" />
        </svg>
        <span class="remote-capture-label">
          {cooldown.value ? 'Enviado' : connected ? 'Capturar' : 'Sin conexion'}
        </span>
      </button>
    </div>
  );
}
