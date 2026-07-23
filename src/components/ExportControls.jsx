import { signal } from '@preact/signals';
import { totalCaptures, totalResponses } from '../state/notepad.js';
import { exportCaptures, exportResponses, exportAll } from '../services/export-service.js';

const showMenu = signal(false);

export function ExportControls() {
  const hasCaps = totalCaptures.value > 0;
  const hasResp = totalResponses.value > 0;
  const hasAny = hasCaps || hasResp;

  if (!hasAny) return null;

  function toggle() { showMenu.value = !showMenu.value; }
  function close() { showMenu.value = false; }

  return (
    <div class="export-controls">
      <button class="export-btn" onClick={toggle} aria-label="Exportar">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      {showMenu.value && (
        <>
          <div class="export-backdrop" onClick={close} />
          <div class="export-menu">
            {hasCaps && (
              <button onClick={() => { exportCaptures(); close(); }}>
                Exportar capturas
              </button>
            )}
            {hasResp && (
              <button onClick={() => { exportResponses(); close(); }}>
                Exportar respuestas
              </button>
            )}
            {hasCaps && hasResp && (
              <button onClick={() => { exportAll(); close(); }}>
                Exportar todo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
