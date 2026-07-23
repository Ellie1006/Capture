import { signal, computed } from '@preact/signals';

export const captureBlocks = signal([]);
export const responseBlocks = signal([]);
export const blockCounter = signal(0);
export const activeTab = signal('captures');

export const totalCaptures = computed(() => captureBlocks.value.length);
export const totalResponses = computed(() => responseBlocks.value.length);

export function addCaptureBlock(text) {
  const num = blockCounter.value + 1;
  blockCounter.value = num;
  captureBlocks.value = [
    ...captureBlocks.value,
    { id: crypto.randomUUID(), questionNum: num, text, timestamp: Date.now() }
  ];
}

export function addResponseBlock(text) {
  const block = { id: crypto.randomUUID(), text, timestamp: Date.now() };
  responseBlocks.value = [...responseBlocks.value, block];
  return block;
}
