import { Preferences } from '@capacitor/preferences';

const ACTION_HISTORY_KEY = 'xkey_action_history';
const MAX_HISTORY_ITEMS = 80;

const SENSITIVE_WORDS = ['private key', 'seed phrase', 'khóa riêng tư', 'cum tu', 'cụm từ'];

export type ActionHistoryType = 'info' | 'success' | 'warning' | 'error' | string;

export interface ActionHistoryItem {
  id: string;
  message: string;
  type: ActionHistoryType;
  ts: number;
}

const sanitizeMessage = (message: unknown): string => {
  const value = String(message || '').trim();
  if (!value) return '';

  const lower = value.toLowerCase();
  if (SENSITIVE_WORDS.some(word => lower.includes(word))) {
    return value.replace(/0x[a-fA-F0-9]{40,}/g, '0x...').replace(/[a-fA-F0-9]{64,}/g, '...');
  }

  return value;
};

export async function getActionHistory(): Promise<ActionHistoryItem[]> {
  try {
    const { value } = await Preferences.get({ key: ACTION_HISTORY_KEY });
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function logActionHistory(message: unknown, type: ActionHistoryType = 'info'): Promise<void> {
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) return;

  const nextItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message: cleanMessage,
    type,
    ts: Date.now(),
  };

  const current = await getActionHistory();
  const next = [nextItem, ...current].slice(0, MAX_HISTORY_ITEMS);
  await Preferences.set({ key: ACTION_HISTORY_KEY, value: JSON.stringify(next) });
  window.dispatchEvent(new CustomEvent('xkey-action-history-updated', { detail: next }));
}

export async function clearActionHistory(): Promise<void> {
  await Preferences.remove({ key: ACTION_HISTORY_KEY });
  window.dispatchEvent(new CustomEvent('xkey-action-history-updated', { detail: [] }));
}
