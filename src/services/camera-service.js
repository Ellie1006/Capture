import { cameraStream, isCameraReady, cameraError, selectedDeviceId, cameraZoom, zoomRange } from '../state/camera.js';
import { selectedCameraId } from '../state/settings.js';

export async function startCamera(videoEl) {
  try {
    cameraError.value = null;
    const deviceId = selectedCameraId.value || undefined;
    const constraints = {
      video: {
        facingMode: deviceId ? undefined : { ideal: 'environment' },
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraStream.value = stream;

    videoEl.srcObject = stream;
    await videoEl.play();
    isCameraReady.value = true;
    initZoom(stream);
  } catch (err) {
    cameraError.value = err.message || 'No se pudo acceder a la cámara';
    isCameraReady.value = false;
  }
}

function initZoom(stream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    const caps = track.getCapabilities();
    if (caps.zoom) {
      zoomRange.value = {
        min: caps.zoom.min,
        max: caps.zoom.max,
        step: caps.zoom.step || 0.1,
        hardware: true
      };
      return;
    }
  } catch (_) {}

  zoomRange.value = { min: 0.5, max: 4, step: 0.1, hardware: false };
  cameraZoom.value = 1;
}

export async function applyZoom(level) {
  const range = zoomRange.value;
  const clamped = Math.round(Math.max(range.min, Math.min(level, range.max)) * 10) / 10;
  cameraZoom.value = clamped;

  if (range.hardware) {
    const stream = cameraStream.value;
    const track = stream && stream.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: clamped }] });
      } catch (_) {}
    }
  }
}

export function stopCamera() {
  const stream = cameraStream.value;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    cameraStream.value = null;
  }
  isCameraReady.value = false;
  cameraZoom.value = 1;
}

export function captureFrame(videoEl, digitalZoom = 1) {
  const canvas = document.createElement('canvas');
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');

  if (digitalZoom > 1) {
    const cropW = vw / digitalZoom;
    const cropH = vh / digitalZoom;
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;
    ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, vw, vh);
  } else {
    ctx.drawImage(videoEl, 0, 0);
  }

  return canvas;
}

export async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'videoinput');
}
