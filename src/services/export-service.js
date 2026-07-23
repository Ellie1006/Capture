import { captureBlocks, responseBlocks } from '../state/notepad.js';
import {
  captureBlocksToMarkdown,
  responseBlocksToMarkdown,
  combinedToMarkdown
} from '../utils/markdown-utils.js';

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportCaptures() {
  const md = captureBlocksToMarkdown(captureBlocks.value);
  downloadFile(md, `capturas-${timestamp()}.md`);
}

export function exportResponses() {
  const md = responseBlocksToMarkdown(responseBlocks.value);
  downloadFile(md, `respuestas-${timestamp()}.md`);
}

export function exportAll() {
  const md = combinedToMarkdown(captureBlocks.value, responseBlocks.value);
  downloadFile(md, `sesion-${timestamp()}.md`);
}

export function importMarkdownFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
}
