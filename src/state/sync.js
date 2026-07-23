import { signal } from '@preact/signals';

export const peerId = signal(null);
export const roomId = signal(null);
export const syncRole = signal('host');
export const connectedPeers = signal([]);
export const connectionStatus = signal('disconnected');
