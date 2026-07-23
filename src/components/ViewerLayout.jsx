import { activeTab } from '../state/notepad.js';
import { NotepadPanel } from './NotepadPanel.jsx';
import { ResponsesPanel } from './ResponsesPanel.jsx';
import { TabBar } from './TabBar.jsx';

export function ViewerLayout() {
  const tab = activeTab.value;

  return (
    <div class="viewer-layout">
      <TabBar />
      <div class="notepad-content">
        {tab === 'captures' ? <NotepadPanel /> : <ResponsesPanel />}
      </div>
    </div>
  );
}
