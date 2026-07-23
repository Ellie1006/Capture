import { useRef } from 'preact/hooks';
import { responseBlocks, addResponseBlock } from '../state/notepad.js';
import { syncRole } from '../state/sync.js';
import { broadcastToAll, sendToHost } from '../services/peer-service.js';
import { importMarkdownFile } from '../services/export-service.js';
import { markdownToBlocks } from '../utils/markdown-utils.js';

function addAndSyncResponse(text) {
  const block = addResponseBlock(text);
  if (syncRole.value === 'host') {
    broadcastToAll({ type: 'APPEND_RESPONSE', block });
  } else if (syncRole.value === 'viewer') {
    sendToHost({ type: 'APPEND_RESPONSE', block });
  }
}

export function ResponsesPanel() {
  const textareaRef = useRef(null);
  const blocks = responseBlocks.value;

  function handleAdd() {
    const text = textareaRef.current?.value?.trim();
    if (!text) return;
    addAndSyncResponse(text);
    textareaRef.current.value = '';
  }

  async function handleImport() {
    const text = await importMarkdownFile();
    if (!text) return;
    const parsed = markdownToBlocks(text);
    for (const blockText of parsed) {
      addAndSyncResponse(blockText);
    }
  }

  return (
    <div class="responses-panel">
      <div class="responses-input">
        <textarea
          ref={textareaRef}
          placeholder="Pegar respuesta aquí..."
          rows={3}
        />
        <div class="responses-actions">
          <button onClick={handleImport}>Importar .md</button>
          <button class="primary" onClick={handleAdd}>Agregar</button>
        </div>
      </div>
      <div class="responses-list">
        {blocks.length === 0 ? (
          <div class="notepad-empty"><p>Las respuestas aparecerán aquí</p></div>
        ) : (
          blocks.map((block, i) => (
            <div key={block.id} class="notepad-block">
              {i > 0 && <hr class="block-separator" />}
              <div class="block-text">{block.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
