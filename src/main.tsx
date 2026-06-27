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
import ErrorBoundary from './components/shared/ErrorBoundary';

const hideNativeSplash = () => {
  SplashScreen.hide().catch(() => {});
};

hideNativeSplash();
setTimeout(hideNativeSplash, 1200);

function Boot() {
  const t = useT();
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [bootError, setBootError] = useState<unknown>(null);
  const [bootSlow, setBootSlow] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setBootSlow(false);
    setBootError(null);
    const slowTimer = window.setTimeout(() => {
      if (mounted) setBootSlow(true);
    }, 5000);

    import('./App')
      .then(module => {
        if (mounted) setAppComponent(() => module.default);
      })
      .catch(error => {
        console.error('Failed to boot xKey', error);
        if (mounted) setBootError(error);
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
        hideNativeSplash();
      });

    return () => {
      mounted = false;
      window.clearTimeout(slowTimer);
    };
  }, [bootAttempt]);

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950 p-6 text-center text-surface-100">
        <div className="max-w-sm">
          <h1 className="mb-2 text-xl font-bold text-white">{t('boot.failedTitle')}</h1>
          <p className="mb-4 text-sm text-surface-400">{t('boot.failedBody')}</p>
          <pre className="max-h-48 overflow-auto rounded-lg bg-surface-900 p-3 text-left text-scale-xs text-red-300">
            {bootError instanceof Error ? bootError.message : String(bootError)}
          </pre>
        </div>
      </div>
    );
  }

  if (!AppComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-center text-white">
        <div>
          <div className="text-[56px] font-bold tracking-[2px]">xKey</div>
          {bootSlow && (
            <div className="mt-5 max-w-xs text-sm text-surface-300">
              <p className="mb-3">{t('boot.slowBody')}</p>
              <button
                type="button"
                onClick={() => setBootAttempt(attempt => attempt + 1)}
                className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white"
              >
                {t('boot.retry')}
              </button>
            </div>
          )}
        </div>
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
