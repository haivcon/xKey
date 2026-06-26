import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ONBOARDED_KEY } from '../../components/auth/OnboardingScreen';
import { PIN_HASH_KEY } from '../../components/auth/PinLockScreen';
import type { PinSuccessOptions } from '../../app/types';
import type { TranslationFn } from '../../contexts/LanguageContext';
import { appendAuditLog } from '../../utils/auditLog';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled } from '../../utils/deviceIntegrity';
import {
  getEncryptionKeyBiometric,
  getEncryptionKeyFallback,
  hasFallbackEncryptionKey,
  isBiometricAvailable,
  loadWallets,
  persistBiometricEncryptionKey,
  persistFallbackEncryptionKey,
} from '../../utils/storage';
import type { Wallet } from '../../types';

type UseVaultAuthOptions = {
  showSplash: boolean;
  setWallets: (wallets: Wallet[]) => void;
  setAuthError: (message: string) => void;
  t: TranslationFn;
};

export default function useVaultAuth({
  showSplash,
  setWallets,
  setAuthError,
  t,
}: UseVaultAuthOptions) {
  const [aesKey, setAesKey] = useState<string | null>(null);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const useDeviceCredentialUnlock = Capacitor.isNativePlatform();
  const tRef = useRef(t);
  const setWalletsRef = useRef(setWallets);
  const setAuthErrorRef = useRef(setAuthError);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    setWalletsRef.current = setWallets;
  }, [setWallets]);

  useEffect(() => {
    setAuthErrorRef.current = setAuthError;
  }, [setAuthError]);

  useEffect(() => {
    if (showSplash) return;

    const authenticate = async () => {
      try {
        if (useDeviceCredentialUnlock && await isDeviceIntegrityGuardEnabled()) {
          const riskInfo = await getDeviceIntegrityRisk();
          if (riskInfo?.risky) {
            await appendAuditLog('device_integrity.blocked', { reasons: riskInfo.reasons || [] }).catch(() => {});
            setAuthErrorRef.current(tRef.current('integrity.deviceRiskBlocked'));
            setVaultLoading(false);
            return;
          }
        }

        const { value: onboarded } = await Preferences.get({ key: ONBOARDED_KEY });
        if (!onboarded) {
          setShowOnboarding(true);
        }

        const hasBio = await isBiometricAvailable();
        if (hasBio) {
          if (useDeviceCredentialUnlock) {
            setNeedsPinAuth(true);
          } else {
            try {
              const key = await getEncryptionKeyBiometric();
              setAesKey(key);
              const savedWallets = await loadWallets(key);
              if (savedWallets && savedWallets.length > 0) {
                setWalletsRef.current(savedWallets);
              }
            } catch (bioErr) {
              const [{ value: pinHash }, hasFallbackKey] = await Promise.all([
                Preferences.get({ key: PIN_HASH_KEY }),
                hasFallbackEncryptionKey(),
              ]);
              if (pinHash && hasFallbackKey) {
                setNeedsPinAuth(true);
              } else {
                throw bioErr;
              }
            }
          }
        } else {
          setNeedsPinAuth(true);
        }
      } catch (err) {
        setAuthErrorRef.current(err instanceof Error ? err.message : tRef.current('deviceUnlock.unlockFailed'));
      }
      setVaultLoading(false);
    };

    authenticate();
  }, [showSplash, useDeviceCredentialUnlock]);

  const handlePinSuccess = useCallback(async (isDecoy = false, options: PinSuccessOptions = {}) => {
    try {
      setIsDecoyMode(isDecoy);
      const key = aesKey || await getEncryptionKeyFallback({ createIfMissing: !!options.createdPin });
      if (aesKey) {
        await persistFallbackEncryptionKey(aesKey);
      }
      if (!isDecoy) {
        persistBiometricEncryptionKey(key).catch(() => {});
      }
      setAesKey(key);
      const savedWallets = await loadWallets(key, isDecoy);
      setWalletsRef.current(savedWallets && savedWallets.length > 0 ? savedWallets : []);
      setNeedsPinAuth(false);
    } catch (err) {
      console.error('[useVaultAuth] handlePinSuccess failed:', err);
      setAuthErrorRef.current(err instanceof Error ? err.message : tRef.current('deviceUnlock.unlockFailed'));
    }
  }, [aesKey]);

  const handleDeviceUnlock = useCallback(async () => {
    setIsDecoyMode(false);
    const key = await getEncryptionKeyBiometric();
    setAesKey(key);
    const savedWallets = await loadWallets(key);
    setWalletsRef.current(savedWallets && savedWallets.length > 0 ? savedWallets : []);
    setNeedsPinAuth(false);
  }, []);

  const resetVaultLock = useCallback(() => {
    setAesKey(null);
    setNeedsPinAuth(true);
  }, []);

  return {
    aesKey,
    setAesKey,
    isDecoyMode,
    setIsDecoyMode,
    showOnboarding,
    setShowOnboarding,
    vaultLoading,
    setVaultLoading,
    needsPinAuth,
    setNeedsPinAuth,
    useDeviceCredentialUnlock,
    handlePinSuccess,
    handleDeviceUnlock,
    resetVaultLock,
  };
}