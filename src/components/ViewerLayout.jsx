import { signal } from '@preact/signals';
import { activeTab } from '../state/notepad.js';
import { NotepadPanel } from './NotepadPanel.jsx';
import { ResponsesPanel } from './ResponsesPanel.jsx';
import { TabBar } from './TabBar.jsx';
import { RemoteCaptureView } from './RemoteCaptureView.jsx';

const showRemoteCapture = signal(false);

export function ViewerLayout() {
  if (showRemoteCapture.value) {
    return <RemoteCaptureView onExit={() => { showRemoteCapture.value = false; }} />;
  }

  const tab = activeTab.value;

  return (
    <div class="viewer-layout">
      <TabBar />
      <div class="notepad-content">
        {tab === 'captures' ? <NotepadPanel /> : <ResponsesPanel />}
      </div>
      <button
        class="remote-capture-fab"
        onClick={() => { showRemoteCapture.value = true; }}
        aria-label="Captura remota"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <circle cx="12" cy="12" r="5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
