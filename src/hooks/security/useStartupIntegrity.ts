import { useEffect, useRef, useState } from 'react';
import { runRuntimeIntegrityChecks } from '../../utils/runtimeIntegrity';
import { STARTUP_WATCHDOG_MS } from '../../app/constants';
import type { TranslationFn } from '../../contexts/LanguageContext';

type UseStartupIntegrityOptions = {
  t: TranslationFn;
  setAuthError: (error: string) => void;
  setVaultLoading: (loading: boolean) => void;
};

export default function useStartupIntegrity({ t, setAuthError, setVaultLoading }: UseStartupIntegrityOptions) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [integrityReady, setIntegrityReady] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState('');
  const [integrityFailed, setIntegrityFailed] = useState(false);

  const tRef = useRef(t);
  const integrityCheckRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    if (!integrityCheckRef.current) {
      integrityCheckRef.current = runRuntimeIntegrityChecks((step) => {
        const statusByStep = {
          crypto: tRef.current('integrity.cryptoChecking'),
          app: tRef.current('integrity.appChecking'),
          done: tRef.current('integrity.ready'),
        };
        setIntegrityStatus(statusByStep[step] || '');
      });
    }

    integrityCheckRef.current
      .then(() => {
        if (!cancelled) setIntegrityReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setIntegrityStatus('');
        setIntegrityFailed(true);
        setAuthError(error?.message || tRef.current('integrity.failureBody'));
        setVaultLoading(false);
        setShowSplash(false);
        setIntegrityReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setAuthError, setVaultLoading]);

  useEffect(() => {
    if (splashAnimationDone && integrityReady) setShowSplash(false);
  }, [splashAnimationDone, integrityReady]);

  useEffect(() => {
    if (!showSplash || integrityReady || integrityFailed) return undefined;
    const timer = window.setTimeout(() => {
      setIntegrityStatus('');
      setIntegrityFailed(true);
      setAuthError(tRef.current('integrity.failureBody'));
      setVaultLoading(false);
      setShowSplash(false);
    }, STARTUP_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [integrityFailed, integrityReady, setAuthError, setVaultLoading, showSplash]);

  const resetIntegrityFailure = () => {
    setIntegrityFailed(false);
  };

  return {
    showSplash,
    setShowSplash,
    splashAnimationDone,
    setSplashAnimationDone,
    integrityReady,
    integrityStatus,
    integrityFailed,
    setIntegrityFailed,
    resetIntegrityFailure,
  };
}