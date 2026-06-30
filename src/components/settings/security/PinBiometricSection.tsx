import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Bomb, ChevronDown, EyeOff, KeyRound, Lock, Vibrate } from 'lucide-react';
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
  pinBackoffUntil: number;
  onBackPinStep: () => void;
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
  pinBackoffUntil,
  onBackPinStep,
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
  const [killSwitchDetailsOpen, setKillSwitchDetailsOpen] = useState(false);
  const [decoyDetailsOpen, setDecoyDetailsOpen] = useState(false);
  const [shakeDetailsOpen, setShakeDetailsOpen] = useState(false);
  const pinIconTone = hasBiometric ? 'text-emerald-400' : 'text-amber-400';
  const pinIconBg = hasBiometric ? 'bg-emerald-500/10' : 'bg-amber-500/10';
  const shakeSensorTone = shakeSensorResult?.status === 'healthy'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
    : shakeSensorResult?.status === 'unstable'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
      : 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200';

  const pinSteps: PinStep[] = ['current', 'new', 'confirm'];
  const currentStepIndex = Math.max(0, pinSteps.indexOf(pinStep));
  const pinBackoffSeconds = Math.max(0, Math.ceil((pinBackoffUntil - Date.now()) / 1000));

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
      <div className="p-4 border-b border-surface-200 dark:border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${pinIconBg} flex items-center justify-center`}>
            <Lock size={20} className={pinIconTone} />
          </div>
          <div>
            <h3 className="text-surface-950 dark:text-white font-medium">{t('settings.pinLockTitle')}</h3>
            <p className="text-xs text-surface-700 dark:text-surface-300">{t('settings.pinLockDesc')}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-surface-200 dark:border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowChangePin(!showChangePin); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${showChangePin ? 'bg-sky-500/15 text-sky-500 dark:text-sky-300' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
              <KeyRound size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.changePin')}</p>
              <p className="mt-1 text-xs leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.changePinSummary')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button type="button" onClick={() => { onTap(); setShowChangePin(!showChangePin); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showChangePin ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      {showChangePin && (
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700/30 space-y-3">
          <div className="rounded-xl border border-brand-500/15 bg-brand-500/5 p-3 text-xs leading-relaxed text-brand-800 dark:text-brand-100/90">
            <p className="font-semibold">{t('settings.changePinDetailsTitle')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t('settings.changePinDetailCurrent')}</li>
              <li>{t('settings.changePinDetailLength')}</li>
              <li>{t('settings.changePinDetailConfirm')}</li>
              <li>{t('settings.changePinDetailDataSafe')}</li>
              <li>{t('settings.changePinDetailBackup')}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-900 dark:text-sky-100">
            {t('settings.changePinNoScreenLock')}
          </div>
            <div className="rounded-xl border border-surface-300 bg-white/75 p-3 dark:border-surface-700/60 dark:bg-surface-950/45">
            <div className="mb-2 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-surface-700 dark:text-surface-300">
              <span>{t('settings.pinStepProgress', { default: 'Bước {{current}}/{{total}}', current: String(currentStepIndex + 1), total: '3' })}</span>
              <span>
                {pinStep === 'current'
                  ? t('settings.currentPin')
                  : pinStep === 'new'
                    ? t('settings.newPin')
                    : t('settings.confirmNewPin')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {pinSteps.map((step, index) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-colors ${index <= currentStepIndex ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'}`}
                />
              ))}
            </div>
            {pinBackoffSeconds > 0 && (
              <p className="mt-2 text-xs text-amber-200">
                {t('settings.pinBackoffWait', { default: 'Vui lòng chờ {{seconds}} giây trước khi thử lại.', seconds: String(pinBackoffSeconds) })}
              </p>
            )}
          </div>
          {pinStep === 'current' && (
            <PasswordInput value={pinCurrent} onChange={e => setPinCurrent(e.target.value)}
              placeholder={t('settings.currentPin')} maxLength={6}
              className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
          )}
          {pinStep === 'new' && (
            <PasswordInput value={pinNew} onChange={e => setPinNew(e.target.value)}
              placeholder={t('settings.newPin')} maxLength={6}
              className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
          )}
          {pinStep === 'confirm' && (
            <PasswordInput value={pinConfirmVal} onChange={e => setPinConfirmVal(e.target.value)}
              placeholder={t('settings.confirmNewPin')} maxLength={6}
              className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
          )}
          {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
          <div className="flex gap-2">
            {pinStep !== 'current' && (
              <button
                type="button"
                onClick={onBackPinStep}
                className="btn-glow flex-1 rounded-lg bg-surface-200 py-2 text-xs font-medium text-surface-800 dark:bg-surface-700 dark:text-surface-200"
              >
                {t('common.back', { default: 'Quay lại' })}
              </button>
            )}
            <button
              onClick={handleChangePin}
              disabled={pinBackoffSeconds > 0}
                className="btn-glow flex-1 rounded-lg bg-brand-600 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
            >
              {pinStep === 'current' ? t('settings.verifyBtn') : pinStep === 'new' ? t('settings.nextBtn') : t('settings.save')}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 p-4 hover:bg-surface-100 dark:hover:bg-surface-800/30 transition-colors">
          <button
            type="button"
            onClick={handleToggleKillSwitch}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
             <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${killSwitchEnabled ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-red-500/10 text-red-500 dark:text-red-400'}`}>
               <Bomb size={17} />
             </span>
            <div className="min-w-0">
              <h3 className="text-surface-950 dark:text-white font-medium">{t('settings.killSwitchTitle')}</h3>
              <p className="text-xs text-surface-700 dark:text-surface-300">{t('settings.killSwitchDesc')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => { onTap(); setKillSwitchDetailsOpen(value => !value); }}
              className="p-1 text-surface-700 dark:text-surface-300"
              aria-expanded={killSwitchDetailsOpen}
              aria-label={t('settings.expandDetails')}
            >
              <ChevronDown size={16} className={`transition-transform ${killSwitchDetailsOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleToggleKillSwitch}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${killSwitchEnabled ? 'bg-red-500' : 'bg-surface-200 dark:bg-surface-700'}`}
              aria-label={t('settings.killSwitchTitle')}
              aria-pressed={killSwitchEnabled}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${killSwitchEnabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
        {killSwitchDetailsOpen && (
          <div className="mx-4 mt-2 mb-4 rounded-xl border border-red-500/20 bg-red-50 p-3 text-xs leading-relaxed text-red-900 dark:bg-red-500/10 dark:text-red-100">
            <p className="font-semibold">{t('settings.killSwitchDetailsTitle', { default: 'Tự hủy dữ liệu hoạt động như thế nào?' })}</p>
            <p className="mt-1">{t('settings.killSwitchDetailsDesc', { default: 'Khi bật, xKey sẽ xóa dữ liệu vault cục bộ nếu nhập sai PIN quá số lần cho phép. Chỉ bật khi bạn đã có bản sao lưu an toàn vì dữ liệu bị xóa không thể khôi phục từ thiết bị này.' })}</p>
          </div>
        )}
      </div>

      <div className="border-t border-surface-200 dark:border-surface-800">
          <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={handleToggleDecoy}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
             <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${hasDecoyPin ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-amber-500/10 text-amber-500 dark:text-amber-400'}`}>
               <EyeOff size={17} />
             </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.decoyVaultTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-surface-700 dark:text-surface-300">{hasDecoyPin ? t('settings.decoyVaultSummaryOn') : t('settings.decoyVaultDesc')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(hasDecoyPin ? t('settings.enabled') : t('settings.disabled'), hasDecoyPin)}
            <button
              type="button"
              onClick={() => { onTap(); setDecoyDetailsOpen(value => !value); }}
              className="p-1 text-surface-700 dark:text-surface-300"
              aria-expanded={decoyDetailsOpen}
              aria-label={t('settings.expandDetails')}
            >
              <ChevronDown size={16} className={`transition-transform ${decoyDetailsOpen ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(hasDecoyPin, handleToggleDecoy, t('settings.decoyVaultTitle'), 'bg-amber-500')}
          </div>
        </div>
        {decoyDetailsOpen && (
          <div className="mx-4 mt-2 mb-4 rounded-xl border border-amber-500/20 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">{t('settings.decoyVaultDetailsTitle', { default: 'Chế độ Ngụy trang dùng để làm gì?' })}</p>
            <p className="mt-1">{t('settings.decoyVaultDetailsDesc', { default: 'Bạn có thể tạo một PIN phụ để mở kho giả khi bị ép buộc hoặc cần che giấu dữ liệu thật. PIN ngụy trang phải khác PIN chính và không thay thế cho việc sao lưu vault thật.' })}</p>
          </div>
        )}
        {showDecoyPinInput && !hasDecoyPin && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-surface-50 p-2 dark:bg-surface-900/50">
            <PasswordInput
              value={decoyPinInput}
              onChange={(e) => setDecoyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={t('pinLock.enter6Digits')}
              maxLength={6}
              wrapperClassName="flex-1"
              className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500"
            />
            <button onClick={handleSetDecoyPin} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors dark:text-white">
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between gap-3 p-4 hover:bg-surface-100 dark:hover:bg-surface-800/30 transition-colors">
            <button
              type="button"
              onClick={handleToggleShakeToLock}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${shakeToLockEnabled ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-violet-500/10 text-violet-500 dark:text-violet-400'}`}>
                <Vibrate size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="text-surface-950 dark:text-white font-medium">{t('settings.shakeToLockTitle')}</h3>
                <p className="text-xs text-surface-700 dark:text-surface-300">{t('settings.shakeToLockDesc')}</p>
              </div>
            </button>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { onTap(); setShakeDetailsOpen(value => !value); }}
                className="p-1 text-surface-700 dark:text-surface-300"
                aria-expanded={shakeDetailsOpen}
                aria-label={t('settings.expandDetails')}
              >
                <ChevronDown size={16} className={`transition-transform ${shakeDetailsOpen ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleToggleShakeToLock}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${shakeToLockEnabled ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'}`}
                aria-label={t('settings.shakeToLockTitle')}
                aria-pressed={shakeToLockEnabled}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${shakeToLockEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>
          {shakeDetailsOpen && (
            <div className="mx-4 mt-2 mb-4 rounded-xl border border-brand-500/20 bg-brand-50 p-3 text-xs leading-relaxed text-brand-900 dark:bg-brand-500/10 dark:text-brand-100">
              <p className="font-semibold">{t('settings.shakeToLockDetailsTitle', { default: 'Lắc để Khóa hoạt động như thế nào?' })}</p>
              <p className="mt-1">{t('settings.shakeToLockDetailsDesc', { default: 'Khi bật, ứng dụng theo dõi cảm biến chuyển động và khóa xKey ngay khi phát hiện thao tác lắc mạnh. Bạn có thể chỉnh độ nhạy và kiểm tra cảm biến để tránh khóa nhầm khi di chuyển hằng ngày.' })}</p>
            </div>
          )}
        {shakeToLockEnabled && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-surface-700 dark:text-surface-300 mb-2">
              <span>{t('settings.shakeSensitivity')}</span>
              <span>{shakeSensitivity <= 12 ? t('settings.high') : shakeSensitivity <= 18 ? t('settings.medium') : shakeSensitivity <= 25 ? t('settings.low') : t('settings.veryLow')}</span>
            </div>
            <input
              type="range" min="12" max="32" step="1"
              value={shakeSensitivity} onChange={handleChangeShakeSensitivity}
              className="w-full h-1 rounded-lg bg-surface-200 appearance-none cursor-pointer dark:bg-surface-700"
            />
            <div className="flex justify-between text-[0.625rem] text-surface-700 dark:text-surface-300 mt-1">
              <span>{t('settings.high')}</span>
              <span>{t('settings.veryLow')}</span>
            </div>
            <p className="mt-3 text-[0.7rem] leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.shakeUnlockGraceDesc')}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestShakeSensor}
                disabled={isTestingShakeSensor}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-xs font-semibold text-surface-900 transition-colors hover:border-brand-400/60 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-brand-500/10"
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