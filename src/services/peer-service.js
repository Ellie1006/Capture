import Peer from 'peerjs';
import { peerId, roomId, syncRole, connectedPeers, connectionStatus } from '../state/sync.js';
import { captureBlocks, responseBlocks, blockCounter, addCaptureBlock, addResponseBlock } from '../state/notepad.js';

let peer = null;
let connections = new Map();
let heartbeatInterval = null;
let reconnectTimer = null;
let hostRoomId = null;

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function createRoom() {
  if (peer) destroyPeer();

  const id = 'capture-' + generateRoomId();
  roomId.value = id.replace('capture-', '');

  peer = new Peer(id);
  syncRole.value = 'host';
  connectionStatus.value = 'connecting';

  peer.on('open', (myId) => {
    peerId.value = myId;
    connectionStatus.value = 'connected';
  });

  peer.on('connection', (conn) => {
    setupHostConnection(conn);
  });

  peer.on('error', (err) => {
    console.error('PeerJS host error:', err);
    connectionStatus.value = 'error';
  });

  peer.on('disconnected', () => {
    connectionStatus.value = 'disconnected';
    peer.reconnect();
  });
}

function setupHostConnection(conn) {
  conn.on('open', () => {
    connections.set(conn.peer, conn);
    updatePeerList();

    conn.send({
      type: 'FULL_STATE',
      captureBlocks: captureBlocks.value,
      responseBlocks: responseBlocks.value,
      blockCounter: blockCounter.value
    });
  });

  conn.on('data', (msg) => {
    handleHostMessage(msg, conn);
  });

  conn.on('close', () => {
    connections.delete(conn.peer);
    updatePeerList();
  });

  conn.on('error', () => {
    connections.delete(conn.peer);
    updatePeerList();
  });
}

function handleHostMessage(msg, fromConn) {
  switch (msg.type) {
    case 'APPEND_RESPONSE': {
      const exists = responseBlocks.value.some(b => b.id === msg.block.id);
      if (!exists) {
        responseBlocks.value = [...responseBlocks.value, msg.block];
        broadcastToAll({ type: 'APPEND_RESPONSE', block: msg.block }, fromConn.peer);
      }
      break;
    }
    case 'PING':
      fromConn.send({ type: 'PONG' });
      break;
  }
}

export function joinRoom(targetRoomId) {
  if (peer) destroyPeer();

  hostRoomId = 'capture-' + targetRoomId.toUpperCase();
  roomId.value = targetRoomId.toUpperCase();
  syncRole.value = 'viewer';
  connectionStatus.value = 'connecting';

  peer = new Peer();

  peer.on('open', () => {
    peerId.value = peer.id;
    connectToHost();
  });

  peer.on('error', (err) => {
    console.error('PeerJS viewer error:', err);
    connectionStatus.value = 'error';
    scheduleReconnect();
  });

  peer.on('disconnected', () => {
    connectionStatus.value = 'disconnected';
    peer.reconnect();
  });
}

function connectToHost() {
  if (!peer || !hostRoomId) return;

  const conn = peer.connect(hostRoomId, { reliable: true });

  conn.on('open', () => {
    connections.set(conn.peer, conn);
    connectionStatus.value = 'connected';
    updatePeerList();
    clearReconnectTimer();
    startHeartbeat(conn);
  });

  conn.on('data', (msg) => {
    handleViewerMessage(msg);
  });

  conn.on('close', () => {
    connections.delete(conn.peer);
    connectionStatus.value = 'disconnected';
    updatePeerList();
    stopHeartbeat();
    scheduleReconnect();
  });

  conn.on('error', () => {
    connections.delete(conn.peer);
    connectionStatus.value = 'error';
    updatePeerList();
    stopHeartbeat();
    scheduleReconnect();
  });
}

function handleViewerMessage(msg) {
  switch (msg.type) {
    case 'FULL_STATE':
      captureBlocks.value = msg.captureBlocks;
      responseBlocks.value = msg.responseBlocks;
      blockCounter.value = msg.blockCounter;
      break;
    case 'APPEND_CAPTURE': {
      const exists = captureBlocks.value.some(b => b.id === msg.block.id);
      if (!exists) {
        captureBlocks.value = [...captureBlocks.value, msg.block];
        blockCounter.value = Math.max(blockCounter.value, msg.block.questionNum);
      }
      break;
    }
    case 'APPEND_RESPONSE': {
      const exists = responseBlocks.value.some(b => b.id === msg.block.id);
      if (!exists) {
        responseBlocks.value = [...responseBlocks.value, msg.block];
      }
      break;
    }
    case 'PONG':
      break;
  }
}

function startHeartbeat(conn) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (conn.open) {
      conn.send({ type: 'PING' });
    } else {
      stopHeartbeat();
      scheduleReconnect();
    }
  }, 5000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

let reconnectAttempts = 0;

function scheduleReconnect() {
  clearReconnectTimer();
  if (syncRole.value !== 'viewer' || !hostRoomId) return;

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    if (peer && !peer.destroyed) {
      connectToHost();
    } else {
      joinRoom(roomId.value);
    }
  }, delay);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
}

export function broadcastToAll(msg, excludePeerId) {
  for (const [id, conn] of connections) {
    if (id !== excludePeerId && conn.open) {
      conn.send(msg);
    }
  }
}

export function sendToHost(msg) {
  for (const conn of connections.values()) {
    if (conn.open) conn.send(msg);
  }
}

function updatePeerList() {
  connectedPeers.value = Array.from(connections.keys());
}

export function disconnect() {
  destroyPeer();
  syncRole.value = 'host';
  connectionStatus.value = 'disconnected';
  roomId.value = null;
  peerId.value = null;
  connectedPeers.value = [];
}

function destroyPeer() {
  stopHeartbeat();
  clearReconnectTimer();
  for (const conn of connections.values()) conn.close();
  connections.clear();
  if (peer) {
    peer.destroy();
    peer = null;
  }
}
