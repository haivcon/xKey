import { useCallback, useMemo } from 'react';
import { appendAuditLog } from '../utils/auditLog';
import { runWalletProofCheck, selectProofWallets, shouldShowProofOfKeysReminder, summarizeKeyHealth, type ProofCheckReport, type ProofScope } from '../utils/keyHealth';
import { saveWallets } from '../utils/storage';
import type { TranslationFn } from '../contexts/LanguageContext';
import type { Wallet } from '../types';

type UseKeyHealthFlowOptions = {
  aesKey: string | null;
  wallets: Wallet[];
  filteredWallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  isDecoyMode: boolean;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  t: TranslationFn;
};

export default function useKeyHealthFlow({
  aesKey,
  wallets,
  filteredWallets,
  setWallets,
  isDecoyMode,
  showToast,
  t,
}: UseKeyHealthFlowOptions) {
  const keyHealthSummary = useMemo(() => summarizeKeyHealth(wallets), [wallets]);
  const showProofOfKeysReminder = shouldShowProofOfKeysReminder();
  const keyHealthAttentionCount = keyHealthSummary.attentionCount + (showProofOfKeysReminder ? 1 : 0);

  const getWalletIdentity = useCallback((wallet: Wallet) => (
    wallet._id || `${wallet.address || ''}|${wallet.name || ''}|${wallet.groupId || ''}|${wallet.createdAt || ''}`
  ), []);

  const runProofOfKeysCheck = useCallback(async (scope: ProofScope): Promise<ProofCheckReport> => {
    const now = Date.now();
    if (!aesKey || wallets.length === 0) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, checkedAt: now, scope, results: [] };
    }

    const targetWallets = selectProofWallets(wallets, scope, filteredWallets, now);
    if (targetWallets.length === 0) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, checkedAt: now, scope, results: [] };
    }

    const randomNonce = crypto.getRandomValues(new Uint8Array(16));
    const nonce = Array.from(randomNonce, byte => byte.toString(16).padStart(2, '0')).join('');
    const checkedTargets = await Promise.all(targetWallets.map(wallet => runWalletProofCheck(wallet, nonce, now)));
    const checkedById = new Map(checkedTargets.map(wallet => [getWalletIdentity(wallet), wallet]));
    const checked = wallets.map(wallet => checkedById.get(getWalletIdentity(wallet)) || wallet);

    setWallets(checked);
    await saveWallets(checked, aesKey, isDecoyMode);

    const passed = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'passed').length;
    const failed = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'failed').length;
    const skipped = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'skipped').length;
    const report: ProofCheckReport = {
      total: checkedTargets.length,
      passed,
      failed,
      skipped,
      checkedAt: now,
      scope,
      results: checkedTargets.map(wallet => ({
        name: wallet.name || t('walletCard.unnamed'),
        address: wallet.address || '',
        status: wallet.lastProofOfKeysStatus || 'skipped',
        message: wallet.lastProofOfKeysMessage || '',
      })),
    };

    appendAuditLog('wallet.proof_of_keys_check', { total: checkedTargets.length, passed, failed, skipped, scope }).catch(() => {});
    showToast?.(t('keyHealth.proofResult', { passed, total: checkedTargets.length, failed, skipped }), failed > 0 ? 'warning' : 'success');

    return report;
  }, [aesKey, wallets, filteredWallets, getWalletIdentity, setWallets, isDecoyMode, showToast, t]);

  const patchKeyHealthWallets = useCallback(async (targetWallets: Wallet[], patch: Partial<Wallet>) => {
    if (!aesKey || targetWallets.length === 0) return;
    const targetIds = new Set(targetWallets.map(getWalletIdentity));
    const updated = wallets.map(wallet => targetIds.has(getWalletIdentity(wallet)) ? { ...wallet, ...patch } : wallet);
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [aesKey, wallets, getWalletIdentity, setWallets, isDecoyMode]);

  return {
    keyHealthSummary,
    showProofOfKeysReminder,
    keyHealthAttentionCount,
    runProofOfKeysCheck,
    patchKeyHealthWallets,
  };
}