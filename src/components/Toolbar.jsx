import { OcrQueueIndicator } from './OcrQueueIndicator.jsx';
import { ExportControls } from './ExportControls.jsx';
import { ConnectionStatus } from './ConnectionStatus.jsx';
import { SettingsPanel, showSettings } from './SettingsPanel.jsx';

export function Toolbar() {
  return (
    <header class="toolbar">
      <h1 class="toolbar-title">Capture Pad</h1>
      <div class="toolbar-actions">
        <OcrQueueIndicator />
        <ExportControls />
        <ConnectionStatus />
        <button
          class="settings-btn"
          onClick={() => { showSettings.value = true; }}
          aria-label="Configuración"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <SettingsPanel />
    </header>
  );
}
