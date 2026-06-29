import type { ChangeEvent, ReactNode } from 'react';
import { ChevronDown, Lock, Monitor, RefreshCw, ShieldAlert, ShieldOff } from 'lucide-react';
import PasswordInput from '../../shared/PasswordInput';
import type { ShakeSensorTestResult } from '../../../hooks/security/useShakeToLock';
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
  isTestingShakeSensor: boolean;
  shakeSensorResult: ShakeSensorTestResult | null;
  handleTestShakeSensor: () => void;
  onTap: () => void;
  settingStatus: (text: ReactNode, active?: boolean) => ReactNode;
  toggleSwitch: (
    active: boolean,
    onClick: () => void,
    ariaLabel: string,
    color?: string,
    disabled?: boolean,
  ) => ReactNode;
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
  isTestingShakeSensor,
  shakeSensorResult,
  handleTestShakeSensor,
  onTap,
  settingStatus,
  toggleSwitch,
}: PinBiometricSectionProps) {
  const pinIconTone = hasBiometric ? 'text-emerald-400' : 'text-amber-400';
  const pinIconBg = hasBiometric ? 'bg-emerald-500/10' : 'bg-amber-500/10';
  const shakeSensorTone = shakeSensorResult?.status === 'healthy'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : shakeSensorResult?.status === 'unstable'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-red-500/30 bg-red-500/10 text-red-200';

  const getShakeSensorResultText = () => {
    if (!shakeSensorResult) return '';
    if (shakeSensorResult.status === 'healthy') return t('settings.shakeSensorHealthy');
    if (shakeSensorResult.status === 'unstable') return t('settings.shakeSensorUnstable');
    if (shakeSensorResult.status === 'stuck') return t('settings.shakeSensorStuck');
    if (shakeSensorResult.status === 'denied') return t('settings.shakeSensorDenied');
    if (shakeSensorResult.status === 'unsupported') return t('settings.shakeSensorUnsupported');
    return t('settings.shakeSensorNoData');
  };

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

      <div className="border-b border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowChangePin(!showChangePin); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <RefreshCw size={16} className={`mt-1 flex-shrink-0 ${showChangePin ? 'text-brand-400' : 'text-surface-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t('settings.changePin')}</p>
              <p className="mt-1 text-xs leading-relaxed text-surface-500">{t('settings.changePinSummary')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button type="button" onClick={() => { onTap(); setShowChangePin(!showChangePin); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showChangePin ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      {showChangePin && (
        <div className="px-4 py-3 border-b border-surface-700/30 space-y-3">
          <div className="rounded-xl border border-brand-500/15 bg-brand-500/5 p-3 text-xs leading-relaxed text-brand-100/85">
            <p className="font-semibold">{t('settings.changePinDetailsTitle')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t('settings.changePinDetailCurrent')}</li>
              <li>{t('settings.changePinDetailLength')}</li>
              <li>{t('settings.changePinDetailConfirm')}</li>
              <li>{t('settings.changePinDetailDataSafe')}</li>
              <li>{t('settings.changePinDetailBackup')}</li>
            </ul>
          </div>
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

      <div className="border-t border-surface-800">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={handleToggleDecoy}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <ShieldAlert size={16} className={`mt-1 flex-shrink-0 ${hasDecoyPin ? 'text-amber-400' : 'text-surface-400'}`} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">{t('settings.decoyVaultTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-surface-500">{hasDecoyPin ? t('settings.decoyVaultSummaryOn') : t('settings.decoyVaultDesc')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(hasDecoyPin ? t('settings.enabled') : t('settings.disabled'), hasDecoyPin)}
            {toggleSwitch(hasDecoyPin, handleToggleDecoy, t('settings.decoyVaultTitle'), 'bg-amber-500')}
          </div>
        </div>
        {showDecoyPinInput && !hasDecoyPin && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-surface-900/50 p-2">
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
              <span>{shakeSensitivity <= 12 ? t('settings.high') : shakeSensitivity <= 18 ? t('settings.medium') : shakeSensitivity <= 25 ? t('settings.low') : t('settings.veryLow')}</span>
            </div>
            <input
              type="range" min="12" max="32" step="1"
              value={shakeSensitivity} onChange={handleChangeShakeSensitivity}
              className="w-full h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[0.625rem] text-surface-500 mt-1">
              <span>{t('settings.high')}</span>
              <span>{t('settings.veryLow')}</span>
            </div>
            <p className="mt-3 text-[0.7rem] leading-relaxed text-surface-500">{t('settings.shakeUnlockGraceDesc')}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestShakeSensor}
                disabled={isTestingShakeSensor}
                className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs font-semibold text-surface-100 transition-colors hover:border-brand-400/60 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTestingShakeSensor ? t('settings.shakeSensorTesting') : t('settings.shakeSensorTest')}
              </button>
              {shakeSensorResult && (
                <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${shakeSensorTone}`}>
                  <p className="font-semibold">{getShakeSensorResultText()}</p>
                  <p className="mt-1 opacity-80">
                    {t('settings.shakeSensorStats', {
                      samples: String(shakeSensorResult.sampleCount),
                      max: shakeSensorResult.maxDelta.toFixed(1),
                      avg: shakeSensorResult.averageDelta.toFixed(1),
                    })}
                  </p>
                  {shakeSensorResult.recommendation === 'lower-sensitivity' && (
                    <p className="mt-1 font-medium">{t('settings.shakeSensorRecommendationLow')}</p>
                  )}
                  {shakeSensorResult.recommendation === 'disable' && (
                    <p className="mt-1 font-medium">{t('settings.shakeSensorRecommendationDisable')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}