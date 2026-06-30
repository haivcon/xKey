import { appendAuditLog } from '../../utils/auditLog';
import { requireSensitivePin } from './sensitivePin';

export type SensitiveAction =
  | 'backup.export'
  | 'backup.import_replace'
  | 'backup.import_override_sandbox'
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
  await appendAuditLog('security.sensitive_pin_required', { action, ...metadata }).catch(() => {});

  const pinOk = await requireSensitivePin(reason);

  await appendAuditLog(pinOk ? 'security.sensitive_pin_required_success' : 'security.sensitive_pin_required_failed', {
    action,
    ...metadata,
  }).catch(() => {});

  return pinOk;
}