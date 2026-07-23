import { useEffect } from 'preact/hooks';
import { syncRole } from './state/sync.js';
import { joinRoom } from './services/peer-service.js';
import { HostLayout } from './components/HostLayout.jsx';
import { ViewerLayout } from './components/ViewerLayout.jsx';
import { Toolbar } from './components/Toolbar.jsx';

export function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      joinRoom(room);
    }
  }, []);

  const role = syncRole.value;

  return (
    <div class="app">
      <Toolbar />
      <main class="app-main">
        {role === 'viewer' ? <ViewerLayout /> : <HostLayout />}
      </main>
    </div>
  );
}
