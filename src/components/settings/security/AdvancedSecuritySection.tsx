import { Camera, ChevronDown, Cpu, Eye, Keyboard, KeyRound } from 'lucide-react';
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
}: Props) {
  return (
    <>
      {/* Secure Display Rendering */}
      <div className="border-b border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowSecureDisplay(!showSecureDisplay); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <Eye size={16} className="mt-1 flex-shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t('settings.secureDisplayTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-500">{secureDisplay.enabled ? t('settings.secureDisplaySummaryOn') : t('settings.secureDisplaySummaryOff')}</p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(secureDisplay.enabled ? t('settings.enabled') : t('settings.disabled'), secureDisplay.enabled)}
            <button
              type="button"
              onClick={() => { onTap(); setShowSecureDisplay(!showSecureDisplay); }}
              className="p-1 text-surface-500"
              aria-label={t('settings.expandDetails')}
            >
              <ChevronDown size={16} className={`transition-transform ${showSecureDisplay ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                onTap();
                secureDisplay.setEnabled(!secureDisplay.enabled);
                showToast(!secureDisplay.enabled ? t('settings.secureDisplayEnabled') : t('settings.secureDisplayDisabled'), 'success');
              }}
              className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors ${secureDisplay.enabled ? 'bg-emerald-500' : 'bg-surface-700'}`}
              aria-label={t('settings.secureDisplayTitle')}
            >
              <span className={`h-5 w-5 rounded-full bg-white transition-transform ${secureDisplay.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        {showSecureDisplay && (
          <div className="mx-4 mb-4 space-y-2">
            <p className="text-xs leading-relaxed text-surface-400">{t('settings.secureDisplayDesc')}</p>
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs leading-relaxed text-emerald-100/85">
              {t('settings.secureDisplayGuide')}
            </div>
          </div>
        )}
      </div>

      {/* Hardware-bound Vault Key */}
      <div className="border-b border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowHardwareBound(!showHardwareBound); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <Cpu size={16} className={`mt-1 flex-shrink-0 ${securityStatus?.hardwareBoundOnly ? 'text-emerald-400' : 'text-surface-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t('settings.hardwareBoundTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-500">
                {securityStatus?.hardwareBoundOnly ? t('settings.hardwareBoundSummaryOn') : t('settings.hardwareBoundSummaryOff')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(securityStatus?.hardwareBoundOnly ? t('settings.enabled') : t('settings.disabled'), securityStatus?.hardwareBoundOnly)}
            <button type="button" onClick={() => { onTap(); setShowHardwareBound(!showHardwareBound); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showHardwareBound ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleToggleHardwareBound}
              disabled={hardwareBoundBusy}
              className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-50 ${securityStatus?.hardwareBoundOnly ? 'bg-emerald-500' : 'bg-surface-700'}`}
              aria-label={t('settings.hardwareBoundTitle')}
            >
              <span className={`h-5 w-5 rounded-full bg-white transition-transform ${securityStatus?.hardwareBoundOnly ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        {showHardwareBound && (
          <div className="mx-4 mb-4 space-y-3">
            <div className="grid gap-2 rounded-xl border border-surface-700/70 bg-surface-900/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-400">{t('settings.hardwareSecurity')}</span>
                <span className="text-right font-semibold text-surface-100">{hardwareSecurityLabel()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-400">{t('settings.hardwareVaultKey')}</span>
                <span className={`text-right font-semibold ${securityStatus?.hardwareInfo?.vaultKeyStored ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {securityStatus?.hardwareInfo?.vaultKeyInsideSecureHardware
                    ? t('settings.hardwareVaultKeyHardwareBacked')
                    : securityStatus?.hardwareInfo?.vaultKeyStored
                      ? t('settings.hardwareVaultKeySoftwareBacked')
                      : t('settings.unavailable')}
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-surface-400">{t('settings.hardwareBoundDesc')}</p>
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

      {/* Scrambled In-App Keyboard */}
      <div className="border-b border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <Keyboard size={16} className="mt-1 flex-shrink-0 text-cyan-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t('settings.scrambledKeyboardTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-500">
                {scrambledKeyboard.enabled ? t(`settings.scrambledKeyboardMode_${scrambledKeyboard.mode}`) : t('settings.disabled')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(scrambledKeyboard.enabled ? t('settings.enabled') : t('settings.disabled'), scrambledKeyboard.enabled)}
            <button type="button" onClick={() => { onTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showScrambledKeyboard ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                onTap();
                scrambledKeyboard.setEnabled(!scrambledKeyboard.enabled);
                showToast(!scrambledKeyboard.enabled ? t('settings.scrambledKeyboardEnabled') : t('settings.scrambledKeyboardDisabled'), 'success');
              }}
              className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors ${scrambledKeyboard.enabled ? 'bg-cyan-500' : 'bg-surface-700'}`}
              aria-label={t('settings.scrambledKeyboardTitle')}
            >
              <span className={`h-5 w-5 rounded-full bg-white transition-transform ${scrambledKeyboard.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        {showScrambledKeyboard && (
          <div className="mx-4 mb-4 space-y-3">
            <p className="text-xs leading-relaxed text-surface-400">{t('settings.scrambledKeyboardDesc')}</p>
            <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3 text-xs leading-relaxed text-cyan-100/85">
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
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-surface-700 bg-surface-800 text-surface-300'
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

      {/* Screen Capture Blocking */}
      <div className="border-b border-surface-700/30">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => { onTap(); setShowScreenCapture(!showScreenCapture); }}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <Camera size={16} className={`mt-1 flex-shrink-0 ${screenSecurity.blocked ? 'text-amber-400' : 'text-surface-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t('settings.screenCaptureTitle')}</p>
              <p className="mt-1 truncate text-xs text-surface-500">
                {screenSecurity.blocked ? t('settings.screenCaptureSummaryBlocked') : t('settings.screenCaptureSummaryAllowed')}
              </p>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(screenSecurity.blocked ? t('settings.blocked') : t('settings.allowed'), screenSecurity.blocked)}
            <button type="button" onClick={() => { onTap(); setShowScreenCapture(!showScreenCapture); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showScreenCapture ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={requestScreenCaptureToggle}
              className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors ${screenSecurity.blocked ? 'bg-amber-500' : 'bg-surface-700'}`}
              aria-label={t('settings.screenCaptureTitle')}
            >
              <span className={`h-5 w-5 rounded-full bg-white transition-transform ${screenSecurity.blocked ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        {showScreenCapture && (
          <div className="mx-4 mb-4 space-y-3">
            <p className="text-xs leading-relaxed text-surface-400">{t('settings.screenCaptureDesc')}</p>
            <Notice variant="warning">
              {t('settings.screenCaptureGuide')}
            </Notice>
            {screenCaptureTarget !== null && (
              <p className="text-xs leading-relaxed text-amber-200/90">{t('settings.screenCaptureConfirmInPasswordBox')}</p>
            )}
          </div>
        )}
      </div>

      {/* Master Password */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { onTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <KeyRound size={16} className="text-surface-400" />
            <div className="min-w-0">
              <span className="block text-sm text-white">{t('settings.masterPassword')}</span>
              <span className="block truncate text-xs text-surface-500">{mp.hasMasterPassword ? t('settings.masterPasswordSummaryOn') : t('settings.masterPasswordSummaryOff')}</span>
            </div>
          </button>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(mp.hasMasterPassword ? t('settings.mpEnabled') : t('settings.mpDisabled'), mp.hasMasterPassword)}
            <button type="button" onClick={() => { onTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
              <ChevronDown size={16} className={`transition-transform ${showMasterPasswordDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {showMasterPasswordDetails && (
          <div className="space-y-3 rounded-xl border border-surface-700/70 bg-surface-900/60 p-3">
            <div>
              <p className="text-xs font-semibold text-white">{t('settings.revealPasswordSharedTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.revealPasswordSharedDesc')}</p>
            </div>

            {screenCaptureTarget !== null && (
              <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-100">
                  {screenCaptureTarget ? t('settings.screenCaptureConfirmBlock') : t('settings.screenCaptureConfirmAllow')}
                </p>
                <PasswordInput
                  value={screenCapturePassword}
                  onChange={e => setScreenCapturePassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyScreenCaptureChange()}
                  placeholder={t('settings.currentHiddenPassword')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setScreenCaptureTarget(null); setScreenCapturePassword(''); }} className="btn-glow flex-1 rounded-lg bg-surface-700 py-2 text-xs text-surface-300">{t('common.cancel')}</button>
                  <button onClick={verifyScreenCaptureChange} className="btn-glow flex-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white">{t('common.confirm')}</button>
                </div>
              </div>
            )}

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
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowMPRemove(false); setMpRemoveInput(''); }}
                      disabled={mpBusy}
                      className="btn-glow flex-1 bg-surface-700 text-surface-300 py-2 rounded-lg text-xs disabled:opacity-50">{t('common.cancel')}</button>
                    <button onClick={handleRemoveMP}
                      disabled={mpBusy}
                      className="btn-glow btn-glow-danger flex-1 bg-red-500/10 text-red-300 border border-red-500/20 py-2 rounded-lg text-xs font-medium disabled:opacity-50">{t('settings.removeMasterPassword')}</button>
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
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                  </div>
                  <div className="relative">
                    <PasswordInput value={mpConfirm} onChange={e => setMpConfirm(e.target.value)}
                      placeholder={t('settings.reenterPassword')}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowMPSetup(false); setMpInput(''); setMpConfirm(''); }}
                      className="btn-glow flex-1 bg-surface-700 text-surface-300 py-2 rounded-lg text-xs">{t('common.cancel')}</button>
                    <button onClick={handleSetMP}
                      disabled={mpBusy}
                      className="btn-glow btn-glow-success flex-1 bg-brand-600 text-white py-2 rounded-lg text-xs font-medium disabled:opacity-50">{t('common.save')}</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}