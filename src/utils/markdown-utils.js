export function captureBlocksToMarkdown(blocks) {
  return blocks
    .map(b => `### Pregunta ${b.questionNum}\n\n${b.text}`)
    .join('\n\n---\n\n');
}

export function responseBlocksToMarkdown(blocks) {
  return blocks
    .map(b => b.text)
    .join('\n\n---\n\n');
}

export function combinedToMarkdown(captures, responses) {
  let md = '';
  if (captures.length > 0) {
    md += '## Capturas\n\n' + captureBlocksToMarkdown(captures);
  }
  if (responses.length > 0) {
    if (md) md += '\n\n---\n\n';
    md += '## Respuestas\n\n' + responseBlocksToMarkdown(responses);
  }
  return md;
}

export function markdownToBlocks(mdString) {
  return mdString
    .split(/\n---\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
