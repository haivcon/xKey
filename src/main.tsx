import { StrictMode, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { LanguageProvider, useT } from './contexts/LanguageContext';
import { MasterPasswordProvider } from './contexts/MasterPasswordContext';
import { ScrambledKeyboardProvider } from './contexts/ScrambledKeyboardContext';
import { SecureDisplayProvider } from './contexts/SecureDisplayContext';
import { ScreenSecurityProvider } from './contexts/ScreenSecurityContext';
import ErrorBoundary from './components/ErrorBoundary';

const hideNativeSplash = () => {
  SplashScreen.hide().catch(() => {});
};

hideNativeSplash();
setTimeout(hideNativeSplash, 1200);

function Boot() {
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [bootError, setBootError] = useState<unknown>(null);

  useEffect(() => {
    let mounted = true;
    import('./App')
      .then(module => {
        if (mounted) setAppComponent(() => module.default);
      })
      .catch(error => {
        console.error('Failed to boot xKey', error);
        if (mounted) setBootError(error);
      })
      .finally(hideNativeSplash);

    return () => {
      mounted = false;
    };
  }, []);

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950 p-6 text-center text-surface-100">
        <div className="max-w-sm">
          <h1 className="mb-2 text-xl font-bold text-white">xKey failed to start</h1>
          <p className="mb-4 text-sm text-surface-400">Restart the app. If this keeps happening, reset the app data or reinstall xKey.</p>
          <pre className="max-h-48 overflow-auto rounded-lg bg-surface-900 p-3 text-left text-[11px] text-red-300">
            {bootError instanceof Error ? bootError.message : String(bootError)}
          </pre>
        </div>
      </div>
    );
  }

  if (!AppComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-[56px] font-bold tracking-[2px] text-white">
        xKey
      </div>
    );
  }

  return <AppComponent />;
}

function LocalizedErrorBoundary({ children }: { children: ReactNode }) {
  const t = useT();
  return <ErrorBoundary t={t}>{children}</ErrorBoundary>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <LanguageProvider>
          <LocalizedErrorBoundary>
            <ThemeProvider>
              <MasterPasswordProvider>
                <ScrambledKeyboardProvider>
                  <SecureDisplayProvider>
                    <ScreenSecurityProvider>
                      <ToastProvider>
                        <ConfirmProvider>
                          <Boot />
                        </ConfirmProvider>
                      </ToastProvider>
                    </ScreenSecurityProvider>
                  </SecureDisplayProvider>
                </ScrambledKeyboardProvider>
              </MasterPasswordProvider>
            </ThemeProvider>
          </LocalizedErrorBoundary>
        </LanguageProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
