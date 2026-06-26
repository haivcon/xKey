import CryptoJS from 'crypto-js';

export const AUTOLOCK_OPTIONS = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
];

export type PinStep = 'current' | 'new' | 'confirm';

export const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : ''
);

export const parseStoredInt = (value: string | null, fallback = 0): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const hashPin = (p: string) => CryptoJS.SHA256(p + 'xkey_pin_salt_v1').toString();