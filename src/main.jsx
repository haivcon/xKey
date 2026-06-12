import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { MasterPasswordProvider } from './contexts/MasterPasswordContext';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <LanguageProvider>
          <ThemeProvider>
            <MasterPasswordProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <App />
                </ConfirmProvider>
              </ToastProvider>
            </MasterPasswordProvider>
          </ThemeProvider>
        </LanguageProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
