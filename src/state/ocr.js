import { signal, computed } from '@preact/signals';

export const ocrQueue = signal([]);
export const activeOcrTask = signal(null);

export const pendingCount = computed(() =>
  ocrQueue.value.filter(t => t.status === 'pending').length
);

export const completedCount = computed(() =>
  ocrQueue.value.filter(t => t.status === 'completed').length
);

export const totalCount = computed(() => ocrQueue.value.length);

export function enqueueCapture(imageBase64) {
  ocrQueue.value = [
    ...ocrQueue.value,
    { id: crypto.randomUUID(), imageBase64, status: 'pending' }
  ];
}
