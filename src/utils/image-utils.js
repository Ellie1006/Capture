export function resizeAndCompress(canvas, maxWidth = 1920, quality = 0.8) {
  const { width, height } = canvas;

  if (width <= maxWidth) {
    return canvas.toDataURL('image/jpeg', quality);
  }

  const scale = maxWidth / width;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = maxWidth;
  outCanvas.height = Math.round(height * scale);

  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);

  return outCanvas.toDataURL('image/jpeg', quality);
}

export function dataUrlToBase64(dataUrl) {
  return dataUrl.split(',')[1];
}
