import { Capacitor, registerPlugin } from '@capacitor/core';

export interface HardwareSecurityInfo {
  deviceSecure: boolean;
  keystoreAvailable: boolean;
  strongBoxSupported: boolean;
  vaultKeyStored: boolean;
  vaultKeyInsideSecureHardware: boolean;
}

type DeviceCredentialOptions = {
  title?: string;
  subtitle?: string;
};

type DeviceCredentialPlugin = {
  isAvailable: () => Promise<{ isAvailable?: boolean }>;
  getHardwareSecurityInfo: () => Promise<HardwareSecurityInfo>;
  authenticate: (options: Required<DeviceCredentialOptions>) => Promise<void>;
  hasVaultKey: () => Promise<{ value?: boolean }>;
  setVaultKey: (options: { key: string; title: string; subtitle: string }) => Promise<void>;
  getVaultKey: (options: Required<DeviceCredentialOptions>) => Promise<{ key?: string }>;
  deleteVaultKey: () => Promise<void>;
  openSecuritySettings: () => Promise<void>;
};

const DeviceCredential = registerPlugin<DeviceCredentialPlugin>('DeviceCredential');

const DEFAULT_TITLE = 'Unlock xKey';
const DEFAULT_SUBTITLE = 'Use your device lock';

export const isDeviceCredentialAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await DeviceCredential.isAvailable();
    return !!result?.isAvailable;
  } catch {
    return false;
  }
};

export const getHardwareSecurityInfo = async (): Promise<HardwareSecurityInfo> => {
  if (!Capacitor.isNativePlatform()) {
    return {
      deviceSecure: false,
      keystoreAvailable: false,
      strongBoxSupported: false,
      vaultKeyStored: false,
      vaultKeyInsideSecureHardware: false,
    };
  }
  try {
    return await DeviceCredential.getHardwareSecurityInfo();
  } catch {
    return {
      deviceSecure: false,
      keystoreAvailable: false,
      strongBoxSupported: false,
      vaultKeyStored: false,
      vaultKeyInsideSecureHardware: false,
    };
  }
};

export const authenticateDeviceCredential = async (options: DeviceCredentialOptions = {}): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.authenticate({
    title: options.title || DEFAULT_TITLE,
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return true;
};

export const hasDeviceProtectedVaultKey = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await DeviceCredential.hasVaultKey();
    return !!result?.value;
  } catch {
    return false;
  }
};

export const setDeviceProtectedVaultKey = async (key: string, options: DeviceCredentialOptions = {}): Promise<boolean> => {
  if (!Capacitor.isNativePlatform() || !key) return false;
  await DeviceCredential.setVaultKey({
    key,
    title: options.title || 'Protect xKey',
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return true;
};

export const getDeviceProtectedVaultKey = async (options: DeviceCredentialOptions = {}): Promise<string | undefined> => {
  if (!Capacitor.isNativePlatform()) throw new Error('Device credential is not available');
  const result = await DeviceCredential.getVaultKey({
    title: options.title || DEFAULT_TITLE,
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return result?.key;
};

export const deleteDeviceProtectedVaultKey = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.deleteVaultKey();
  return true;
};

export const openDeviceSecuritySettings = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.openSecuritySettings();
  return true;
};
