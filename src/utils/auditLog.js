import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

const AUDIT_LOG_KEY = 'xkey_security_audit_log_v1';
const AUDIT_LOG_SECRET_KEY = 'xkey_security_audit_secret_v1';
const MAX_AUDIT_ENTRIES = 500;

const randomId = () => {
  try {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
};

const getAuditSecret = async () => {
  const { value } = await Preferences.get({ key: AUDIT_LOG_SECRET_KEY });
  if (value) return value;
  const secret = randomId() + randomId();
  await Preferences.set({ key: AUDIT_LOG_SECRET_KEY, value: secret });
  return secret;
};

const readRawEntries = async () => {
  const { value } = await Preferences.get({ key: AUDIT_LOG_KEY });
  if (!value) return [];
  try {
    const entries = JSON.parse(value);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
};

const decryptPayload = (cipher, secret) => {
  const bytes = CryptoJS.AES.decrypt(cipher, secret);
  const text = bytes.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Unable to decrypt audit entry.');
  return JSON.parse(text);
};

export const appendAuditLog = async (type, details = {}) => {
  try {
    const secret = await getAuditSecret();
    const entries = await readRawEntries();
    const previousHash = entries.at(-1)?.entryHash || 'GENESIS';
    const timestamp = new Date().toISOString();
    const payload = {
      type,
      details,
      userAgent: navigator.userAgent || '',
    };
    const encryptedPayload = CryptoJS.AES.encrypt(JSON.stringify(payload), secret).toString();
    const entry = {
      id: randomId(),
      version: 1,
      timestamp,
      previousHash,
      encryptedPayload,
    };
    entry.entryHash = CryptoJS.SHA256(`${entry.version}|${entry.id}|${entry.timestamp}|${entry.previousHash}|${entry.encryptedPayload}`).toString();
    const nextEntries = [...entries, entry].slice(-MAX_AUDIT_ENTRIES);
    await Preferences.set({ key: AUDIT_LOG_KEY, value: JSON.stringify(nextEntries) });
    window.dispatchEvent(new CustomEvent('xkey-audit-log-updated'));
    return true;
  } catch (error) {
    console.warn('Audit log append failed', error);
    return false;
  }
};

export const readAuditLog = async () => {
  const secret = await getAuditSecret();
  const entries = await readRawEntries();
  let previousHash = 'GENESIS';
  let tampered = false;

  const decoded = entries.map((entry) => {
    const expectedHash = CryptoJS.SHA256(`${entry.version}|${entry.id}|${entry.timestamp}|${entry.previousHash}|${entry.encryptedPayload}`).toString();
    const entryTampered = entry.previousHash !== previousHash || entry.entryHash !== expectedHash;
    if (entryTampered) tampered = true;
    previousHash = entry.entryHash || expectedHash;

    let payload = { type: 'audit.decrypt_failed', details: {} };
    try {
      payload = decryptPayload(entry.encryptedPayload, secret);
    } catch {
      tampered = true;
    }

    return {
      id: entry.id,
      timestamp: entry.timestamp,
      type: payload.type,
      details: payload.details || {},
      hash: entry.entryHash,
      tampered: entryTampered,
    };
  });

  return { entries: decoded.reverse(), tampered };
};

export const clearAuditLog = async () => {
  await Preferences.remove({ key: AUDIT_LOG_KEY });
  await appendAuditLog('audit.cleared');
};
