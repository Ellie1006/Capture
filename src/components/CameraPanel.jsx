import { useRef, useEffect, useCallback } from 'preact/hooks';
import { signal } from '@preact/signals';
import { isCameraReady, cameraError, isCalibrated, roiCorners, remoteCaptureRequested, cameraZoom, zoomRange } from '../state/camera.js';
import { startCamera, stopCamera, captureFrame, applyZoom } from '../services/camera-service.js';
import { resizeAndCompress } from '../utils/image-utils.js';
import { enqueueCapture } from '../state/ocr.js';
import { acquireWakeLock } from '../services/wakelock-service.js';
import { CalibrationOverlay } from './CalibrationOverlay.jsx';
import { loadOpenCV, warpPerspective } from '../services/opencv-service.js';

const showCalibration = signal(false);

export function CameraPanel() {
  const videoRef = useRef(null);
  const pinchRef = useRef({ initialDistance: null, initialZoom: null });

  useEffect(() => {
    if (videoRef.current) {
      startCamera(videoRef.current);
      acquireWakeLock();
    }
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (remoteCaptureRequested.value) {
      remoteCaptureRequested.value = false;
      handleCapture();
    }
  }, [remoteCaptureRequested.value]);

  async function handleCapture() {
    if (!videoRef.current || !isCameraReady.value) return;

    const range = zoomRange.value;
    const digitalZoom = range.hardware ? 1 : cameraZoom.value;
    const rawCanvas = captureFrame(videoRef.current, digitalZoom);

    let finalCanvas = rawCanvas;
    if (isCalibrated.value && roiCorners.value) {
      try {
        const cv = await loadOpenCV();
        const imageData = rawCanvas.getContext('2d').getImageData(0, 0, rawCanvas.width, rawCanvas.height);
        finalCanvas = warpPerspective(cv, imageData, roiCorners.value, 1920, 1080);
      } catch (_) {
        finalCanvas = rawCanvas;
      }
    }

    const dataUrl = resizeAndCompress(finalCanvas);
    enqueueCapture(dataUrl);
  }

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        initialDistance: Math.hypot(dx, dy),
        initialZoom: cameraZoom.value
      };
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    const p = pinchRef.current;
    if (e.touches.length === 2 && p.initialDistance) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      const scale = currentDistance / p.initialDistance;
      applyZoom(Math.round(p.initialZoom * scale * 10) / 10);
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchRef.current = { initialDistance: null, initialZoom: null };
    }
  }, []);

  const error = cameraError.value;
  const calibrated = isCalibrated.value;
  const calibrating = showCalibration.value;
  const zoom = cameraZoom.value;
  const range = zoomRange.value;
  const isDigitalZoom = !range.hardware && zoom !== 1;
  const videoStyle = isDigitalZoom ? { transform: `scale(${zoom})` } : {};

  return (
    <div
      class="camera-panel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {error && (
        <div class="camera-error">
          <p>Error de cámara: {error}</p>
          <button onClick={() => { cameraError.value = null; startCamera(videoRef.current); }}>Reintentar</button>
        </div>
      )}
      <video
        ref={videoRef}
        class="camera-video"
        style={videoStyle}
        autoPlay
        playsInline
        muted
      />
      {calibrating && videoRef.current && (
        <CalibrationOverlay
          videoEl={videoRef.current}
          onClose={() => { showCalibration.value = false; }}
        />
      )}
      <div class="camera-controls">
        <button
          class={`calibrate-btn ${calibrated ? 'calibrated' : ''}`}
          onClick={() => { showCalibration.value = true; }}
          aria-label="Calibrar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" />
            <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
            <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
          </svg>
        </button>
        <button
          class="capture-btn primary"
          onClick={handleCapture}
          disabled={!isCameraReady.value}
          aria-label="Capturar"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2" />
            <circle cx="16" cy="16" r="10" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div class="zoom-controls">
        <button
          class="zoom-btn"
          onClick={() => applyZoom(zoom - 0.1)}
          disabled={zoom <= range.min}
          aria-label="Alejar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          class="zoom-level"
          onClick={() => applyZoom(1)}
          aria-label="Restablecer zoom"
        >
          {zoom.toFixed(1)}x
        </button>
        <button
          class="zoom-btn"
          onClick={() => applyZoom(zoom + 0.1)}
          disabled={zoom >= range.max}
          aria-label="Acercar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      {calibrated && (
        <div class="calibration-badge">Calibrado</div>
      )}
    </div>
  );
}
