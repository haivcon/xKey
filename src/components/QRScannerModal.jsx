import { useState, useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useT } from '../contexts/LanguageContext';

export default function QRScannerModal({ onResult, onClose }) {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onCloseRef = useRef(onClose);
  const t = useT();
  onResultRef.current = onResult;
  onCloseRef.current = onClose;

  useEffect(() => {
    let scanner = null;
    let stopped = false;

    const cleanup = () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (stopped) return;
            const text = decodedText.trim();
            let type = 'unknown';
            if (/^0x[a-fA-F0-9]{40}$/.test(text)) type = 'address';
            else if (/^0x[a-fA-F0-9]{64}$/.test(text) || /^[a-fA-F0-9]{64}$/.test(text)) type = 'privateKey';
            else if (text.split(/\s+/).length >= 12) type = 'seedPhrase';

            cleanup();
            onResultRef.current({ text, type });
            onCloseRef.current();
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

    startScanner();

    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Camera size={18} className="text-brand-400" />
            {t('qrScanner.title')}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button onClick={handleClose} className="btn-glow bg-surface-800 text-white px-6 py-2 rounded-lg text-sm">
                {t('common.close')}
              </button>
            </div>
          ) : (
            <>
              <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden mb-3" style={{ minHeight: '280px' }} />
              <p className="text-surface-400 text-xs text-center">
                {t('qrScanner.hint')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
