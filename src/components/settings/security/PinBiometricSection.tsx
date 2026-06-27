import type { ChangeEvent } from 'react';
import { ChevronDown, Lock, Monitor, RefreshCw, ShieldAlert, ShieldOff } from 'lucide-react';
import PasswordInput from '../../shared/PasswordInput';
import type { PinStep } from '../securityTabUtils';
import type { TFunction } from './types';

type PinBiometricSectionProps = {
  t: TFunction;
  hasBiometric: boolean;
  showChangePin: boolean;
  setShowChangePin: (value: boolean) => void;
  pinStep: PinStep;
  pinCurrent: string;
  setPinCurrent: (value: string) => void;
  pinNew: string;
  setPinNew: (value: string) => void;
  pinConfirmVal: string;
  setPinConfirmVal: (value: string) => void;
  pinError: string;
  handleChangePin: () => void;
  killSwitchEnabled: boolean;
  handleToggleKillSwitch: () => void;
  hasDecoyPin: boolean;
  showDecoyPinInput: boolean;
  decoyPinInput: string;
  setDecoyPinInput: (value: string) => void;
  handleToggleDecoy: () => void;
  handleSetDecoyPin: () => void;
  shakeToLockEnabled: boolean;
  handleToggleShakeToLock: () => void;
  shakeSensitivity: number;
  handleChangeShakeSensitivity: (event: ChangeEvent<HTMLInputElement>) => void;
  onTap: () => void;
};

export function PinBiometricSection({
  t,
  hasBiometric,
  showChangePin,
  setShowChangePin,
  pinStep,
  pinCurrent,
  setPinCurrent,
  pinNew,
  setPinNew,
  pinConfirmVal,
  setPinConfirmVal,
  pinError,
  handleChangePin,
  killSwitchEnabled,
  handleToggleKillSwitch,
  hasDecoyPin,
  showDecoyPinInput,
  decoyPinInput,
  setDecoyPinInput,
  handleToggleDecoy,
  handleSetDecoyPin,
  shakeToLockEnabled,
  handleToggleShakeToLock,
  shakeSensitivity,
  handleChangeShakeSensitivity,
  onTap,
}: PinBiometricSectionProps) {
  const pinIconTone = hasBiometric ? 'text-emerald-400' : 'text-amber-400';
  const pinIconBg = hasBiometric ? 'bg-emerald-500/10' : 'bg-amber-500/10';

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${pinIconBg} flex items-center justify-center`}>
            <Lock size={20} className={pinIconTone} />
          </div>
          <div>
            <h3 className="text-white font-medium">{t('settings.pinLockTitle')}</h3>
            <p className="text-xs text-surface-400">{t('settings.pinLockDesc')}</p>
          </div>
        </div>
      </div>

      <button onClick={() => { onTap(); setShowChangePin(!showChangePin); }}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="text-surface-400" />
          <span className="text-sm font-medium">{t('settings.changePin')}</span>
        </div>
        <ChevronDown size={16} className={`text-surface-500 transition-transform ${showChangePin ? 'rotate-180' : ''}`} />
      </button>
      {showChangePin && (
        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
          {pinStep === 'current' && (
            <PasswordInput value={pinCurrent} onChange={e => setPinCurrent(e.target.value)}
              placeholder={t('settings.currentPin')} maxLength={6}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
          )}
          {pinStep === 'new' && (
            <PasswordInput value={pinNew} onChange={e => setPinNew(e.target.value)}
              placeholder={t('settings.newPin')} maxLength={6}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
          )}
          {pinStep === 'confirm' && (
            <PasswordInput value={pinConfirmVal} onChange={e => setPinConfirmVal(e.target.value)}
              placeholder={t('settings.confirmNewPin')} maxLength={6}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
          )}
          {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
          <button onClick={handleChangePin}
            className="btn-glow w-full bg-brand-600 text-white py-2 rounded-lg text-xs font-medium">
            {pinStep === 'current' ? t('settings.verifyBtn') : pinStep === 'new' ? t('settings.nextBtn') : t('settings.save')}
          </button>
        </div>
      )}

      <button onClick={handleToggleKillSwitch}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <ShieldOff size={16} className={killSwitchEnabled ? 'text-red-400' : 'text-surface-400'} />
          <div>
            <h3 className="text-white font-medium">{t('settings.killSwitchTitle')}</h3>
            <p className="text-xs text-surface-400">{t('settings.killSwitchDesc')}</p>
          </div>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${killSwitchEnabled ? 'bg-red-500' : 'bg-surface-700'}`}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${killSwitchEnabled ? 'translate-x-4' : ''}`} />
        </div>
      </button>

      <div className="border-t border-surface-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={16} className={hasDecoyPin ? 'text-amber-400' : 'text-surface-400'} />
            <div>
              <h3 className="text-white font-medium">{t('settings.decoyVaultTitle')}</h3>
              <p className="text-xs text-surface-400">{t('settings.decoyVaultDesc')}</p>
            </div>
          </div>
          <button onClick={handleToggleDecoy} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${hasDecoyPin ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-surface-700 text-white hover:bg-surface-600'}`}>
            {hasDecoyPin ? t('settings.removeDecoyPin') : t('settings.setDecoyPin')}
          </button>
        </div>
        {showDecoyPinInput && !hasDecoyPin && (
          <div className="flex items-center gap-2 mt-2 bg-surface-900/50 p-2 rounded-lg">
            <PasswordInput
              value={decoyPinInput}
              onChange={(e) => setDecoyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={t('pinLock.enter6Digits')}
              maxLength={6}
              wrapperClassName="flex-1"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <button onClick={handleSetDecoyPin} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors">
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-surface-800">
        <button onClick={handleToggleShakeToLock}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <Monitor size={16} className={shakeToLockEnabled ? 'text-brand-400' : 'text-surface-400'} />
            <div className="text-left">
              <h3 className="text-white font-medium">{t('settings.shakeToLockTitle')}</h3>
              <p className="text-xs text-surface-400">{t('settings.shakeToLockDesc')}</p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${shakeToLockEnabled ? 'bg-brand-500' : 'bg-surface-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${shakeToLockEnabled ? 'translate-x-4' : ''}`} />
          </div>
        </button>
        {shakeToLockEnabled && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
              <span>{t('settings.shakeSensitivity')}</span>
              <span>{shakeSensitivity <= 10 ? t('settings.high') : shakeSensitivity <= 15 ? t('settings.medium') : shakeSensitivity <= 20 ? t('settings.low') : t('settings.veryLow', { default: 'Very low' })}</span>
            </div>
            <input
              type="range" min="10" max="25" step="5"
              value={shakeSensitivity} onChange={handleChangeShakeSensitivity}
              className="w-full h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[0.625rem] text-surface-500 mt-1">
              <span>{t('settings.high')}</span>
              <span>{t('settings.low')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}