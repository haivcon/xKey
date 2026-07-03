import { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, ArrowRight, X, Copy, Check, Lock, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { hapticTap } from '../../utils/haptics';
import { useT } from '../../contexts/LanguageContext';
import PasswordInput from '../shared/PasswordInput';
import type { Wallet } from '../../types';

const CHUNK_SIZE = 250; // Reduced from 500 to 250 to make QR codes much less dense and much faster to scan

/**
 * QR Vault Transfer Modal
 * Send mode: Encrypt vault → split into sequential QR codes
 * Receive mode is handled by QRScannerModal externally
 */
type QRTransferModalProps = {
  wallets: Wallet[];
  onClose: () => void;
};

export default function QRTransferModal({ wallets, onClose }: QRTransferModalProps) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [started, setStarted] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [qrImages, setQrImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const totalChunks = qrImages.length;

  const handleStart = async () => {
    if (password.length < 6) return;
    hapticTap();

    // Encrypt vault data
    const payload = JSON.stringify(wallets.map(w => ({
      name: w.name,
      address: w.address,
      privateKey: w.privateKey,
      seedPhrase: w.seedPhrase,
      network: w.network,
      notes: w.notes,
      sensitiveNotes: w.sensitiveNotes,
      tags: w.tags,
      hdRootId: w.hdRootId,
      derivationPath: w.derivationPath,
      hdAccount: w.hdAccount,
      hdIndex: w.hdIndex,
      hdNetwork: w.hdNetwork,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      balance: w.balance,
    })));

    const encrypted = CryptoJS.AES.encrypt(payload, password).toString();

    // Split into chunks with metadata
    const chunks: string[] = [];
    for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
      chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
    }

    // Generate QR code data chunks
    const images: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const data = JSON.stringify({
        _xkey: 'wallet-transfer',
        version: 2,
        part: i + 1,
        total: chunks.length,
        data: chunks[i],
      });
      images.push(data);
    }

    setQrImages(images);
    setCurrentChunk(0);
    setStarted(true);
  };

  const handleNext = () => {
    hapticTap();
    if (currentChunk < totalChunks - 1) {
      setCurrentChunk(currentChunk + 1);
    }
  };

  const handlePrev = () => {
    hapticTap();
    if (currentChunk > 0) {
      setCurrentChunk(currentChunk - 1);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = (
    <div className="app-scaled-icons fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4 sm:items-center" onClick={onClose}>
      <div
        className="qr-modal-panel max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-3 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-4"
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-brand-400" />
            <h3 className="text-white font-bold">{t('qrTransfer.title')}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-800 rounded-lg transition-colors">
            <X size={18} className="text-surface-400" />
          </button>
        </div>

        {!started ? (
          <div className="space-y-3">
             <p className="text-surface-400 text-sm">
               {t('qrTransfer.desc', { count: wallets.length })}
             </p>
             <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
               <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
               <p>{t('qrTransfer.openNote')}</p>
             </div>
            <div className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-3 text-xs text-surface-300">
              <p className="font-semibold text-brand-100">{t('qrTransfer.stepsTitle')}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>{t('qrTransfer.step1')}</li>
                <li>{t('qrTransfer.step2')}</li>
                <li>{t('qrTransfer.step3')}</li>
              </ol>
            </div>
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              {t('qrTransfer.securityNote')}
            </div>
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-surface-500" />
              <PasswordInput
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder={t('qrTransfer.passwordPlaceholder')}
                wrapperClassName="flex-1"
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
              />
            </div>
            <button onClick={handleStart} disabled={password.length < 6}
              className="btn-glow w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-40">
              {t('qrTransfer.generateBtn')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-400">{t('qrTransfer.progress', { current: currentChunk + 1, total: totalChunks })}</span>
              <button onClick={handleCopyPassword} className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-400 transition-colors">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {t('qrTransfer.passwordBtn')}
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentChunk + 1) / totalChunks) * 100}%` }} />
            </div>

            {/* QR Code */}
             <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setZoomed(true)}
                className="qr-fit-box bg-white p-3 shadow-lg ring-1 ring-white/10 transition-transform active:scale-[0.98]"
                title={t('qr.tapToZoom')}
              >
                <QRCodeSVG value={qrImages[currentChunk]} size={1200} bgColor="#ffffff" fgColor="#000000" className="h-full w-full" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              <button onClick={handlePrev} disabled={currentChunk === 0}
                className="flex-1 bg-surface-800 hover:bg-surface-700 text-white py-2.5 rounded-lg text-sm transition-colors disabled:opacity-30">
                {t('qrTransfer.prevBtn')}
              </button>
              {currentChunk < totalChunks - 1 ? (
                <button onClick={handleNext}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                  {t('qrTransfer.nextBtn')} <ArrowRight size={14} />
                </button>
              ) : (
                <button onClick={onClose}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {t('qrTransfer.doneBtn')}
                </button>
              )}
            </div>

             <div className="rounded-xl border border-surface-700 bg-surface-800/60 p-3 text-scale-xs text-surface-300">
               <p className="font-semibold text-surface-100">{t('qrTransfer.scanGuideTitle')}</p>
               <ol className="mt-2 list-decimal space-y-1 pl-4">
                 <li>{t('qrTransfer.scanStep1')}</li>
                 <li>{t('qrTransfer.scanStep2')}</li>
                 <li>{t('qrTransfer.scanStep3')}</li>
               </ol>
             </div>
             <p className="text-scale-xs text-surface-500 text-center">
               {t('qrTransfer.hint')}
             </p>
          </div>
        )}
      </div>
      {zoomed && qrImages[currentChunk] && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-3" onClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setZoomed(false); }}>
          <button className="absolute right-4 top-4 rounded-full bg-surface-800 p-3 text-white" onClick={() => setZoomed(false)} aria-label={t('common.close')}>
            <X size={20} />
          </button>
          <div className="qr-zoom-box bg-white p-3 shadow-2xl" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <QRCodeSVG value={qrImages[currentChunk]} size={1400} bgColor="#ffffff" fgColor="#000000" className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}
