import { useState } from 'preact/hooks';

export function NotepadBlock({ block, showSeparator }) {
  const [showImage, setShowImage] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <div class="notepad-block">
      {showSeparator && <hr class="block-separator" />}
      <h3 class="block-heading">
        Pregunta {block.questionNum}
        {block.engine && <span class={`engine-tag engine-${block.engine}`}>{block.engine}</span>}
      </h3>
      {block.geminiError && block.engine === 'tesseract' && (
        <div class="gemini-error-detail" onClick={() => setShowError(!showError)}>
          {showError ? block.geminiError : 'Gemini falló — toca para ver'}
        </div>
      )}
      {block.imagePreview && (
        <img
          src={block.imagePreview}
          class={`block-thumbnail ${showImage ? 'expanded' : ''}`}
          onClick={() => setShowImage(!showImage)}
          alt="Captura enviada al OCR"
        />
      )}
      <div class="block-text">{block.text}</div>
    </div>
  );
}
