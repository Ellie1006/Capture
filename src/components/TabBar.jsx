import { activeTab, totalCaptures, totalResponses } from '../state/notepad.js';

export function TabBar() {
  const current = activeTab.value;

  return (
    <div class="tab-bar">
      <button
        class={`tab-btn ${current === 'captures' ? 'active' : ''}`}
        onClick={() => { activeTab.value = 'captures'; }}
      >
        Capturas {totalCaptures.value > 0 && <span class="tab-badge">{totalCaptures.value}</span>}
      </button>
      <button
        class={`tab-btn ${current === 'responses' ? 'active' : ''}`}
        onClick={() => { activeTab.value = 'responses'; }}
      >
        Respuestas {totalResponses.value > 0 && <span class="tab-badge">{totalResponses.value}</span>}
      </button>
    </div>
  );
}
