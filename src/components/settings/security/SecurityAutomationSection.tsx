import { Clipboard, Timer, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { CLIPBOARD_OPTIONS } from '../../../utils/clipboard';
import { AUTOLOCK_OPTIONS } from '../securityTabUtils';
import type { TFunction } from './types';

type Props = {
  t: TFunction;
  showAutoLock: boolean;
  setShowAutoLock: (show: boolean) => void;
  showClipboard: boolean;
  setShowClipboard: (show: boolean) => void;
  autoLockEnabled: boolean;
  currentAutoLockMs: number;
  currentClipboardMs: number;
  secretCopyDisabled: boolean;
  toggleSecretCopyDisabled: () => void;
  customAutoLock: string;
  setCustomAutoLock: (value: string) => void;
  customClipboard: string;
  setCustomClipboard: (value: string) => void;
  setAutoLockPreference: (enabled: boolean, ms?: number) => void;
  saveAutoLock: (ms: number | string) => void;
  saveCustomAutoLock: () => void;
  saveClipboard: (ms: number | string) => void;
  saveCustomClipboard: () => void;
  formatAutoLock: (ms: number) => string;
  formatClipboardTimeout: (ms: number) => string;
  settingStatus: (text: ReactNode, active?: boolean) => ReactNode;
  onTap: () => void;
  toggleSwitch: (
    active: boolean,
    onClick: () => void,
    ariaLabel: string,
    color?: string,
    disabled?: boolean,
  ) => ReactNode;
};

export function SecurityAutomationSection({
  t,
  showAutoLock,
  setShowAutoLock,
  showClipboard,
  setShowClipboard,
  autoLockEnabled,
  currentAutoLockMs,
  currentClipboardMs,
  secretCopyDisabled,
  toggleSecretCopyDisabled,
  customAutoLock,
  setCustomAutoLock,
  customClipboard,
  setCustomClipboard,
  setAutoLockPreference,
  saveAutoLock,
  saveCustomAutoLock,
  saveClipboard,
  saveCustomClipboard,
  formatAutoLock,
  formatClipboardTimeout,
  settingStatus,
  onTap,
  toggleSwitch,
}: Props) {
  return (
    <>
      <button onClick={() => { onTap(); setShowAutoLock(!showAutoLock); setShowClipboard(false); }}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
        <div className="flex min-w-0 items-center gap-3 text-left">
          <Timer size={16} className="text-surface-400" />
          <div className="min-w-0">
            <span className="block text-sm text-white">{t('settings.autoLock')}</span>
            <span className="block truncate text-xs text-surface-500">
              {autoLockEnabled
                ? t('settings.autoLockSummary', { value: formatAutoLock(currentAutoLockMs) })
                : t('settings.disabled')}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {settingStatus(autoLockEnabled ? formatAutoLock(currentAutoLockMs) : t('settings.disabled'), autoLockEnabled)}
          <ChevronDown size={16} className={`text-surface-500 transition-transform ${showAutoLock ? 'rotate-180' : ''}`} />
          {toggleSwitch(
            autoLockEnabled,
            () => setAutoLockPreference(!autoLockEnabled),
            t('settings.autoLock'),
            'bg-brand-500',
          )}
        </div>
      </button>
      {showAutoLock && (
        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-surface-700/60 bg-surface-900/70 px-3 py-2">
            <span className="text-xs text-surface-400">{t('settings.autoLockCurrent')}</span>
              <span className="text-sm font-semibold text-brand-300">
                {autoLockEnabled ? formatAutoLock(currentAutoLockMs) : t('settings.disabled')}
              </span>
          </div>
          <p className="text-xs leading-relaxed text-surface-400">{t('settings.autoLockDesc')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AUTOLOCK_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => saveAutoLock(opt.value)}
                  className={`btn-glow px-4 py-2 text-xs rounded-lg transition-colors ${autoLockEnabled && currentAutoLockMs === opt.value ? 'bg-brand-500/20 text-brand-200 border border-brand-500/50' : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border border-transparent'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input type="number" value={customAutoLock} onChange={e => setCustomAutoLock(e.target.value)}
              placeholder={t('settings.customMinutes')} min="1" max="1440" inputMode="numeric"
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              className="min-w-0 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
            <button onClick={saveCustomAutoLock}
              className="btn-glow bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">{t('common.save')}</button>
          </div>

          <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-100">{t('settings.contextAutoLockTitle')}</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-100/75">
                  {autoLockEnabled
                    ? t('settings.autoLockSummary', { value: formatAutoLock(currentAutoLockMs) })
                    : t('settings.disabled')}
                </p>
                <p className="mt-2 text-[0.65rem] leading-relaxed text-surface-400">
                  {t('settings.contextAutoLockDesc')}
                </p>
              </div>
              {settingStatus(autoLockEnabled ? t('settings.enabled') : t('settings.disabled'), autoLockEnabled)}
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { onTap(); setShowClipboard(!showClipboard); setShowAutoLock(false); }}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
        <div className="flex min-w-0 items-center gap-3 text-left">
          <Clipboard size={16} className="text-surface-400" />
          <div className="min-w-0">
            <span className="block text-sm text-white">{t('settings.clipboardClear')}</span>
            <span className="block truncate text-xs text-surface-500">{t('settings.clipboardSummary', { value: formatClipboardTimeout(currentClipboardMs) })}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {settingStatus(formatClipboardTimeout(currentClipboardMs), currentClipboardMs > 0)}
          <ChevronDown size={16} className={`text-surface-500 transition-transform ${showClipboard ? 'rotate-180' : ''}`} />
          {toggleSwitch(
            currentClipboardMs > 0,
            () => saveClipboard(currentClipboardMs > 0 ? 0 : 30 * 1000),
            t('settings.clipboardClear'),
            'bg-emerald-500',
          )}
        </div>
      </button>
      {showClipboard && (
        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-surface-700/60 bg-surface-900/70 px-3 py-2">
            <span className="text-xs text-surface-400">{t('settings.clipboardCurrent')}</span>
            <span className="text-sm font-semibold text-brand-300">{formatClipboardTimeout(currentClipboardMs)}</span>
          </div>
          <p className="text-xs leading-relaxed text-surface-400">{t('settings.clipboardDesc')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CLIPBOARD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => saveClipboard(opt.value)}
                className={`btn-glow px-4 py-2 text-xs rounded-lg transition-colors ${currentClipboardMs === opt.value ? 'bg-brand-500/20 text-brand-200 border border-brand-500/50' : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border border-transparent'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input type="number" value={customClipboard} onChange={e => setCustomClipboard(e.target.value)}
              placeholder={t('settings.customSeconds')} min="5" max="86400" inputMode="numeric"
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              className="min-w-0 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
            <button onClick={saveCustomClipboard}
              className="btn-glow bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">{t('common.save')}</button>
          </div>
          <div className={`rounded-xl border px-3 py-2 transition-colors ${secretCopyDisabled ? 'border-red-500/40 bg-red-500/10' : 'border-surface-700/60 bg-surface-900/70 hover:bg-surface-800'}`}>
            <span className="flex items-center justify-between gap-3">
              <button type="button" onClick={toggleSecretCopyDisabled} className="min-w-0 text-left">
                <span className="block text-xs font-semibold text-white">{t('settings.disableSecretCopy')}</span>
                <span className="block text-xs text-surface-400">{t('settings.disableSecretCopyDesc')}</span>
              </button>
              <span className="flex flex-shrink-0 items-center gap-2">
                {settingStatus(secretCopyDisabled ? t('settings.enabled') : t('settings.disabled'), secretCopyDisabled)}
                {toggleSwitch(secretCopyDisabled, toggleSecretCopyDisabled, t('settings.disableSecretCopy'), 'bg-red-500')}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}