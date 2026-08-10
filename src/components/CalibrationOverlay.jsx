import { useRef, useEffect, useState } from 'preact/hooks';
import { isCalibrated, roiCorners, cameraError } from '../state/camera.js';
import { loadOpenCV, refineContour, warpPerspective } from '../services/opencv-service.js';

export function CalibrationOverlay({ videoEl, onClose }) {
  const canvasRef = useRef(null);
  const [corners, setCorners] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refinedCorners, setRefinedCorners] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !videoEl) return;
    const canvas = canvasRef.current;
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 0.15;
    setCorners([
      { x: w * pad, y: h * pad },
      { x: w * (1 - pad), y: h * pad },
      { x: w * (1 - pad), y: h * (1 - pad) },
      { x: w * pad, y: h * (1 - pad) }
    ]);
  }, [videoEl]);

  useEffect(() => {
    if (!canvasRef.current || !corners) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    draw(ctx, canvas.width, canvas.height, corners, refinedCorners);
  }, [corners, refinedCorners]);

  function draw(ctx, w, h, pts, refined) {
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (refined) {
      ctx.strokeStyle = '#66bb6a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(refined[0].x, refined[0].y);
      for (let i = 1; i < refined.length; i++) ctx.lineTo(refined[i].x, refined[i].y);
      ctx.closePath();
      ctx.stroke();

      for (const pt of refined) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#66bb6a';
        ctx.fill();
      }
    }
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  function findNearestCorner(pos) {
    let minDist = Infinity;
    let idx = -1;
    corners.forEach((c, i) => {
      const d = Math.hypot(c.x - pos.x, c.y - pos.y);
      if (d < minDist) { minDist = d; idx = i; }
    });
    return minDist < 40 ? idx : -1;
  }

  function handlePointerDown(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const idx = findNearestCorner(pos);
    if (idx >= 0) setDragging(idx);
  }

  function handlePointerMove(e) {
    if (dragging === null) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const updated = [...corners];
    updated[dragging] = pos;
    setCorners(updated);
    setRefinedCorners(null);
  }

  function handlePointerUp() {
    setDragging(null);
  }

  async function handleRefine() {
    if (!videoEl || !corners) return;
    setLoading(true);
    try {
      const cv = await loadOpenCV();

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext('2d').drawImage(videoEl, 0, 0);
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

      const xs = corners.map(c => c.x);
      const ys = corners.map(c => c.y);
      const margin = 60;
      const roiRect = {
        x: Math.max(0, Math.floor(Math.min(...xs) - margin)),
        y: Math.max(0, Math.floor(Math.min(...ys) - margin)),
        w: Math.min(canvas.width, Math.ceil(Math.max(...xs) - Math.min(...xs) + 2 * margin)),
        h: Math.min(canvas.height, Math.ceil(Math.max(...ys) - Math.min(...ys) + 2 * margin))
      };

      const refined = refineContour(cv, imageData, roiRect);
      if (refined) {
        setRefinedCorners(refined);
      } else {
        setRefinedCorners(corners);
      }
    } catch (err) {
      cameraError.value = 'Error al cargar OpenCV: ' + err.message;
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    const finalCorners = refinedCorners || corners;
    roiCorners.value = finalCorners;
    isCalibrated.value = true;
    onClose();
  }

  return (
    <div class="calibration-overlay">
      <canvas
        ref={canvasRef}
        class="calibration-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
      <div class="calibration-controls">
        <button onClick={onClose}>Cancelar</button>
        <button class="primary" onClick={handleRefine} disabled={loading}>
          {loading ? 'Cargando OpenCV...' : 'Refinar bordes'}
        </button>
        <button class="primary" onClick={handleConfirm}>
          Confirmar
        </button>
      </div>
      <div class="calibration-hint">
        Arrastra las esquinas para marcar el monitor
      </div>
    </div>
  );
}
