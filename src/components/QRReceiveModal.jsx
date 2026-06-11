import { useState, useRef, useEffect } from 'react';
import { X, Camera, Lock, Check, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useT } from '../contexts/LanguageContext';
import CryptoJS from 'crypto-js';

export default function QRReceiveModal({ onClose, onImport }) {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [chunks, setChunks] = useState({});
  const [totalChunks, setTotalChunks] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const t = useT();

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState && scannerRef.current.getState() !== 1) {
          scannerRef.current.stop().catch(() => {});
        } else {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (err) {
        // Ignore synchronous errors like 'Cannot stop, scanner is not running or paused.'
      }
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let scanner = null;
    let stopped = false;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('qr-receive-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (stopped) return;
            try {
              const data = JSON.parse(decodedText);
              if (data._xkey === 'transfer' && data.part && data.total && data.data) {
                setTotalChunks(data.total);
                setChunks(prev => {
                  const newChunks = { ...prev, [data.part]: data.data };
                  if (Object.keys(newChunks).length === data.total) {
                    stopped = true;
                    stopScanner();
                    setScanning(false);
                    setPasswordPrompt(true);
                  }
                  return newChunks;
                });
              }
            } catch (err) {
              // Ignore invalid QR codes
            }
          },
          () => {}
        );
      } catch (err) {
        if (!stopped) {
          setError(err.message || 'Camera access denied');
          setScanning(false);
        }
      }
    };

    if (scanning) {
      startScanner();
    }

    return () => {
      stopped = true;
      stopScanner();
    };
  }, [scanning]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleDecrypt = async () => {
    if (!password) return;
    setDecrypting(true);
    setError('');

    // Small delay to allow UI to show loader
    await new Promise(r => setTimeout(r, 100));

    try {
      // Assemble parts
      const assembled = Array.from({ length: totalChunks }).map((_, i) => chunks[i + 1]).join('');
      
      const bytes = CryptoJS.AES.decrypt(assembled, password);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) throw new Error('Invalid password or corrupted data');

      const payload = JSON.parse(decryptedString);
      if (!Array.isArray(payload)) throw new Error('Invalid payload format');

      // Map to proper wallet format
      const importedWallets = payload.map(w => ({
        name: w.name,
        address: w.address,
        privateKey: w.privateKey,
        seedPhrase: w.seedPhrase,
        balance: w.balance || '0.00',
        notes: w.notes || '',
        network: w.network || 'ETH',
        groupId: w.groupId || 'Imported QR',
        createdAt: Date.now()
      }));

      onImport(importedWallets);
    } catch (err) {
      setError(t('settings.incorrectPassword') || 'Failed to decrypt or parse transfer data');
    } finally {
      setDecrypting(false);
    }
  };

  const scannedCount = Object.keys(chunks).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Camera size={18} className="text-brand-400" />
            {t('qrReceive.title') || 'Scan Transfer QR'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {error && !passwordPrompt ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button onClick={handleClose} className="btn-glow bg-surface-800 text-white px-6 py-2 rounded-lg text-sm">
                {t('common.close')}
              </button>
            </div>
          ) : passwordPrompt ? (
            <div className="space-y-4 py-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock size={28} className="text-brand-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{t('qrReceive.passwordTitle') || 'Transfer Received'}</h3>
                <p className="text-sm text-surface-400">{t('qrReceive.passwordSubtitle') || 'Enter the password used to encrypt this transfer.'}</p>
              </div>

              {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}

              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder={t('settings.backupPassword') || 'Password'}
                className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                onKeyDown={e => e.key === 'Enter' && handleDecrypt()}
              />
              <button
                onClick={handleDecrypt}
                disabled={!password || decrypting}
                className="btn-glow w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {decrypting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {t('common.confirm')}
              </button>
            </div>
          ) : (
            <>
              <div id="qr-receive-reader" ref={containerRef} className="rounded-xl overflow-hidden mb-4" style={{ minHeight: '280px' }} />
              
              {totalChunks ? (
                <div className="bg-surface-800 rounded-xl p-3 text-center">
                  <div className="text-sm font-medium text-white mb-1">
                    {t('qrReceive.progress') 
                      ? t('qrReceive.progress').replace('{current}', scannedCount).replace('{total}', totalChunks)
                      : `Scanned ${scannedCount} of ${totalChunks} parts`}
                  </div>
                  <div className="w-full bg-surface-950 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(scannedCount / totalChunks) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-surface-400 text-xs text-center">
                  {t('qrReceive.hint') || 'Point your camera at a Transfer QR code'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
