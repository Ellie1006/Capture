import { activeTab } from '../state/notepad.js';
import { CameraPanel } from './CameraPanel.jsx';
import { NotepadPanel } from './NotepadPanel.jsx';
import { ResponsesPanel } from './ResponsesPanel.jsx';
import { TabBar } from './TabBar.jsx';

export function HostLayout() {
  const tab = activeTab.value;

  return (
    <div class="host-layout">
      <div class="host-camera">
        <CameraPanel />
      </div>
      <div class="host-notepad">
        <TabBar />
        <div class="notepad-content">
          {tab === 'captures' ? <NotepadPanel /> : <ResponsesPanel />}
        </div>
      </div>
    </div>
  );
}
