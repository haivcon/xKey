import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, Lock, ShieldCheck, Wallet, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import PasswordInput from './PasswordInput';
import Notice from './Notice';
import { assembleShamirShareFromPages, combineShamirShares, parseShamirQr, verifyShamirPage } from '../utils/shamir';
import { parseEncryptedBackupText } from '../utils/backupUtils';
import { useT } from '../contexts/LanguageContext';
import type { Wallet as WalletModel } from '../types';
import type { ShamirShare, ShamirSharePage } from '../utils/shamir';

const PART_LABELS = ['A', 'B', 'C'];

type PagesByPart = Record<number, Record<number, ShamirSharePage>>;

type ShamirRestoreModalProps = {
  aesKey: string;
  onClose: () => void;
  onRestore: (wallets: WalletModel[]) => void | Promise<void>;
};

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : typeof error === 'string' ? error : ''
);

export default function ShamirRestoreModal({ aesKey, onClose, onRestore }: ShamirRestoreModalProps) {
  const [shares, setShares] = useState<Record<number, ShamirShare>>({});
  const [pagesByPart, setPagesByPart] = useState<PagesByPart>({});
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [previewWallets, setPreviewWallets] = useState<WalletModel[] | null>(null);
  const [importing, setImporting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const backupIdRef = useRef('');
  const t = useT();

  const stopScanner = () => {
    if (!scannerRef.current) return;
    try { scannerRef.current.stop().catch(() => {}); } catch {
      // Scanner can already be stopped by the browser camera layer.
    }
    try { scannerRef.current.clear(); } catch {
      // Ignore cleanup races.
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    let stopped = false;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        const cameraId = devices && devices.length > 0 ? devices[devices.length - 1].id : { facingMode: 'environment' };
        const scanner = new Html5Qrcode('shamir-restore-reader', { verbose: false, formatsToSupport: [0] });
        scannerRef.current = scanner;
        await scanner.start(
          cameraId,
          { fps: 12, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (stopped) return;
            (async () => {
            try {
              const parsed = parseShamirQr(decodedText);
              const id = parsed.type === 'share' ? parsed.share.id : parsed.page.id;
              if (backupIdRef.current && backupIdRef.current !== id) {
                setError(t('shamir.mixedBackup'));
                return;
              }
              setError('');
              backupIdRef.current = id;

              if (parsed.type === 'share') {
                const share = parsed.share;
                setShares(prev => {
                  if (prev[share.part]) return prev;
                  if (window.navigator?.vibrate) window.navigator.vibrate(50);
                  return { ...prev, [share.part]: share };
                });
                return;
              }

              const page = await verifyShamirPage(parsed.page);
              setPagesByPart(prev => {
                const existingPart = prev[page.part] || {};
                if (existingPart[page.page]) return prev;
                if (window.navigator?.vibrate) window.navigator.vibrate(50);
                return {
                  ...prev,
                  [page.part]: {
                    ...existingPart,
                    [page.page]: page,
                  }
                };
              });
            } catch {
              setError(t('shamir.invalidQr'));
            }
            })();
          },
          () => {}
        );
      } catch (err) {
        if (!stopped) setError(getErrorMessage(err) || t('qrScanner.cameraDenied'));
      }
    };

    setTimeout(startScanner, 300);
    return () => {
      stopped = true;
      stopScanner();
    };
  }, [t]);

  const completedPagedParts = Object.entries(pagesByPart).filter(([, pages]) => {
    const values = Object.values(pages);
    return values.length > 0 && values.length === values[0].totalPages;
  });
  const scannedShareCount = new Set([...Object.keys(shares), ...completedPagedParts.map(([part]) => part)]).size;
  const ready = scannedShareCount >= 2;
  const previewWallet = previewWallets?.[0] || null;

  const shortAddress = (address?: string) => {
    if (!address) return t('walletCard.noAddress');
    if (address.length <= 18) return address;
    return `${address.slice(0, 10)}...${address.slice(-6)}`;
  };

  const pageStatusForPart = (part: number) => {
    const pages = Object.values(pagesByPart[part] || {});
    if (shares[part]) return t('shamir.fullPartScanned');
    if (pages.length === 0) return t('shamir.noPagesScanned');
    return t('shamir.pagesScanned', { count: pages.length, total: pages[0].totalPages });
  };

  const restore = async () => {
    if (!ready || !password) return;
    setDecrypting(true);
    setError('');
    try {
      const shareList = Object.values(shares);
      for (const [, pages] of completedPagedParts) {
        if (shareList.length >= 2) break;
        const assembled = await assembleShamirShareFromPages(Object.values(pages));
        if (!shareList.some(share => share.part === assembled.part)) {
          shareList.push(assembled);
        }
      }
      const encryptedBackup = combineShamirShares(shareList.slice(0, 2));
      const backup = await parseEncryptedBackupText(encryptedBackup, aesKey, password);
      const wallets = Array.isArray(backup.wallets) ? backup.wallets as WalletModel[] : [];
      if (wallets.length === 0) throw new Error('No wallets in backup');
      stopScanner();
      setPreviewWallets(wallets);
    } catch (err) {
      const message = getErrorMessage(err).toLowerCase();
      setError(message.includes('password') || message.includes('decrypt') ? t('restore.wrongPassword') : t('shamir.corruptedShares'));
    } finally {
      setDecrypting(false);
    }
  };

  const confirmRestore = async () => {
    if (!previewWallets?.length) return;
    setImporting(true);
    setError('');
    try {
      await onRestore(previewWallets);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err) || t('shamir.corruptedShares'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 p-4">
          <h2 className="flex items-center gap-2 font-bold text-white">
            <Camera size={18} className="text-fuchsia-400" />
            {t('shamir.restoreTitle')}
          </h2>
          <button onClick={() => { stopScanner(); onClose(); }} className="rounded-full p-2 text-surface-400 hover:bg-surface-800">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {!previewWallets && (
            <div id="shamir-restore-reader" className="min-h-[280px] overflow-hidden rounded-xl bg-surface-950" />
          )}

          <div className="grid grid-cols-3 gap-2">
            {PART_LABELS.map((label, index) => {
              const part = index + 1;
              const pageValues = Object.values(pagesByPart[part] || {});
              const active = !!shares[part] || (pageValues.length > 0 && pageValues.length === pageValues[0].totalPages);
              return (
                <div key={label} className={`rounded-xl border p-2 text-center text-xs font-bold ${active ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' : 'border-surface-700 bg-surface-800 text-surface-500'}`}>
                  {active ? <Check size={14} className="mx-auto mb-1" /> : <ShieldCheck size={14} className="mx-auto mb-1" />}
                  {t('shamir.part', { part: label })}
                  <span className="mt-1 block text-[10px] font-medium opacity-80">{pageStatusForPart(part)}</span>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-surface-400">
            {t('shamir.scanned', { count: scannedShareCount })}
          </p>

          {previewWallets ? (
            <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                  <Wallet size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white">{t('shamir.confirmRestoreTitle')}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-surface-300">{t('shamir.confirmRestoreDesc')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-surface-700 bg-surface-950/70 p-3">
                <p className="truncate text-sm font-semibold text-white">
                  {t('shamir.confirmRestoreWallet', {
                    name: previewWallet?.name || t('walletCard.unnamed'),
                    address: shortAddress(previewWallet?.address),
                  })}
                </p>
                <p className="mt-1 text-xs text-surface-400">
                  {previewWallet?.network || 'ETH'} · {t('shamir.confirmRestoreCount', { count: previewWallets.length })}
                </p>
              </div>
              <button
                onClick={confirmRestore}
                disabled={importing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t('shamir.confirmImport')}
              </button>
            </div>
          ) : ready && (
            <div className="space-y-3 rounded-xl border border-surface-700 bg-surface-950/60 p-3">
              <Notice variant="warning">{t('settings.hardwareBoundRestoreNote')}</Notice>
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-400">
                <Lock size={13} /> {t('settings.backupPassword')}
              </label>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && restore()}
                placeholder={t('settings.backupPassword')}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white outline-none focus:border-fuchsia-500"
              />
              <button
                onClick={restore}
                disabled={!password || decrypting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
              >
                {decrypting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t('shamir.restore')}
              </button>
            </div>
          )}

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-center text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
