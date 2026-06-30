import { Preferences } from '@capacitor/preferences';

export const SECURITY_EVENTS_KEY = 'xkey.security.events.v1';

export type SecurityEventLevel = 'info' | 'success' | 'warning' | 'danger';

export type SecurityEvent = {
  id: string;
  type: string;
  title: string;
  detail?: string;
  level: SecurityEventLevel;
  at: string;
};

export async function getSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
  const { value } = await Preferences.get({ key: SECURITY_EVENTS_KEY });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, limit).filter(event => event && typeof event.id === 'string');
  } catch {
    return [];
  }
}

export async function recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'at'>): Promise<SecurityEvent[]> {
  const current = await getSecurityEvents(50);
  const next: SecurityEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  const events = [next, ...current].slice(0, 50);
  await Preferences.set({ key: SECURITY_EVENTS_KEY, value: JSON.stringify(events) });
  return events;
}

export async function clearSecurityEvents(): Promise<void> {
  await Preferences.remove({ key: SECURITY_EVENTS_KEY });
}