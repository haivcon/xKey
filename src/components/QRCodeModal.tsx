import { X, Copy, Check, Share2, Download, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState, type MouseEvent } from 'react';
import { useT } from '../contexts/LanguageContext';
import { Capacitor } from '@capacitor/core';
import { hapticSuccess, hapticWarning } from '../utils/haptics';

type QRCodeModalProps = {
    data: string;
    title: string;
    subtitle?: string;
    isOpen: boolean;
    onClose: () => void;
};

const getErrorName = (error: unknown): string => (
    error && typeof error === 'object' && typeof (error as Record<string, unknown>).name === 'string'
        ? (error as Record<string, string>).name
        : ''
);

const getErrorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : ''
);

export default function QRCodeModal({ data, title, subtitle, isOpen, onClose }: QRCodeModalProps) {
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const qrRef = useRef<HTMLButtonElement | null>(null);
    const t = useT();

    if (!isOpen) return null;

    const safeFileName = `${String(title || 'xkey-qr').replace(/[^\w.-]+/g, '_')}_${Date.now()}.svg`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(data);
            setCopied(true);
            hapticSuccess();
            setTimeout(() => setCopied(false), 2000);
        } catch {
            hapticWarning();
        }
    };

    const isSensitive = /private|seed|warning|khóa|khoa|cụm|cum|mnemonic/i.test(`${title || ''} ${subtitle || ''}`)
        || String(data || '').trim().split(/\s+/).length >= 12
        || /^(0x)?[a-fA-F0-9]{64}$/.test(String(data || '').trim());

    const getSvgXml = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return '';
        const cloned = svg.cloneNode(true) as SVGElement;
        cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return new XMLSerializer().serializeToString(cloned);
    };

    const writeNativeSvg = async (xml: string) => {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        return Filesystem.writeFile({
            path: safeFileName,
            data: xml,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });
    };

    const downloadSvg = async () => {
        const xml = getSvgXml();
        if (!xml) {
            hapticWarning();
            return;
        }

        if (Capacitor.isNativePlatform()) {
            try {
                const { Share } = await import('@capacitor/share');
                const fileResult = await writeNativeSvg(xml);
                await Share.share({
                    title: title || 'xKey QR',
                    text: title || 'xKey QR',
                    url: fileResult.uri,
                    dialogTitle: t('qr.saveImage'),
                });
                setSaved(true);
                hapticSuccess();
                setTimeout(() => setSaved(false), 2000);
                return;
            } catch {
                await handleCopy();
                return;
            }
        }

        const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        setSaved(true);
        hapticSuccess();
        setTimeout(() => setSaved(false), 2000);
    };

    const handleShare = async () => {
        const xml = getSvgXml();

        if (Capacitor.isNativePlatform()) {
            try {
                const { Share } = await import('@capacitor/share');
                if (xml) {
                    const fileResult = await writeNativeSvg(xml);
                    await Share.share({
                        title: title || 'xKey QR',
                        text: data,
                        url: fileResult.uri,
                        dialogTitle: t('qr.share'),
                    });
                } else {
                    await Share.share({ title: title || 'xKey QR', text: data, dialogTitle: t('qr.share') });
                }
                hapticSuccess();
                return;
            } catch (error) {
                if (getErrorMessage(error).toLowerCase().includes('cancel')) return;
                await handleCopy();
                return;
            }
        }

        if (navigator.share && xml) {
            try {
                const file = new File([xml], safeFileName, { type: 'image/svg+xml' });
                if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: title || 'xKey QR', text: data, files: [file] });
                    hapticSuccess();
                    return;
                }
            } catch (error) {
                if (getErrorName(error) === 'AbortError') return;
            }
        }

        if (navigator.share) {
            try {
                await navigator.share({ title: title || 'xKey QR', text: data });
                hapticSuccess();
                return;
            } catch (error) {
                if (getErrorName(error) === 'AbortError') return;
            }
        }
        handleCopy();
    };

    return (
        <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 bg-black/60 backdrop-blur-sm sm:p-4">
            <div className="qr-modal-panel flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-800 shadow-2xl animate-in fade-in zoom-in duration-200 sm:max-h-[calc(100dvh-2rem)]">
                <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-800/50">
                    <div>
                        <h3 className="text-white font-semibold">{title}</h3>
                        {subtitle && <p className="text-xs text-surface-400">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="flex min-h-0 justify-center bg-white p-4 sm:p-6">
                    <button
                        type="button"
                        onClick={() => setZoomed(true)}
                        className="qr-fit-box bg-white p-3 shadow-inner border border-gray-100 transition-transform active:scale-[0.98]"
                        title={t('qr.tapToZoom')}
                        ref={qrRef}
                    >
                        <QRCodeSVG value={data} size={1024} bgColor="#ffffff" fgColor="#000000" level="Q" className="h-full w-full" />
                    </button>
                </div>
                <div className="shrink-0 p-4 bg-surface-900 border-t border-surface-700">
                    {isSensitive && (
                        <div className="danger-note mb-3 flex items-start gap-2 rounded-lg border p-2.5 text-left">
                            <ShieldAlert size={16} className="danger-note-icon mt-0.5 flex-shrink-0" />
                            <p className="danger-note-body text-xs leading-relaxed">{t('qr.sensitiveWarning')}</p>
                        </div>
                    )}
                    <div className="text-xs text-surface-400 font-mono break-all mb-4 text-center px-2">{data}</div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleCopy}
                            className="py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            <span className="hidden sm:inline">{copied ? t('common.copiedClipboard') : t('common.copyData')}</span>
                        </button>
                        <button type="button" onClick={handleShare}
                            className="py-3 bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                            <Share2 size={18} />
                            <span className="hidden sm:inline">{t('qr.share')}</span>
                        </button>
                        <button type="button" onClick={downloadSvg}
                            className="py-3 bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                            {saved ? <Check size={18} className="text-emerald-400" /> : <Download size={18} />}
                            <span className="hidden sm:inline">{saved ? t('qr.saved') : t('qr.saveImage')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {zoomed && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-3" onClick={() => setZoomed(false)}>
                    <button className="absolute right-4 top-4 rounded-full bg-surface-800 p-3 text-white" onClick={() => setZoomed(false)} aria-label={t('common.close')}>
                        <X size={20} />
                    </button>
                    <div className="qr-zoom-box bg-white p-3 shadow-2xl" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                        <QRCodeSVG value={data} size={1400} bgColor="#ffffff" fgColor="#000000" level="Q" className="h-full w-full" />
                    </div>
                </div>
            )}
        </div>
    );
}
