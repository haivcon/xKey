import { Capacitor, registerPlugin } from '@capacitor/core';

const DeviceCredential = registerPlugin('DeviceCredential');

const DEFAULT_TITLE = 'Unlock xKey';
const DEFAULT_SUBTITLE = 'Use your device lock';

export const isDeviceCredentialAvailable = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await DeviceCredential.isAvailable();
    return !!result?.isAvailable;
  } catch {
    return false;
  }
};

export const authenticateDeviceCredential = async (options = {}) => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.authenticate({
    title: options.title || DEFAULT_TITLE,
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return true;
};

export const hasDeviceProtectedVaultKey = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await DeviceCredential.hasVaultKey();
    return !!result?.value;
  } catch {
    return false;
  }
};

export const setDeviceProtectedVaultKey = async (key, options = {}) => {
  if (!Capacitor.isNativePlatform() || !key) return false;
  await DeviceCredential.setVaultKey({
    key,
    title: options.title || 'Protect xKey',
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return true;
};

export const getDeviceProtectedVaultKey = async (options = {}) => {
  if (!Capacitor.isNativePlatform()) throw new Error('Device credential is not available');
  const result = await DeviceCredential.getVaultKey({
    title: options.title || DEFAULT_TITLE,
    subtitle: options.subtitle || DEFAULT_SUBTITLE,
  });
  return result?.key;
};

export const deleteDeviceProtectedVaultKey = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.deleteVaultKey();
  return true;
};

export const openDeviceSecuritySettings = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceCredential.openSecuritySettings();
  return true;
};
