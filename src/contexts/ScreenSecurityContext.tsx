import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { BLOCK_SCREEN_CAPTURE_KEY, setScreenCaptureBlocked } from '../utils/screenSecurity';

type ScreenCaptureResult = {
  enabled?: boolean;
  supported: boolean;
};

type ScreenSecurityContextValue = {
  blocked: boolean;
  supported: boolean;
  setBlocked: (next: boolean) => Promise<ScreenCaptureResult>;
};

const ScreenSecurityContext = createContext<ScreenSecurityContextValue | null>(null);

export function useScreenSecurity(): ScreenSecurityContextValue {
  const ctx = useContext(ScreenSecurityContext);
  if (!ctx) throw new Error('useScreenSecurity must be used within ScreenSecurityProvider');
  return ctx;
}

export function ScreenSecurityProvider({ children }: { children: ReactNode }) {
  const [blocked, setBlockedState] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    Preferences.get({ key: BLOCK_SCREEN_CAPTURE_KEY }).then(async ({ value }) => {
      const next = value === 'true';
      setBlockedState(next);
      const result = await setScreenCaptureBlocked(next).catch(() => ({ supported: false }));
      setSupported(result.supported !== false);
    }).catch(() => {});
  }, []);

  const setBlocked = useCallback(async (next: boolean): Promise<ScreenCaptureResult> => {
    const normalized = !!next;
    const result = await setScreenCaptureBlocked(normalized).catch(() => ({ supported: false }));
    setSupported(result.supported !== false);
    setBlockedState(normalized);
    await Preferences.set({ key: BLOCK_SCREEN_CAPTURE_KEY, value: normalized ? 'true' : 'false' });
    return result;
  }, []);

  const value = useMemo(() => ({ blocked, setBlocked, supported }), [blocked, setBlocked, supported]);

  return (
    <ScreenSecurityContext.Provider value={value}>
      {children}
    </ScreenSecurityContext.Provider>
  );
}
