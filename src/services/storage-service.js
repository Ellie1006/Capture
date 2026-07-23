import { get, set, del } from 'idb-keyval';
import { effect } from '@preact/signals';
import { captureBlocks, responseBlocks, blockCounter } from '../state/notepad.js';

const SESSION_KEY = 'capture-pad-session';
let saveTimeout = null;

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSession, 1000);
}

async function saveSession() {
  const data = {
    captureBlocks: captureBlocks.value,
    responseBlocks: responseBlocks.value,
    blockCounter: blockCounter.value,
    savedAt: Date.now()
  };
  await set(SESSION_KEY, data);
}

export async function loadSession() {
  const data = await get(SESSION_KEY);
  if (!data) return false;

  captureBlocks.value = data.captureBlocks || [];
  responseBlocks.value = data.responseBlocks || [];
  blockCounter.value = data.blockCounter || 0;
  return true;
}

export async function clearSession() {
  await del(SESSION_KEY);
  captureBlocks.value = [];
  responseBlocks.value = [];
  blockCounter.value = 0;
}

export function startAutoSave() {
  effect(() => {
    captureBlocks.value;
    responseBlocks.value;
    debouncedSave();
  });
}
