import { useRef, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { isCameraReady, cameraError, isCalibrated, roiCorners } from '../state/camera.js';
import { startCamera, stopCamera, captureFrame } from '../services/camera-service.js';
import { resizeAndCompress } from '../utils/image-utils.js';
import { enqueueCapture } from '../state/ocr.js';
import { acquireWakeLock } from '../services/wakelock-service.js';
import { CalibrationOverlay } from './CalibrationOverlay.jsx';
import { loadOpenCV, warpPerspective } from '../services/opencv-service.js';

const showCalibration = signal(false);

export function CameraPanel() {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      startCamera(videoRef.current);
      acquireWakeLock();
    }
    return () => stopCamera();
  }, []);

  async function handleCapture() {
    if (!videoRef.current || !isCameraReady.value) return;
    const rawCanvas = captureFrame(videoRef.current);

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

  const error = cameraError.value;
  const calibrated = isCalibrated.value;
  const calibrating = showCalibration.value;

  return (
    <div class="camera-panel">
      {error && (
        <div class="camera-error">
          <p>Error de cámara: {error}</p>
          <button onClick={() => { cameraError.value = null; startCamera(videoRef.current); }}>Reintentar</button>
        </div>
      )}
      <video
        ref={videoRef}
        class="camera-video"
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
      {calibrated && (
        <div class="calibration-badge">Calibrado</div>
      )}
    </div>
  );
}
