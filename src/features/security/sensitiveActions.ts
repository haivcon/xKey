import { appendAuditLog } from '../../utils/auditLog';
import { reauthenticate } from '../../hooks/security/useReauth';
import { requireSensitivePin } from './sensitivePin';

export type SensitiveAction =
  | 'backup.export'
  | 'backup.import_replace'
  | 'secret.reveal'
  | 'vault.delete'
  | 'shamir.create_shares'
  | 'backup.export_scoped';

export type RequireSensitiveActionOptions = {
  action: SensitiveAction;
  reason: string;
  metadata?: Record<string, unknown>;
};

export async function requireSensitiveAction({
  action,
  reason,
  metadata = {},
}: RequireSensitiveActionOptions): Promise<boolean> {
  await appendAuditLog('security.reauth_requested', { action, ...metadata }).catch(() => {});

  const deviceOk = await reauthenticate(reason);

  await appendAuditLog(deviceOk ? 'security.reauth_success' : 'security.reauth_failed', {
    action,
    ...metadata,
  }).catch(() => {});

  if (!deviceOk) return false;

  const pinOk = await requireSensitivePin(reason);

  await appendAuditLog(pinOk ? 'security.sensitive_pin_required_success' : 'security.sensitive_pin_required_failed', {
    action,
    ...metadata,
  }).catch(() => {});

  return pinOk;
}