import { pendingCount, completedCount, totalCount, activeOcrTask } from '../state/ocr.js';

export function OcrQueueIndicator() {
  const pending = pendingCount.value;
  const completed = completedCount.value;
  const total = totalCount.value;
  const active = activeOcrTask.value;

  if (total === 0) return null;

  return (
    <div class="ocr-indicator">
      {active ? (
        <span class="ocr-processing">
          <span class="spinner" />
          Procesando {completed + 1}/{total}
        </span>
      ) : pending > 0 ? (
        <span class="ocr-pending">En cola: {pending}</span>
      ) : (
        <span class="ocr-done">Listo</span>
      )}
    </div>
  );
}
