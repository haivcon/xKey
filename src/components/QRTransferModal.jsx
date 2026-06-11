import { useState, useMemo } from 'react';
import { QrCode, ArrowRight, X, Copy, Check, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { useT } from '../contexts/LanguageContext';
import PasswordInput from './PasswordInput';

const CHUNK_SIZE = 250; // Reduced from 500 to 250 to make QR codes much less dense and much faster to scan

/**
 * QR Vault Transfer Modal
 * Send mode: Encrypt vault → split into sequential QR codes
 * Receive mode is handled by QRScannerModal externally
 */
export default function QRTransferModal({ wallets, onClose }) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [started, setStarted] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [qrImages, setQrImages] = useState([]);
  const [copied, setCopied] = useState(false);

  const totalChunks = qrImages.length;

  const handleStart = async () => {
    if (password.length < 6) return;
    hapticTap();

    // Encrypt vault data
    const payload = JSON.stringify(wallets.map(w => ({
      name: w.name, address: w.address, privateKey: w.privateKey,
      seedPhrase: w.seedPhrase, balance: w.balance, notes: w.notes,
      network: w.network, groupId: w.groupId,
    })));

    const encrypted = CryptoJS.AES.encrypt(payload, password).toString();

    // Split into chunks with metadata
    const chunks = [];
    for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
      chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
    }

    // Generate QR code data chunks
    const images = [];
    for (let i = 0; i < chunks.length; i++) {
      const data = JSON.stringify({
        _xkey: 'transfer',
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-brand-400" />
            <h3 className="text-white font-bold">{t('qrTransfer.title')}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-800 rounded-lg transition-colors">
            <X size={18} className="text-surface-400" />
          </button>
        </div>

        {!started ? (
          <div className="space-y-4">
            <p className="text-surface-400 text-sm">
              {t('qrTransfer.desc', { count: wallets.length })}
            </p>
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
          <div className="space-y-4">
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
            <div className="flex justify-center py-2">
              <div className="bg-white rounded-xl p-3 shadow-lg ring-1 ring-white/10">
                <QRCodeSVG value={qrImages[currentChunk]} size={300} />
              </div>
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

            <p className="text-[11px] text-surface-500 text-center">
              {t('qrTransfer.hint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
