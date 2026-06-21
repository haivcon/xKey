import { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

export default function AuthErrorScreen({ error, onRetry, title }) {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);
  const t = useT();

  const handleWipe = async () => {
    setWiping(true);
    const { wipeAllData } = await import('../utils/storage');
    await wipeAllData();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 text-center">
      <div className="max-w-sm w-full">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert size={32} /></div>
        <h2 className="text-xl font-bold text-white mb-2">{title || t('authError.vaultLocked')}</h2>
        <p className="text-surface-400 mb-8">{error}</p>
        <div className="space-y-3">
          <button onClick={onRetry || (() => window.location.reload())} className="w-full bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">{t('authError.retry')}</button>
          {error.includes('Invalid Key') && !confirmWipe && (
            <button onClick={() => setConfirmWipe(true)} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-lg font-medium transition-colors">{t('authError.wipeReset')}</button>
          )}
          {confirmWipe && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3 text-left">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{t('authError.wipeExplain')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmWipe(false)} className="flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg text-sm font-medium transition-colors">{t('common.cancel')}</button>
                <button onClick={handleWipe} disabled={wiping} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {wiping ? t('authError.wiping') : t('authError.confirmWipe')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
