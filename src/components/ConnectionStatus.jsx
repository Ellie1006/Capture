import { signal } from '@preact/signals';
import { roomId, syncRole, connectedPeers, connectionStatus } from '../state/sync.js';
import { createRoom, joinRoom, disconnect } from '../services/peer-service.js';

const showPanel = signal(false);
const joinInput = signal('');

export function ConnectionStatus() {
  const status = connectionStatus.value;
  const role = syncRole.value;
  const peers = connectedPeers.value;
  const room = roomId.value;

  const statusColor = {
    connected: 'var(--color-success)',
    connecting: 'var(--color-warning)',
    disconnected: 'var(--color-text-muted)',
    error: 'var(--color-error)'
  }[status] || 'var(--color-text-muted)';

  function toggle() { showPanel.value = !showPanel.value; }

  function handleCreateRoom() {
    createRoom();
  }

  function handleJoinRoom() {
    const id = joinInput.value.trim();
    if (id.length >= 4) {
      joinRoom(id);
    }
  }

  function handleDisconnect() {
    disconnect();
    showPanel.value = false;
  }

  return (
    <div class="connection-status">
      <button class="connection-btn" onClick={toggle} aria-label="Conexión P2P">
        <span class="status-dot" style={{ background: statusColor }} />
        {peers.length > 0 && <span class="peer-count">{peers.length}</span>}
      </button>

      {showPanel.value && (
        <>
          <div class="export-backdrop" onClick={() => { showPanel.value = false; }} />
          <div class="connection-panel">
            {room ? (
              <div class="connection-info">
                <div class="room-label">Room ID</div>
                <div class="room-id">{room}</div>
                <div class="connection-meta">
                  {role === 'host' ? 'Host' : 'Viewer'} · {peers.length} conectado{peers.length !== 1 ? 's' : ''}
                </div>
                <button onClick={handleDisconnect}>Desconectar</button>
              </div>
            ) : (
              <div class="connection-actions">
                <button class="primary" onClick={handleCreateRoom}>
                  Crear sala (Host)
                </button>
                <div class="connection-divider">o</div>
                <div class="join-form">
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Room ID"
                    maxLength={6}
                    value={joinInput.value}
                    onInput={(e) => { joinInput.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinRoom(); }}
                    style="text-transform: uppercase; text-align: center; font-weight: 700; letter-spacing: 3px;"
                  />
                  <button onClick={handleJoinRoom}>Unirse (Viewer)</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
