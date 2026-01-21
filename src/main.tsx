import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// QA Showcase: A11y Audit in Dev
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000, {
      rules: [
        { id: 'color-contrast', enabled: true },
        { id: 'aria-valid-attr', enabled: true }
      ]
    });
    console.log('%c[QA Audit] Accessibility Monitoring Active', 'color: #00D155; font-weight: bold;');
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
