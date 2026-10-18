import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { initPWAUpdate } from './app/global/lib/pwaUpdate';

// Register the service worker and expose the "update available" signal to the
// rest of the app (consumed by the global PwaUpdatePrompt and the farmer Menu
// Update card).
initPWAUpdate();

createRoot(document.getElementById('root')).render(<App />);
