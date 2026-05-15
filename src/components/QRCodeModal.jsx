import { X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useT } from '../contexts/LanguageContext';

export default function QRCodeModal({ data, title, subtitle, isOpen, onClose }) {
    const [copied, setCopied] = useState(false);
    const t = useT();

    if (!isOpen) return null;

    const handleCopy = () => { navigator.clipboard.writeText(data); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-800/50">
                    <div>
                        <h3 className="text-white font-semibold">{title}</h3>
                        {subtitle && <p className="text-xs text-surface-400">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 flex flex-col items-center bg-white">
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={data} size={200} bgColor={"#ffffff"} fgColor={"#000000"} level={"Q"} />
                    </div>
                </div>
                <div className="p-4 bg-surface-900 border-t border-surface-700">
                    <div className="text-xs text-surface-400 font-mono break-all mb-4 text-center px-2">{data}</div>
                    <button onClick={handleCopy}
                        className="w-full py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? t('common.copiedClipboard') : t('common.copyData')}
                    </button>
                </div>
            </div>
        </div>
    );
}
