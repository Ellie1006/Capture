import { useRef, useEffect } from 'preact/hooks';
import { captureBlocks } from '../state/notepad.js';
import { NotepadBlock } from './NotepadBlock.jsx';

export function NotepadPanel() {
  const containerRef = useRef(null);
  const blocks = captureBlocks.value;

  useEffect(() => {
    if (containerRef.current && blocks.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [blocks.length]);

  return (
    <div class="notepad-panel" ref={containerRef}>
      {blocks.length === 0 ? (
        <div class="notepad-empty">
          <p>Las capturas aparecerán aquí</p>
        </div>
      ) : (
        blocks.map((block, i) => (
          <NotepadBlock key={block.id} block={block} showSeparator={i > 0} />
        ))
      )}
    </div>
  );
}
