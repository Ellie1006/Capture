export function NotepadBlock({ block, showSeparator }) {
  return (
    <div class="notepad-block">
      {showSeparator && <hr class="block-separator" />}
      <h3 class="block-heading">Pregunta {block.questionNum}</h3>
      <div class="block-text">{block.text}</div>
    </div>
  );
}
