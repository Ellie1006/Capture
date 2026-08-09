import { signal } from '@preact/signals';

export const cameraStream = signal(null);
export const isCameraReady = signal(false);
export const selectedDeviceId = signal(null);
export const cameraError = signal(null);

export const isCalibrated = signal(false);
export const roiCorners = signal(null);
export const perspectiveMatrix = signal(null);

export const remoteCaptureRequested = signal(false);

export const cameraZoom = signal(1);
export const zoomRange = signal({ min: 0.5, max: 4, step: 0.1, hardware: false });
