import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ChevronLeft, ChevronRight, Copy, Lock, Printer, QrCode, Search, ShieldCheck, Wallet, X } from 'lucide-react';
import PasswordInput from './PasswordInput';
import { createPortableBackupText } from '../utils/backupUtils';
import { createShamirSharePages } from '../utils/shamir';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import { useT } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const PART_LABELS = ['A', 'B', 'C'];

export default function ShamirBackupModal({ wallets, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState('');
  const [query, setQuery] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pages, setPages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [copied, setCopied] = useState('');
  const [creating, setCreating] = useState(false);
  const printSheetRef = useRef(null);
  const t = useT();
  const { showToast } = useToast();
  const pagesByPart = PART_LABELS.map((_, index) => pages.filter(page => page.part === index + 1));
  const activePartPages = pagesByPart[activeIndex] || [];
  const activePage = activePartPages[activePageIndex] || null;
  const activeQrValue = activePage ? JSON.stringify(activePage) : '';
  const totalQrCount = pages.length;
  const walletList = Array.isArray(wallets) ? wallets : [];
  const selectedWallet = selectedIndex === '' ? null : walletList[Number(selectedIndex)];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWallets = (normalizedQuery
    ? walletList
      .map((wallet, index) => ({ wallet, index }))
      .filter(({ wallet }) => [
        wallet.name,
        wallet.address,
        wallet.network,
        wallet.groupId,
      ].some(value => String(value || '').toLowerCase().includes(normalizedQuery)))
    : walletList.map((wallet, index) => ({ wallet, index }))
  );

  const shortAddress = (address) => {
    if (!address) return t('walletCard.noAddress');
    if (address.length <= 18) return address;
    return `${address.slice(0, 10)}...${address.slice(-6)}`;
  };

  const createShares = async () => {
    if (!selectedWallet) {
      showToast(t('shamir.selectWalletRequired'), 'warning');
      return;
    }
    if (password.length < 6) {
      showToast(t('settings.passwordMinError'), 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }

    setCreating(true);
    try {
      const encryptedBackup = await createPortableBackupText([selectedWallet], { scope: 'single-wallet-shamir' }, password);
      const nextPages = await createShamirSharePages(encryptedBackup, { total: 3, threshold: 2 });
      setPages(nextPages);
      setActiveIndex(0);
      setActivePageIndex(0);
      hapticSuccess();
    } catch (error) {
      console.error('Shamir backup creation failed', error);
      const detail = error?.message ? ` ${error.message}` : '';
      showToast(`${t('shamir.createFailed')}${detail}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyActive = async () => {
    if (!activeQrValue) return;
    await navigator.clipboard.writeText(activeQrValue);
    setCopied(`${PART_LABELS[activeIndex]}-${activePage?.page || 1}`);
    setTimeout(() => setCopied(''), 1800);
  };

  const createPrintableHtml = (cardsMarkup, title = 'xKey Single-Wallet Shamir Backup 2-of-3') => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>xKey Shamir QR Backup</title>
    <style>
      body { margin: 0; padding: 16px; background: #fff; color: #000; font-family: Arial, sans-serif; }
      .shamir-print-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .shamir-print-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #111; border-radius: 8px; padding: 10px; }
      svg { width: 240px; height: 240px; max-width: 100%; }
      @media print { body { padding: 10mm; } }
    </style>
  </head>
  <body>
    <h1 style="font-size:20px;margin:0 0 6px">${title}</h1>
    <p style="font-size:12px;margin:0 0 6px">${selectedWallet?.name || t('walletCard.unnamed')} - ${shortAddress(selectedWallet?.address)}</p>
    <p style="font-size:12px;margin:0 0 12px">${t('shamir.printWarning')}</p>
    <div class="shamir-print-grid">${cardsMarkup}</div>
  </body>
</html>`;

  const sharePrintableHtml = async (printPages, fileLabel, title) => {
    const parts = new Set(printPages.map(page => String(page.part)));
    const cardsMarkup = Array.from(printSheetRef.current?.querySelectorAll('.shamir-print-card') || [])
      .filter(card => parts.has(card.dataset.part))
      .map(card => card.outerHTML)
      .join('');
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const fileResult = await Filesystem.writeFile({
      path: `xkey_shamir_${fileLabel}_${Date.now()}.html`,
      data: createPrintableHtml(cardsMarkup, title),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title,
      text: t('shamir.printShareText'),
      url: fileResult.uri,
      dialogTitle: t('shamir.printShareTitle'),
    });
  };

  const handlePrintAll = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        printSheetRef.current?.removeAttribute('data-print-part');
        window.print();
        return;
      }
      await sharePrintableHtml(pages, 'all', 'xKey Shamir QR Backup');
    } catch (error) {
      console.error('Shamir print failed', error);
      showToast(t('shamir.printFailed'), 'error');
    }
  };

  const handlePrintPart = async () => {
    try {
      const partPages = pagesByPart[activeIndex] || [];
      const partLabel = PART_LABELS[activeIndex];
      if (!Capacitor.isNativePlatform()) {
        printSheetRef.current?.setAttribute('data-print-part', String(activeIndex + 1));
        window.print();
        return;
      }
      await sharePrintableHtml(partPages, `part_${partLabel}`, `xKey Shamir Part ${partLabel}`);
    } catch (error) {
      console.error('Shamir part print failed', error);
      showToast(t('shamir.printFailed'), 'error');
    }
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <ShieldCheck size={18} className="text-emerald-400" />
            {t('shamir.title')}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-surface-400 hover:bg-surface-800">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {pages.length === 0 ? (
            <>
              <p className="text-sm leading-relaxed text-surface-400">{t('shamir.desc')}</p>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                {t('shamir.warning')}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-surface-400">
                  <Wallet size={13} /> {t('shamir.selectWallet')}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-950 px-3 py-2.5">
                  <Search size={15} className="text-surface-500" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('shamir.searchWallet')}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-surface-600"
                  />
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {filteredWallets.length === 0 ? (
                    <div className="rounded-lg border border-surface-700 bg-surface-950 p-3 text-xs text-surface-400">
                      {t('home.noWallets')}
                    </div>
                  ) : filteredWallets.map(({ wallet, index }) => {
                    const active = selectedIndex === String(index);
                    return (
                      <button
                        type="button"
                        key={`${wallet.address || wallet.name || 'wallet'}-${index}`}
                        onClick={() => setSelectedIndex(String(index))}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : 'border-surface-700 bg-surface-950 hover:border-surface-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{wallet.name || t('walletCard.unnamed')}</p>
                          <span className="shrink-0 rounded-full bg-surface-800 px-2 py-0.5 text-[0.625rem] font-semibold text-surface-300">
                            {wallet.network || 'ETH'}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[0.6875rem] text-surface-400">{shortAddress(wallet.address)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-surface-400">
                  <Lock size={13} /> {t('settings.backupPassword')}
                </label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('settings.passwordMin')}
                  className="w-full rounded-lg border border-surface-700 bg-surface-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createShares()}
                  placeholder={t('settings.reenterPassword')}
                  className="w-full rounded-lg border border-surface-700 bg-surface-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={createShares}
                disabled={creating || !selectedWallet}
                className="btn-glow btn-glow-success flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <QrCode size={16} />
                {creating ? t('shamir.creating') : t('shamir.create')}
              </button>
            </>
          ) : (
            <>
              <style>{`
                .shamir-print-sheet { display: none; }
                @media print {
                  body * { visibility: hidden !important; }
                  .shamir-print-sheet, .shamir-print-sheet * { visibility: visible !important; }
                  .shamir-print-sheet {
                    display: block !important;
                    position: absolute;
                    inset: 0 auto auto 0;
                    width: 100%;
                    background: white;
                    color: black;
                    padding: 16px;
                  }
                  .shamir-print-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                  }
                  .shamir-print-card {
                    break-inside: avoid;
                    border: 1px solid #111;
                    border-radius: 8px;
                    padding: 10px;
                    font-family: Arial, sans-serif;
                  }
                  .shamir-print-sheet[data-print-part="1"] .shamir-print-card:not([data-part="1"]),
                  .shamir-print-sheet[data-print-part="2"] .shamir-print-card:not([data-part="2"]),
                  .shamir-print-sheet[data-print-part="3"] .shamir-print-card:not([data-part="3"]) {
                    display: none !important;
                  }
                }
              `}</style>
              <div className="grid grid-cols-3 gap-2">
                {PART_LABELS.map((_, index) => (
                  <button
                    key={PART_LABELS[index]}
                    onClick={() => { hapticTap(); setActiveIndex(index); setActivePageIndex(0); }}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      activeIndex === index
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                        : 'border-surface-700 bg-surface-800 text-surface-300'
                    }`}
                  >
                    {t('shamir.partWithPages', { part: PART_LABELS[index], count: pagesByPart[index]?.length || 0 })}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-surface-700 bg-surface-950/60 p-3 text-center">
                <p className="mb-3 text-xs font-semibold text-surface-400">
                  {t('shamir.printPage', {
                    part: PART_LABELS[activeIndex],
                    page: activePageIndex + 1,
                    total: activePartPages.length,
                    count: totalQrCount
                  })}
                </p>
                <div className="mx-auto flex aspect-square max-w-[320px] items-center justify-center rounded-xl bg-white p-3">
                  <QRCodeSVG value={activeQrValue} size={1000} bgColor="#ffffff" fgColor="#000000" className="h-full w-full" />
                </div>
                <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <button
                    type="button"
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                    className="rounded-lg border border-surface-700 bg-surface-800 p-2 text-surface-200 disabled:opacity-30"
                    aria-label={t('qrTransfer.prevBtn')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${activePartPages.length ? ((activePageIndex + 1) / activePartPages.length) * 100 : 0}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={activePageIndex >= activePartPages.length - 1}
                    onClick={() => setActivePageIndex(prev => Math.min(activePartPages.length - 1, prev + 1))}
                    className="rounded-lg border border-surface-700 bg-surface-800 p-2 text-surface-200 disabled:opacity-30"
                    aria-label={t('qrTransfer.nextBtn')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-3 text-xs leading-relaxed text-surface-300">
                {t('shamir.restoreRule')}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyActive} className="flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800 py-2.5 text-sm font-semibold text-surface-100">
                  {copied === `${PART_LABELS[activeIndex]}-${activePage?.page || 1}` ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  {t('common.copyData')}
                </button>
                <button
                  onClick={handlePrintPart}
                  className="flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800 py-2.5 text-sm font-semibold text-surface-100"
                >
                  <Printer size={15} />
                  {t('shamir.printCurrentPart')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handlePrintAll}
                  className="flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800 py-2.5 text-sm font-semibold text-surface-100"
                >
                  <Printer size={15} />
                  {t('shamir.printAll')}
                </button>
              </div>
              <button onClick={onClose} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                {t('common.close')}
              </button>

              <div ref={printSheetRef} className="shamir-print-sheet">
                <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>xKey Single-Wallet Shamir Backup 2-of-3</h1>
                <p style={{ fontSize: 12, margin: '0 0 6px' }}>
                  {selectedWallet?.name || t('walletCard.unnamed')} - {shortAddress(selectedWallet?.address)}
                </p>
                <p style={{ fontSize: 12, margin: '0 0 12px' }}>{t('shamir.printWarning')}</p>
                <div className="shamir-print-grid">
                  {pages.map((page) => (
                      <div key={`${page.part}-${page.page}`} data-part={String(page.part)} className="shamir-print-card">
                      <h2 style={{ fontSize: 14, margin: '0 0 4px' }}>
                        {t('shamir.printPage', {
                          part: PART_LABELS[page.part - 1],
                          page: page.page,
                          total: page.totalPages,
                          count: totalQrCount
                        })}
                      </h2>
                      <p style={{ fontSize: 10, margin: '0 0 8px' }}>Backup ID: {page.id}</p>
                      <QRCodeSVG value={JSON.stringify(page)} size={240} bgColor="#ffffff" fgColor="#000000" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
