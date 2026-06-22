import { Preferences } from '@capacitor/preferences';

const ACTION_HISTORY_KEY = 'xkey_action_history';
const MAX_HISTORY_ITEMS = 80;

const SENSITIVE_WORDS = ['private key', 'seed phrase', 'khóa riêng tư', 'cum tu', 'cụm từ'];

export type ActionHistoryType = 'info' | 'success' | 'warning' | 'error' | string;
export type ActionHistoryCategory = 'all' | 'unlock' | 'backup' | 'copy' | 'warning' | 'data' | 'other';

export interface ActionHistoryItem {
  id: string;
  message: string;
  messageKey?: string;
  vars?: Record<string, string | number | boolean | null | undefined>;
  category?: ActionHistoryCategory;
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
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      category: item.category || inferActionCategory(item),
    }));
  } catch {
    return [];
  }
}

export const inferActionCategory = (item: Partial<ActionHistoryItem>): ActionHistoryCategory => {
  const source = `${item.category || ''} ${item.messageKey || ''} ${item.message || ''}`.toLowerCase();
  if (source.includes('unlock') || source.includes('mở khóa') || source.includes('pin')) return 'unlock';
  if (source.includes('backup') || source.includes('sao lưu') || source.includes('.xkey') || source.includes('restore') || source.includes('khôi phục')) return 'backup';
  if (source.includes('copy') || source.includes('copied') || source.includes('clipboard') || source.includes('sao chép') || source.includes('复制')) return 'copy';
  if (source.includes('warning') || source.includes('warn') || source.includes('error') || source.includes('failed') || source.includes('corrupted') || source.includes('hỏng')) return 'warning';
  if (source.includes('wallet') || source.includes('ví') || source.includes('import') || source.includes('export') || source.includes('csv') || source.includes('data')) return 'data';
  return 'other';
};

type LogActionHistoryOptions = {
  type?: ActionHistoryType;
  messageKey?: string;
  vars?: Record<string, string | number | boolean | null | undefined>;
  category?: ActionHistoryCategory;
};

export async function logActionHistory(message: unknown, typeOrOptions: ActionHistoryType | LogActionHistoryOptions = 'info'): Promise<void> {
  const options = typeof typeOrOptions === 'object' ? typeOrOptions : { type: typeOrOptions };
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) return;

  const nextItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message: cleanMessage,
    messageKey: options.messageKey,
    vars: options.vars,
    category: options.category || inferActionCategory({ message: cleanMessage, messageKey: options.messageKey, type: options.type }),
    type: options.type || 'info',
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
