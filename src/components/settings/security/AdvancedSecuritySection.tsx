import { CameraOff, ChevronDown, Cpu, Eye, Keyboard, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

import type { useMasterPassword } from '../../../contexts/MasterPasswordContext';
import type { useScreenSecurity } from '../../../contexts/ScreenSecurityContext';
import type { useScrambledKeyboard } from '../../../contexts/ScrambledKeyboardContext';
import type { useSecureDisplay } from '../../../contexts/SecureDisplayContext';
import Notice from '../../shared/Notice';
import PasswordInput from '../../shared/PasswordInput';
import type { TFunction } from './types';

type MasterPasswordContext = ReturnType<typeof useMasterPassword>;
type ScrambledKeyboardContext = ReturnType<typeof useScrambledKeyboard>;
type SecureDisplayContext = ReturnType<typeof useSecureDisplay>;
type ScreenSecurityContext = ReturnType<typeof useScreenSecurity>;

type HardwareInfo = {
  vaultKeyStored?: boolean;
  vaultKeyInsideSecureHardware?: boolean;
};

type SecurityStatus = {
  hardwareBoundOnly?: boolean;
  hardwareInfo?: HardwareInfo | null;
} | null;

type Props = {
  t: TFunction;
  securityStatus: SecurityStatus;
  hardwareBoundBusy: boolean;
  showSecureDisplay: boolean;
  setShowSecureDisplay: (show: boolean) => void;
  showHardwareBound: boolean;
  setShowHardwareBound: (show: boolean) => void;
  showScrambledKeyboard: boolean;
  setShowScrambledKeyboard: (show: boolean) => void;
  showScreenCapture: boolean;
  setShowScreenCapture: (show: boolean) => void;
  showMasterPasswordDetails: boolean;
  setShowMasterPasswordDetails: (show: boolean) => void;
  showMPSetup: boolean;
  setShowMPSetup: (show: boolean) => void;
  mpInput: string;
  setMpInput: (value: string) => void;
  mpConfirm: string;
  setMpConfirm: (value: string) => void;
  showMPRemove: boolean;
  setShowMPRemove: (show: boolean) => void;
  mpRemoveInput: string;
  setMpRemoveInput: (value: string) => void;
  mpBusy: boolean;
  screenCapturePassword: string;
  setScreenCapturePassword: (value: string) => void;
  screenCaptureTarget: boolean | null;
  setScreenCaptureTarget: (value: boolean | null) => void;
  secureDisplay: SecureDisplayContext;
  scrambledKeyboard: ScrambledKeyboardContext;
  screenSecurity: ScreenSecurityContext;
  mp: MasterPasswordContext;
  settingStatus: (text: ReactNode, active?: boolean) => ReactNode;
  hardwareSecurityLabel: () => string;
  handleToggleHardwareBound: () => void;
  requestScreenCaptureToggle: () => void;
  verifyScreenCaptureChange: () => void;
  handleSetMP: () => void;
  handleRemoveMP: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onTap: () => void;
  toggleSwitch: (
    active: boolean,
    onClick: () => void,
    ariaLabel: string,
    color?: string,
    disabled?: boolean,
  ) => ReactNode;
};

export function AdvancedSecuritySection({
  t,
  securityStatus,
  hardwareBoundBusy,
  showSecureDisplay,
  setShowSecureDisplay,
  showHardwareBound,
  setShowHardwareBound,
  showScrambledKeyboard,
  setShowScrambledKeyboard,
  showScreenCapture,
  setShowScreenCapture,
  showMasterPasswordDetails,
  setShowMasterPasswordDetails,
  showMPSetup,
  setShowMPSetup,
  mpInput,
  setMpInput,
  mpConfirm,
  setMpConfirm,
  showMPRemove,
  setShowMPRemove,
  mpRemoveInput,
  setMpRemoveInput,
  mpBusy,
  screenCapturePassword,
  setScreenCapturePassword,
  screenCaptureTarget,
  setScreenCaptureTarget,
  secureDisplay,
  scrambledKeyboard,
  screenSecurity,
  mp,
  settingStatus,
  hardwareSecurityLabel,
  handleToggleHardwareBound,
  requestScreenCaptureToggle,
  verifyScreenCaptureChange,
  handleSetMP,
  handleRemoveMP,
  showToast,
  onTap,
  toggleSwitch,
}: Props) {
  const handleToggleMasterPassword = () => {
    onTap();
    setShowMasterPasswordDetails(true);
    if (mp.hasMasterPassword) {
      setShowMPRemove(true);
      setShowMPSetup(false);
    } else {
      setShowMPSetup(true);
      setShowMPRemove(false);
    }
  };

  return (
    <>
      {/* Master Password */}
      <div id="security-setting-master-password" className="border-b border-surface-200 transition-shadow duration-300 dark:border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${mp.hasMasterPassword ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'}`}>
              <LockKeyhole size={17} />
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-surface-950 dark:text-white">{t('settings.masterPassword')}</span>
              <span className="mt-1 block text-xs leading-relaxed text-surface-700 dark:text-surface-300">{mp.hasMasterPassword ? t('settings.masterPasswordSummaryOn') : t('settings.masterPasswordSummaryOff')}</span>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(mp.hasMasterPassword ? t('settings.enabled') : t('settings.disabled'), mp.hasMasterPassword)}
            <button type="button" onClick={() => { onTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showMasterPasswordDetails ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(mp.hasMasterPassword, handleToggleMasterPassword, t('settings.masterPassword'), 'bg-brand-500', mpBusy)}
          </div>
        </div>
        {showMasterPasswordDetails && (
          <div className="mx-4 mb-4 space-y-3 rounded-xl border border-surface-200 bg-white/80 p-3 dark:border-surface-700/70 dark:bg-surface-900/60">
            <div>
              <p className="text-xs font-semibold text-surface-950 dark:text-white">{t('settings.revealPasswordSharedTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.revealPasswordSharedDesc')}</p>
            </div>

            {mp.hasMasterPassword ? (
              !showMPRemove ? (
                <button onClick={() => { onTap(); setShowMPRemove(true); }} className="btn-glow btn-glow-danger text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg">
                  {t('settings.removeMasterPassword')}
                </button>
              ) : (
                <div className="space-y-2">
                  <PasswordInput value={mpRemoveInput} onChange={e => setMpRemoveInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRemoveMP()}
                    placeholder={t('settings.currentHiddenPassword')}
                    className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowMPRemove(false); setMpRemoveInput(''); }}
                      disabled={mpBusy}
                      className="btn-glow flex-1 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-300 py-2 rounded-lg text-xs font-semibold disabled:opacity-50">{t('common.cancel')}</button>
                    <button onClick={handleRemoveMP}
                      disabled={mpBusy}
                      className="btn-glow btn-glow-danger flex-1 bg-red-50 text-red-700 border border-red-500/20 py-2 rounded-lg text-xs font-medium disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300">{t('settings.removeMasterPassword')}</button>
                  </div>
                </div>
              )
            ) : (
              !showMPSetup ? (
                <button onClick={() => { onTap(); setShowMPSetup(true); }}
                  className="btn-glow text-xs text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 px-4 py-2 rounded-lg">
                  {t('settings.setMasterPassword')}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <PasswordInput value={mpInput} onChange={e => setMpInput(e.target.value)}
                      placeholder={t('settings.passwordMin')}
                      className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
                  </div>
                  <div className="relative">
                    <PasswordInput value={mpConfirm} onChange={e => setMpConfirm(e.target.value)}
                      placeholder={t('settings.reenterPassword')}
                      className="w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-950 dark:text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-500 dark:placeholder:text-surface-600" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowMPSetup(false); setMpInput(''); setMpConfirm(''); }}
                      className="btn-glow flex-1 bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-300 py-2 rounded-lg text-xs font-semibold">{t('common.cancel')}</button>
                    <button onClick={handleSetMP}
                      disabled={mpBusy}
                      className="btn-glow btn-glow-success flex-1 bg-brand-600 text-white dark:text-white py-2 rounded-lg text-xs font-medium disabled:opacity-50">{t('common.save')}</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Screen Capture Blocking */}
      <div id="security-setting-screen-capture" className="border-b border-surface-200 transition-shadow duration-300 dark:border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowScreenCapture(!showScreenCapture); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${screenSecurity.blocked ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300' : 'bg-orange-500/10 text-orange-500 dark:text-orange-400'}`}>
              <CameraOff size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.screenCaptureTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-700 dark:text-surface-300">
                {screenSecurity.blocked ? t('settings.screenCaptureSummaryBlocked') : t('settings.screenCaptureSummaryAllowed')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(!screenSecurity.supported ? t('settings.unavailable') : screenSecurity.blocked ? t('settings.blocked') : t('settings.allowed'), screenSecurity.supported && screenSecurity.blocked)}
            <button type="button" onClick={() => { onTap(); setShowScreenCapture(!showScreenCapture); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showScreenCapture ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(
              screenSecurity.blocked,
              requestScreenCaptureToggle,
              t('settings.screenCaptureTitle'),
              'bg-orange-500',
              !screenSecurity.supported,
            )}
          </div>
        </div>
        {showScreenCapture && (
          <div className="mx-4 mb-4 space-y-3">
            <p className="text-xs leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.screenCaptureDesc')}</p>
            <Notice variant={screenSecurity.supported ? 'warning' : 'info'}>
              {screenSecurity.supported ? t('settings.screenCaptureGuide') : t('settings.screenCaptureUnsupported', { default: 'Screen capture protection is only supported on native devices.' })}
            </Notice>
            {screenCaptureTarget !== null && (
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-50 p-3 dark:bg-amber-500/10">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                  {screenCaptureTarget ? t('settings.screenCaptureConfirmBlock') : t('settings.screenCaptureConfirmAllow')}
                </p>
                <p className="text-xs leading-relaxed text-amber-800/80 dark:text-amber-100/75">
                  {t('settings.screenCaptureConfirmInPasswordBox')}
                </p>
                <PasswordInput
                  value={screenCapturePassword}
                  onChange={e => setScreenCapturePassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyScreenCaptureChange()}
                  placeholder={t('settings.currentHiddenPassword')}
                  className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:placeholder:text-surface-600"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setScreenCaptureTarget(null); setScreenCapturePassword(''); }}
                    className="btn-glow flex-1 rounded-lg bg-surface-200 py-2 text-xs font-semibold text-surface-800 dark:bg-surface-700 dark:text-surface-300"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={verifyScreenCaptureChange}
                    className="btn-glow flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-surface-950"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secure Display Rendering */}
      <div className="border-b border-surface-200 dark:border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowSecureDisplay(!showSecureDisplay); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${secureDisplay.enabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'}`}>
              <Eye size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.secureDisplayTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-700 dark:text-surface-300">{secureDisplay.enabled ? t('settings.secureDisplaySummaryOn') : t('settings.secureDisplaySummaryOff')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(secureDisplay.enabled ? t('settings.enabled') : t('settings.disabled'), secureDisplay.enabled)}
            <button
              type="button"
              onClick={() => { onTap(); setShowSecureDisplay(!showSecureDisplay); }}
              className="p-1 text-surface-700 dark:text-surface-300"
              aria-label={t('settings.expandDetails')}
            >
              <ChevronDown size={16} className={`transition-transform ${showSecureDisplay ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(secureDisplay.enabled, () => {
              onTap();
              secureDisplay.setEnabled(!secureDisplay.enabled);
              showToast(!secureDisplay.enabled ? t('settings.secureDisplayEnabled') : t('settings.secureDisplayDisabled'), 'success');
            }, t('settings.secureDisplayTitle'), 'bg-emerald-500')}
          </div>
        </div>
        {showSecureDisplay && (
          <div className="mx-4 mb-4 space-y-2">
            <p className="text-xs leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.secureDisplayDesc')}</p>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-100/85">
              {t('settings.secureDisplayGuide')}
            </div>
          </div>
        )}
      </div>

      {/* Scrambled In-App Keyboard */}
      <div className="border-b border-surface-200 dark:border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${scrambledKeyboard.enabled ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300' : 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400'}`}>
              <Keyboard size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.scrambledKeyboardTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-700 dark:text-surface-300">
                {scrambledKeyboard.enabled ? t(`settings.scrambledKeyboardMode_${scrambledKeyboard.mode}`) : t('settings.disabled')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(scrambledKeyboard.enabled ? t('settings.enabled') : t('settings.disabled'), scrambledKeyboard.enabled)}
            <button type="button" onClick={() => { onTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showScrambledKeyboard ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(scrambledKeyboard.enabled, () => {
              onTap();
              scrambledKeyboard.setEnabled(!scrambledKeyboard.enabled);
              showToast(!scrambledKeyboard.enabled ? t('settings.scrambledKeyboardEnabled') : t('settings.scrambledKeyboardDisabled'), 'success');
            }, t('settings.scrambledKeyboardTitle'), 'bg-cyan-500')}
          </div>
        </div>
        {showScrambledKeyboard && (
          <div className="mx-4 mb-4 space-y-3">
            <p className="text-xs leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.scrambledKeyboardDesc')}</p>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs leading-relaxed text-cyan-800 dark:text-cyan-100/85">
              {t('settings.scrambledKeyboardGuide')}
            </div>
            {scrambledKeyboard.enabled && (
              <div className="grid grid-cols-2 gap-2">
                {['sensitive', 'all'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onTap();
                      scrambledKeyboard.setMode(mode);
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      scrambledKeyboard.mode === mode
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200'
                        : 'border-surface-300 bg-white text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300'
                    }`}
                  >
                    {t(`settings.scrambledKeyboardMode_${mode}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hardware-bound Vault Key */}
      <div id="security-setting-hardware-bound" className="transition-shadow duration-300">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowHardwareBound(!showHardwareBound); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${securityStatus?.hardwareBoundOnly ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300' : 'bg-teal-500/10 text-teal-500 dark:text-teal-400'}`}>
              <Cpu size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.hardwareBoundTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-700 dark:text-surface-300">
                {securityStatus?.hardwareBoundOnly ? t('settings.hardwareBoundSummaryOn') : t('settings.hardwareBoundSummaryOff')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(securityStatus?.hardwareBoundOnly ? t('settings.enabled') : t('settings.disabled'), securityStatus?.hardwareBoundOnly)}
            <button type="button" onClick={() => { onTap(); setShowHardwareBound(!showHardwareBound); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showHardwareBound ? 'rotate-180' : ''}`} />
            </button>
            {toggleSwitch(
              !!securityStatus?.hardwareBoundOnly,
              handleToggleHardwareBound,
              t('settings.hardwareBoundTitle'),
              'bg-teal-500',
              hardwareBoundBusy,
            )}
          </div>
        </div>
        {showHardwareBound && (
          <div className="mx-4 mb-4 space-y-3">
            <div className="grid gap-2 rounded-xl border border-surface-200 bg-white/80 p-3 text-xs dark:border-surface-700/70 dark:bg-surface-900/60">
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-700 dark:text-surface-300">{t('settings.hardwareSecurity')}</span>
                <span className="text-right font-semibold text-surface-900 dark:text-surface-100">{hardwareSecurityLabel()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-700 dark:text-surface-300">{t('settings.hardwareVaultKey')}</span>
                <span className={`text-right font-semibold ${securityStatus?.hardwareInfo?.vaultKeyStored ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {securityStatus?.hardwareInfo?.vaultKeyInsideSecureHardware
                    ? t('settings.hardwareVaultKeyHardwareBacked')
                    : securityStatus?.hardwareInfo?.vaultKeyStored
                      ? t('settings.hardwareVaultKeySoftwareBacked')
                      : t('settings.unavailable')}
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-surface-700 dark:text-surface-300">{t('settings.hardwareBoundDesc')}</p>
            <Notice variant="warning">
              {t('settings.hardwareBoundBackupWarning')}
            </Notice>
            <Notice variant="warning" strong>
              {t('settings.hardwareBoundBackupDeviceNote')}
            </Notice>
            <Notice variant="success">
              {t('settings.hardwareBoundGuide')}
            </Notice>
          </div>
        )}
      </div>
    </>
  );
}