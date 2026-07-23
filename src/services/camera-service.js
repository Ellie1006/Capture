import { cameraStream, isCameraReady, cameraError, selectedDeviceId } from '../state/camera.js';
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
  } catch (err) {
    cameraError.value = err.message || 'No se pudo acceder a la cámara';
    isCameraReady.value = false;
  }
}

export function stopCamera() {
  const stream = cameraStream.value;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    cameraStream.value = null;
  }
  isCameraReady.value = false;
}

export function captureFrame(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0);
  return canvas;
}

export async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'videoinput');
}
