import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useT } from '../contexts/LanguageContext';

type QRScanType = 'unknown' | 'address' | 'privateKey' | 'seedPhrase';
type QRScanResult = {
  text: string;
  type: QRScanType;
};
type QRScannerModalProps = {
  onResult: (result: QRScanResult) => void;
  onClose: () => void;
};

const getErrorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error ? error.message : fallback
);

export default function QRScannerModal({ onResult, onClose }: QRScannerModalProps) {
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const readerIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const onResultRef = useRef(onResult);
  const onCloseRef = useRef(onClose);
  const t = useT();
  const cameraDeniedMessage = t('qrScanner.cameraDenied');
  onResultRef.current = onResult;
  onCloseRef.current = onClose;

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState && scannerRef.current.getState() !== 1) {
          scannerRef.current.stop().catch(() => {});
        } else {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {
        // Ignore synchronous errors
      }
      try { scannerRef.current.clear(); } catch {
        // Scanner may already be cleared by the native camera layer.
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let stopped = false;

    const cleanup = () => {
      stopped = true;
      stopScanner();
    };

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(readerIdRef.current);
        scannerRef.current = scanner;
        const cameras = await Html5Qrcode.getCameras();
        const backCamera = cameras.find(camera => /back|rear|environment/i.test(camera.label));
        const cameraConfig = backCamera?.id || cameras[0]?.id || { facingMode: 'environment' };
        const qrboxSize = Math.max(180, Math.min(320, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.7)));

        await scanner.start(
          cameraConfig,
          { fps: 10, qrbox: { width: qrboxSize, height: qrboxSize } },
          (decodedText) => {
            if (stopped) return;
            const text = decodedText.trim();
            let type: QRScanType = 'unknown';
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
          setError(getErrorMessage(err, cameraDeniedMessage));
        }
      }
    };

    startScanner();

    return cleanup;
  }, [cameraDeniedMessage]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return createPortal(
    <div className="app-scaled-icons fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
              <div id={readerIdRef.current} ref={containerRef} className="rounded-xl overflow-hidden mb-3" style={{ minHeight: 'min(70dvw, 320px)' }} />
              <p className="text-surface-400 text-xs text-center">
                {t('qrScanner.hint')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
