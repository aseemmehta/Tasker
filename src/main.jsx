import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initAnalytics } from './lib/analytics.js';
import './styles.css';

initAnalytics(); // loads GA only if the visitor already accepted

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
