import { render } from 'preact';
import { App } from './app.jsx';
import './index.css';
import './services/ocr-queue-service.js';
import { loadSession, startAutoSave } from './services/storage-service.js';

loadSession().then(() => {
  startAutoSave();
});

render(<App />, document.getElementById('app'));
