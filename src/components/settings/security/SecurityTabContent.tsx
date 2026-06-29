import { useState, useEffect, type ChangeEvent, type ReactNode } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useT } from '../../../contexts/LanguageContext';
import { useMasterPassword } from '../../../contexts/MasterPasswordContext';
import {
  AUTOLOCK_AFTER_REVEAL_KEY,
  AUTOLOCK_BACKGROUND_KEY,
  AUTOLOCK_BLUR_KEY,
  AUTOLOCK_ENABLED_KEY,
  AUTOLOCK_KEY,
  AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY,
  AUTOLOCK_PRESET_KEY,
  AUTOLOCK_SCREEN_OFF_LOCK_KEY,
  AUTOLOCK_SETTINGS_CHANGED_EVENT,
  DEFAULT_MS,
  PRESET_SETTINGS,
  type AutoLockPreset,
} from '../../../hooks/security/useAutoLock';
import {
  requestMotionPermission,
  SHAKE_SETTINGS_CHANGED_EVENT,
  SHAKE_SENSITIVITY_KEY,
  SHAKE_TO_LOCK_KEY,
  testShakeSensor,
  type ShakeSensorTestResult,
} from '../../../hooks/security/useShakeToLock';
import { CLIPBOARD_TIMEOUT_KEY } from '../../../utils/clipboard';
import { SECRET_COPY_DISABLED_KEY } from '../../../utils/dataSensitivity';
import { hapticTap, hapticSuccess } from '../../../utils/haptics';
import { PIN_HASH_KEY, KILL_SWITCH_KEY, DECOY_PIN_HASH_KEY } from '../../auth/PinLockScreen';
import { getVaultSecurityStatus, isBiometricAvailable, setHardwareBoundOnlyMode } from '../../../utils/storage';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled, setDeviceIntegrityGuardEnabled, type DeviceIntegrityRisk } from '../../../utils/deviceIntegrity';
import { useScrambledKeyboard } from '../../../contexts/ScrambledKeyboardContext';
import { useSecureDisplay } from '../../../contexts/SecureDisplayContext';
import { useScreenSecurity } from '../../../contexts/ScreenSecurityContext';
import Notice from '../../shared/Notice';
import PasswordInput from '../../shared/PasswordInput';
import { getErrorMessage, hashPin, isSixDigitPin, parseStoredInt, sanitizePinInput, type PinStep } from '../securityTabUtils';
import { AdvancedSecuritySection } from './AdvancedSecuritySection';
import { SecurityStatusSection } from './SecurityStatusSection';
import { PinBiometricSection } from './PinBiometricSection';
import { SecurityAutomationSection } from './SecurityAutomationSection';
import { isSensitivePinEnabled, removeSensitivePin, setSensitivePin } from '../../../features/security/sensitivePin';
import { LOGO_LOCK_ENABLED_KEY, LOGO_LOCK_SETTINGS_CHANGED_EVENT } from '../../../features/security/logoLock';

export type SecurityTabProps = {
  aesKey: string;
};

type VaultSecurityStatus = Awaited<ReturnType<typeof getVaultSecurityStatus>>;

function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <div className="mb-3 mt-8 px-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-surface-500 first:mt-0">
      {children}
    </div>
  );
}

function SettingsSubGroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-4 border-y border-surface-700/30 bg-surface-950/35 px-4 py-2.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-surface-500 first:mt-0">
      {children}
    </div>
  );
}

export function SecurityTabContent({ aesKey }: SecurityTabProps) {
  // Auto-lock & clipboard
  const [showSecurityStatus, setShowSecurityStatus] = useState(false);
  const [showAutoLock, setShowAutoLock] = useState(false);
  const [showClipboard, setShowClipboard] = useState(false);
  const [showHighSecurityDetails, setShowHighSecurityDetails] = useState(false);
  const [showSecureDisplay, setShowSecureDisplay] = useState(false);
  const [showDeviceIntegrityGuard, setShowDeviceIntegrityGuard] = useState(false);
  const [showHardwareBound, setShowHardwareBound] = useState(false);
  const [showScrambledKeyboard, setShowScrambledKeyboard] = useState(false);
  const [showMasterPasswordDetails, setShowMasterPasswordDetails] = useState(false);
  const [showScreenCapture, setShowScreenCapture] = useState(false);
  const [showSensitivePinDetails, setShowSensitivePinDetails] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [currentAutoLockMs, setCurrentAutoLockMs] = useState(DEFAULT_MS);
  const [contextAutoLockPreset, setContextAutoLockPreset] = useState<AutoLockPreset>('balanced');
  const [contextBackgroundSeconds, setContextBackgroundSeconds] = useState('30');
  const [contextSwitchSeconds, setContextSwitchSeconds] = useState('15');
  const [contextRevealSeconds, setContextRevealSeconds] = useState('30');
  const [contextLockAfterCopy, setContextLockAfterCopy] = useState(false);
  const [contextScreenOffLock, setContextScreenOffLock] = useState(false);
  const [currentClipboardMs, setCurrentClipboardMs] = useState(0);
  const [secretCopyDisabled, setSecretCopyDisabled] = useState(false);
  const [customAutoLock, setCustomAutoLock] = useState('');
  const [customClipboard, setCustomClipboard] = useState('');
  const [screenCapturePassword, setScreenCapturePassword] = useState('');
  const [screenCaptureTarget, setScreenCaptureTarget] = useState<boolean | null>(null);

  // Master Password
  const [showMPSetup, setShowMPSetup] = useState(false);
  const [mpInput, setMpInput] = useState('');
  const [mpConfirm, setMpConfirm] = useState('');
  const [showMPRemove, setShowMPRemove] = useState(false);
  const [mpRemoveInput, setMpRemoveInput] = useState('');
  const [mpBusy, setMpBusy] = useState(false);

  // Change PIN
  const [showChangePin, setShowChangePin] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('current');
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirmVal, setPinConfirmVal] = useState('');
  const [pinError, setPinError] = useState('');

  // Kill Switch & Decoy
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [hasDecoyPin, setHasDecoyPin] = useState(false);
  const [showDecoyPinInput, setShowDecoyPinInput] = useState(false);
  const [decoyPinInput, setDecoyPinInput] = useState('');

  // Shake to Lock
  const [shakeToLockEnabled, setShakeToLockEnabled] = useState(false);
  const [shakeSensitivity, setShakeSensitivity] = useState(18);
  const [isTestingShakeSensor, setIsTestingShakeSensor] = useState(false);
  const [shakeSensorResult, setShakeSensorResult] = useState<ShakeSensorTestResult | null>(null);

  // Biometric
  const [hasBiometric, setHasBiometric] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<VaultSecurityStatus | null>(null);
  const [hardwareBoundBusy, setHardwareBoundBusy] = useState(false);
  const [deviceIntegrityGuard, setDeviceIntegrityGuard] = useState(false);
  const [deviceIntegrityBusy, setDeviceIntegrityBusy] = useState(false);
  const [deviceRiskInfo, setDeviceRiskInfo] = useState<DeviceIntegrityRisk | null>(null);
  const [sensitivePinEnabled, setSensitivePinEnabled] = useState(false);
  const [showSensitivePinSetup, setShowSensitivePinSetup] = useState(false);
  const [sensitivePinInput, setSensitivePinInput] = useState('');
  const [sensitivePinConfirm, setSensitivePinConfirm] = useState('');
  const [sensitivePinBusy, setSensitivePinBusy] = useState(false);
  const [logoLockEnabled, setLogoLockEnabled] = useState(false);

  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();
  const mp = useMasterPassword();
  const scrambledKeyboard = useScrambledKeyboard();
  const secureDisplay = useSecureDisplay();
  const screenSecurity = useScreenSecurity();

  useEffect(() => {
    const loadSettings = async () => {
      const { value: ks } = await Preferences.get({ key: KILL_SWITCH_KEY });
      setKillSwitchEnabled(ks === 'true');
      const bio = await isBiometricAvailable();
      setHasBiometric(bio);
      const [vaultStatus, guardEnabled, riskInfo] = await Promise.all([
        getVaultSecurityStatus(),
        isDeviceIntegrityGuardEnabled(),
        getDeviceIntegrityRisk(),
      ]);
      setSecurityStatus(vaultStatus);
      setDeviceIntegrityGuard(guardEnabled);
      setDeviceRiskInfo(riskInfo);
      const { value: decoyHash } = await Preferences.get({ key: DECOY_PIN_HASH_KEY });
      setHasDecoyPin(!!decoyHash);
      const { value: shakeVal } = await Preferences.get({ key: SHAKE_TO_LOCK_KEY });
      setShakeToLockEnabled(shakeVal === 'true');
      const { value: shakeSens } = await Preferences.get({ key: SHAKE_SENSITIVITY_KEY });
      if (shakeSens) setShakeSensitivity(Number(shakeSens));
      const { value: autoLockEnabledValue } = await Preferences.get({ key: AUTOLOCK_ENABLED_KEY });
      setAutoLockEnabled(autoLockEnabledValue === 'true');
      const { value: autoLockMs } = await Preferences.get({ key: AUTOLOCK_KEY });
      const ms = parseStoredInt(autoLockMs);
      setCurrentAutoLockMs(Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_MS);
      const [
        { value: presetValue },
        { value: backgroundMs },
        { value: blurMs },
        { value: revealMs },
        { value: lockAfterCopy },
        { value: screenOffLock },
      ] = await Promise.all([
        Preferences.get({ key: AUTOLOCK_PRESET_KEY }),
        Preferences.get({ key: AUTOLOCK_BACKGROUND_KEY }),
        Preferences.get({ key: AUTOLOCK_BLUR_KEY }),
        Preferences.get({ key: AUTOLOCK_AFTER_REVEAL_KEY }),
        Preferences.get({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY }),
        Preferences.get({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY }),
      ]);
      const safePreset: AutoLockPreset = presetValue === 'strict' || presetValue === 'paranoid' || presetValue === 'balanced' || presetValue === 'custom'
        ? presetValue
        : 'balanced';
      const presetDefaults = safePreset === 'custom' ? PRESET_SETTINGS.balanced : PRESET_SETTINGS[safePreset];
      setContextAutoLockPreset(safePreset);
      setContextBackgroundSeconds(String(Math.round((parseStoredInt(backgroundMs) || presetDefaults.backgroundMs) / 1000)));
      setContextSwitchSeconds(String(Math.round((parseStoredInt(blurMs) || presetDefaults.blurMs) / 1000)));
      setContextRevealSeconds(String(Math.round((parseStoredInt(revealMs) || presetDefaults.afterRevealMs) / 1000)));
      setContextLockAfterCopy(lockAfterCopy === 'true');
      setContextScreenOffLock(screenOffLock === 'true');
      const { value: clipboardMs } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
      const clipboardTimeout = parseStoredInt(clipboardMs);
      setCurrentClipboardMs(Number.isFinite(clipboardTimeout) && clipboardTimeout >= 0 ? clipboardTimeout : 0);
      const { value: secretCopyOff } = await Preferences.get({ key: SECRET_COPY_DISABLED_KEY });
      setSecretCopyDisabled(secretCopyOff === 'true');
      const { value: logoLockValue } = await Preferences.get({ key: LOGO_LOCK_ENABLED_KEY });
      setLogoLockEnabled(logoLockValue === 'true');
      setSensitivePinEnabled(await isSensitivePinEnabled());
    };
    loadSettings();
  }, []);

  const setAutoLockPreference = async (enabled: boolean, ms = currentAutoLockMs) => {
    hapticTap();
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: enabled ? 'true' : 'false' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(ms > 0 ? ms : DEFAULT_MS) }),
    ]);
    setAutoLockEnabled(enabled);
    setCurrentAutoLockMs(ms > 0 ? ms : DEFAULT_MS);
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(enabled ? t('settings.autoLockSaved') : t('settings.autoLockDisabledToast', { default: 'Đã tắt tự khóa' }), enabled ? 'success' : 'info');
  };

  const saveAutoLock = async (ms: number | string) => {
    const safeMs = Number.parseInt(String(ms), 10);
    if (!Number.isFinite(safeMs) || safeMs < 60000 || safeMs > 24 * 60 * 60 * 1000) {
      showToast(t('settings.autoLockRangeError'), 'warning');
      return;
    }
    const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
    if (!ok) return;
    hapticTap();
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: 'true' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(safeMs) }),
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'balanced' }),
      Preferences.set({ key: AUTOLOCK_BACKGROUND_KEY, value: String(safeMs) }),
      Preferences.set({ key: AUTOLOCK_BLUR_KEY, value: String(safeMs) }),
      Preferences.set({ key: AUTOLOCK_AFTER_REVEAL_KEY, value: String(safeMs) }),
      Preferences.set({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, value: 'false' }),
      Preferences.set({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY, value: 'false' }),
    ]);
    setAutoLockEnabled(true);
    setCurrentAutoLockMs(safeMs);
    setContextAutoLockPreset('balanced');
    setContextBackgroundSeconds(String(Math.round(safeMs / 1000)));
    setContextSwitchSeconds(String(Math.round(safeMs / 1000)));
    setContextRevealSeconds(String(Math.round(safeMs / 1000)));
    setContextLockAfterCopy(false);
    setContextScreenOffLock(false);
    setCustomAutoLock('');
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.autoLockSaved'), 'success');
    setShowAutoLock(false);
  };

  const saveCustomAutoLock = () => {
    const minutes = Number.parseInt(customAutoLock, 10);
    saveAutoLock(minutes * 60000);
  };

  const toggleSecretCopyDisabled = async () => {
    const next = !secretCopyDisabled;
    hapticTap();
    await Preferences.set({ key: SECRET_COPY_DISABLED_KEY, value: next ? 'true' : 'false' });
    setSecretCopyDisabled(next);
    showToast(
      next ? t('settings.secretCopyDisabledToast') : t('settings.secretCopyEnabledToast'),
      'success',
    );
  };

  const formatAutoLock = (ms: number) => {
    if (ms <= 0) return t('settings.immediately');
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes} ${t('settings.autoLockMinutes')}`;
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  };

  const saveClipboard = async (ms: number | string) => {
    const safeMs = Number.parseInt(String(ms), 10);
    if (!Number.isFinite(safeMs) || safeMs < 0 || (safeMs > 0 && safeMs < 5000) || safeMs > 24 * 60 * 60 * 1000) {
      showToast(t('settings.clipboardRangeError'), 'warning');
      return;
    }
    const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
    if (!ok) return;
    hapticTap();
    await Preferences.set({ key: CLIPBOARD_TIMEOUT_KEY, value: String(safeMs) });
    setCurrentClipboardMs(safeMs);
    setCustomClipboard('');
    showToast(t('settings.clipboardSaved'), 'success');
    setShowClipboard(false);
  };

  const saveCustomClipboard = () => {
    const seconds = Number.parseInt(customClipboard, 10);
    saveClipboard(seconds * 1000);
  };

  const formatClipboardTimeout = (ms: number) => {
    if (ms === 0) return t('settings.clipboardNever');
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} ${t('settings.clipboardSeconds')}`;
    const minutes = seconds / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} ${t('settings.clipboardMinutes')}`;
  };

  const settingStatus = (text: ReactNode, active = false) => (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface-800 text-surface-400'}`}>
      {text}
    </span>
  );

  const toggleSwitch = (
    active: boolean,
    onClick: () => void,
    ariaLabel: string,
    color = 'bg-emerald-500',
    disabled = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? color : 'bg-surface-700'}`}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      <span className={`h-5 w-5 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`} />
    </button>
  );

  const refreshSecurityStatus = async () => {
    setSecurityStatus(await getVaultSecurityStatus());
  };

  const hardwareSecurityLabel = () => {
    const info = securityStatus?.hardwareInfo;
    if (!securityStatus?.native) return t('settings.hardwareBoundUnsupported');
    if (info?.vaultKeyStored && info?.vaultKeyInsideSecureHardware) return t('settings.hardwareVaultKeyHardwareBacked');
    if (info?.vaultKeyStored) return t('settings.hardwareVaultKeySoftwareBacked');
    if (info?.strongBoxSupported) return t('settings.hardwareStrongBoxAvailable');
    if (info?.keystoreAvailable) return t('settings.hardwareKeystoreAvailable');
    return t('settings.hardwareBoundUnavailable');
  };

  const handleToggleHardwareBound = async () => {
    const next = !securityStatus?.hardwareBoundOnly;
    hapticTap();
    if (!aesKey) {
      showToast(t('settings.hardwareBoundUnlockRequired'), 'warning');
      return;
    }
    if (!securityStatus?.native || !securityStatus?.deviceCredentialAvailable) {
      showToast(t('settings.hardwareBoundDeviceLockRequired'), 'warning');
      return;
    }
    const confirmed = await showConfirm(
      next
        ? t('settings.hardwareBoundBackupConfirm')
        : t('settings.hardwareBoundDisableConfirm', { default: 'Tắt khóa vault theo phần cứng có thể làm giảm bảo vệ khóa trên thiết bị này. Bạn có chắc chắn muốn tiếp tục?' }),
      {
        danger: true,
        title: t('settings.hardwareBoundConfirmTitle'),
        confirmText: t('common.confirm'),
      },
    );
    if (!confirmed) return;
    setHardwareBoundBusy(true);
    try {
      await setHardwareBoundOnlyMode(next, aesKey);
      await refreshSecurityStatus();
      showToast(next ? t('settings.hardwareBoundEnabled') : t('settings.hardwareBoundDisabled'), next ? 'success' : 'info');
    } catch (err) {
      showToast(getErrorMessage(err) || t('settings.hardwareBoundError'), 'error');
    } finally {
      setHardwareBoundBusy(false);
    }
  };

  const formatDeviceRiskReasons = (risk: DeviceIntegrityRisk | null = deviceRiskInfo) => {
    const reasons = Array.isArray(risk?.reasons) ? risk.reasons : [];
    if (!reasons.length) return t('settings.deviceIntegrityNoRisk');
    return reasons.map((reason: string) => t(`settings.deviceIntegrityReason_${reason}`)).join(', ');
  };

  const handleToggleDeviceIntegrityGuard = async () => {
    if (deviceIntegrityBusy) return;
    const next = !deviceIntegrityGuard;
    hapticTap();
    setDeviceIntegrityBusy(true);
    try {
      const riskInfo = await getDeviceIntegrityRisk();
      setDeviceRiskInfo(riskInfo);
      if (next && riskInfo?.risky) {
        showToast(t('settings.deviceIntegrityCannotEnable', { reasons: formatDeviceRiskReasons(riskInfo) }), 'error');
        return;
      }
      const confirmed = await showConfirm(
        next ? t('settings.deviceIntegrityConfirm') : t('settings.deviceIntegrityDisableConfirm'),
        {
          danger: true,
          title: t('settings.deviceIntegrityConfirmTitle'),
          confirmText: t('common.confirm'),
        },
      );
      if (!confirmed) return;
      await setDeviceIntegrityGuardEnabled(next);
      setDeviceIntegrityGuard(next);
      showToast(next ? t('settings.deviceIntegrityEnabled') : t('settings.deviceIntegrityDisabled'), next ? 'success' : 'info');
    } catch (err) {
      showToast(getErrorMessage(err) || t('settings.deviceIntegrityError'), 'error');
    } finally {
      setDeviceIntegrityBusy(false);
    }
  };

  const verifyScreenCaptureChange = async () => {
    if (screenCaptureTarget === null) return;
    if (!screenCapturePassword) {
      showToast(t('settings.screenCapturePasswordRequired'), 'warning');
      return;
    }
    const verified = await mp.verifyMasterPassword(screenCapturePassword);
    if (!verified) {
      showToast(t('settings.masterPasswordWrong'), 'error');
      return;
    }
    await screenSecurity.setBlocked(screenCaptureTarget);
    setScreenCapturePassword('');
    setScreenCaptureTarget(null);
    showToast(screenCaptureTarget ? t('settings.screenCaptureBlocked') : t('settings.screenCaptureAllowed'), 'success');
  };

  const requestScreenCaptureToggle = () => {
    hapticTap();
    if (!screenSecurity.supported) {
      showToast(t('settings.screenCaptureUnsupported', { default: 'Screen capture protection is only supported on native devices.' }), 'warning');
      return;
    }
    if (!mp.hasMasterPassword) {
      setShowMasterPasswordDetails(true);
      setShowMPSetup(true);
      showToast(t('settings.screenCaptureNeedsPassword'), 'warning');
      return;
    }
    setShowScreenCapture(true);
    setShowMasterPasswordDetails(true);
    setScreenCaptureTarget(!screenSecurity.blocked);
    setScreenCapturePassword('');
  };

  const handleSetMP = async () => {
    if (!mpInput || mpInput.length < 6) { showToast(t('settings.passwordMinError'), 'warning'); return; }
    if (mpInput !== mpConfirm) { showToast(t('settings.passwordMismatch'), 'error'); return; }
    setMpBusy(true);
    try {
      await mp.setMasterPassword(mpInput);
      hapticSuccess();
      showToast(t('settings.masterPasswordSet'), 'success');
      setShowMPSetup(false); setMpInput(''); setMpConfirm('');
    } finally {
      setMpBusy(false);
    }
  };

  const handleRemoveMP = async () => {
    if (!mpRemoveInput) {
      showToast(t('settings.masterPasswordRemoveRequired'), 'warning');
      return;
    }
    setMpBusy(true);
    try {
      const verified = await mp.verifyMasterPassword(mpRemoveInput);
      if (!verified) {
        showToast(t('settings.masterPasswordWrong'), 'error');
        return;
      }
      const ok = await showConfirm(t('settings.removeMPConfirm'), { danger: false });
      if (!ok) return;
      await mp.removeMasterPassword();
      setShowMPRemove(false);
      setMpRemoveInput('');
      showToast(t('settings.masterPasswordRemoved'), 'success');
    } catch (err) {
      showToast(getErrorMessage(err) || t('settings.masterPasswordRemoveError', { default: 'Could not remove master password.' }), 'error');
    } finally {
      setMpBusy(false);
    }
  };

  const handleChangePin = async () => {
    if (pinStep === 'current') {
      const { value: stored } = await Preferences.get({ key: PIN_HASH_KEY });
      if (!stored) {
        setPinStep('new');
        setPinError('');
        setPinCurrent('');
        return;
      }
      if (hashPin(pinCurrent) !== stored) { setPinError(t('settings.incorrectCurrentPin')); return; }
      setPinStep('new'); setPinError('');
    } else if (pinStep === 'new') {
      const nextPin = sanitizePinInput(pinNew);
      if (!isSixDigitPin(nextPin)) { setPinError(t('pinLock.enter6Digits')); return; }
      setPinNew(nextPin);
      setPinStep('confirm'); setPinError('');
    } else if (pinStep === 'confirm') {
      const nextPin = sanitizePinInput(pinNew);
      const confirmPin = sanitizePinInput(pinConfirmVal);
      if (!isSixDigitPin(nextPin) || !isSixDigitPin(confirmPin)) {
        setPinError(t('pinLock.enter6Digits'));
        return;
      }
      if (confirmPin !== nextPin) {
        setPinError(t('settings.pinsNotMatch'));
        setPinStep('new'); setPinNew(''); setPinConfirmVal('');
        return;
      }
      await Preferences.set({ key: PIN_HASH_KEY, value: hashPin(nextPin) });
      hapticSuccess();
      showToast(t('settings.pinChangedSuccess'), 'success');
      setShowChangePin(false);
      setPinCurrent(''); setPinNew(''); setPinConfirmVal(''); setPinStep('current');
    }
  };

  const handleToggleKillSwitch = async () => {
    const newVal = !killSwitchEnabled;
    const confirm = await showConfirm(
      newVal ? t('settings.killSwitchConfirm') : t('settings.killSwitchDisableConfirm'),
      { danger: true },
    );
    if (!confirm) return;
    await Preferences.set({ key: KILL_SWITCH_KEY, value: String(newVal) });
    setKillSwitchEnabled(newVal);
    showToast(newVal ? t('settings.killSwitchEnabled') : t('settings.killSwitchDisabled'), newVal ? 'warning' : 'info');
  };

  const handleToggleDecoy = async () => {
    if (hasDecoyPin) {
      const confirmed = await showConfirm(t('settings.decoyRemoveWarning'), {
        danger: true,
        title: t('settings.decoyRemoveConfirm'),
      });
      if (confirmed) {
        await Preferences.remove({ key: DECOY_PIN_HASH_KEY });
        setHasDecoyPin(false);
        showToast(t('settings.decoyRemoved'), 'info');
      }
    } else {
      setShowDecoyPinInput(!showDecoyPinInput);
    }
  };

  const handleSetDecoyPin = async () => {
    const decoyPin = sanitizePinInput(decoyPinInput);
    if (!isSixDigitPin(decoyPin)) { showToast(t('pinLock.enter6Digits'), 'error'); return; }
    const { value: mainPinHash } = await Preferences.get({ key: PIN_HASH_KEY });
    if (hashPin(decoyPin) === mainPinHash) { showToast(t('settings.decoySameAsMain'), 'error'); return; }
    await Preferences.set({ key: DECOY_PIN_HASH_KEY, value: hashPin(decoyPin) });
    setHasDecoyPin(true); setShowDecoyPinInput(false); setDecoyPinInput('');
    showToast(t('settings.decoyEnabled'), 'success');
  };

  const handleToggleShakeToLock = async () => {
    const newVal = !shakeToLockEnabled;
    if (newVal) {
      const hasPermission = await requestMotionPermission();
      if (!hasPermission) {
        showToast(t('settings.shakePermissionDenied'), 'error');
        return;
      }
    }

    setShakeToLockEnabled(newVal);
    await Preferences.set({ key: SHAKE_TO_LOCK_KEY, value: newVal ? 'true' : 'false' });
    window.dispatchEvent(new Event(SHAKE_SETTINGS_CHANGED_EVENT));
    showToast(newVal ? t('settings.shakeToLockEnabled') : t('settings.shakeToLockDisabled'), newVal ? 'success' : 'info');
  };

  const handleChangeShakeSensitivity = async (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setShakeSensitivity(val);
    await Preferences.set({ key: SHAKE_SENSITIVITY_KEY, value: String(val) });
    window.dispatchEvent(new Event(SHAKE_SETTINGS_CHANGED_EVENT));
  };

  const getShakeSensorMessage = (result: ShakeSensorTestResult) => {
    if (result.status === 'healthy') return t('settings.shakeSensorHealthy');
    if (result.status === 'unstable') return t('settings.shakeSensorUnstable');
    if (result.status === 'stuck') return t('settings.shakeSensorStuck');
    if (result.status === 'denied') return t('settings.shakeSensorDenied');
    if (result.status === 'unsupported') return t('settings.shakeSensorUnsupported');
    return t('settings.shakeSensorNoData');
  };

  const handleTestShakeSensor = async () => {
    if (isTestingShakeSensor) return;
    setIsTestingShakeSensor(true);
    setShakeSensorResult(null);
    showToast(t('settings.shakeSensorTestingHint'), 'info');
    try {
      const result = await testShakeSensor();
      setShakeSensorResult(result);
      const toastType = result.status === 'healthy' ? 'success' : result.status === 'unstable' ? 'warning' : 'error';
      showToast(getShakeSensorMessage(result), toastType);
    } catch {
      const fallback: ShakeSensorTestResult = { status: 'no-data', sampleCount: 0, maxDelta: 0, averageDelta: 0, recommendation: 'disable' };
      setShakeSensorResult(fallback);
      showToast(t('settings.shakeSensorNoData'), 'error');
    } finally {
      setIsTestingShakeSensor(false);
    }
  };

  const enableHighSecuritySession = async () => {
    hapticTap();
    const confirmed = await showConfirm(t('settings.highSecuritySessionConfirmDesc'), {
      danger: true,
      title: t('settings.highSecuritySessionConfirmTitle'),
      confirmText: t('common.confirm'),
    });
    if (!confirmed) return;

    const paranoidPolicy = PRESET_SETTINGS.paranoid;
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: 'true' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(60 * 1000) }),
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'paranoid' }),
      Preferences.set({ key: AUTOLOCK_BACKGROUND_KEY, value: String(paranoidPolicy.backgroundMs) }),
      Preferences.set({ key: AUTOLOCK_BLUR_KEY, value: String(paranoidPolicy.blurMs) }),
      Preferences.set({ key: AUTOLOCK_AFTER_REVEAL_KEY, value: String(paranoidPolicy.afterRevealMs) }),
      Preferences.set({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, value: 'true' }),
      Preferences.set({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY, value: 'true' }),
      Preferences.set({ key: CLIPBOARD_TIMEOUT_KEY, value: String(5 * 1000) }),
      Preferences.set({ key: SECRET_COPY_DISABLED_KEY, value: 'true' }),
    ]);

    setAutoLockEnabled(true);
    setCurrentAutoLockMs(60 * 1000);
    setContextAutoLockPreset('paranoid');
    setContextBackgroundSeconds(String(Math.round(paranoidPolicy.backgroundMs / 1000)));
    setContextSwitchSeconds(String(Math.round(paranoidPolicy.blurMs / 1000)));
    setContextRevealSeconds(String(Math.round(paranoidPolicy.afterRevealMs / 1000)));
    setContextLockAfterCopy(true);
    setContextScreenOffLock(true);
    setCurrentClipboardMs(5 * 1000);
    setSecretCopyDisabled(true);
    secureDisplay.setEnabled(true);
    if (screenSecurity.supported && !screenSecurity.blocked) {
      await screenSecurity.setBlocked(true).catch(() => undefined);
    }

    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.highSecuritySessionEnabledToast'), 'success');
  };

  const saveHighSecurityAutoLockParam = async (key: string, seconds: string, setter: (value: string) => void) => {
    const safeSeconds = Number.parseInt(seconds, 10);
    if (!Number.isFinite(safeSeconds) || safeSeconds < 0 || safeSeconds > 24 * 60 * 60) {
      showToast(t('settings.highSecuritySecondsRangeError'), 'warning');
      return;
    }

    hapticTap();
    await Promise.all([
      Preferences.set({ key, value: String(safeSeconds * 1000) }),
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'custom' }),
    ]);
    setter(String(safeSeconds));
    setContextAutoLockPreset('custom');
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.highSecurityParamSaved'), 'success');
  };

  const saveHighSecurityIdleParam = async (minutes: string) => {
    const safeMinutes = Number.parseInt(minutes, 10);
    if (!Number.isFinite(safeMinutes) || safeMinutes < 1 || safeMinutes > 24 * 60) {
      showToast(t('settings.autoLockRangeError'), 'warning');
      return;
    }

    const safeMs = safeMinutes * 60 * 1000;
    hapticTap();
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_KEY, value: String(safeMs) }),
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'custom' }),
    ]);
    setCurrentAutoLockMs(safeMs);
    setContextAutoLockPreset('custom');
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.highSecurityParamSaved'), 'success');
  };

  const saveHighSecurityClipboardParam = async (seconds: string) => {
    const safeSeconds = Number.parseInt(seconds, 10);
    if (!Number.isFinite(safeSeconds) || safeSeconds < 0 || (safeSeconds > 0 && safeSeconds < 5) || safeSeconds > 24 * 60 * 60) {
      showToast(t('settings.clipboardRangeError'), 'warning');
      return;
    }

    const safeMs = safeSeconds * 1000;
    hapticTap();
    await Preferences.set({ key: CLIPBOARD_TIMEOUT_KEY, value: String(safeMs) });
    setCurrentClipboardMs(safeMs);
    showToast(t('settings.highSecurityParamSaved'), 'success');
  };

  const setHighSecurityBooleanParam = async (
    key: string,
    value: boolean,
    setter: (value: boolean) => void,
    markCustom = true,
  ) => {
    hapticTap();
    await Preferences.set({ key, value: value ? 'true' : 'false' });
    if (markCustom) {
      await Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'custom' });
      setContextAutoLockPreset('custom');
    }
    setter(value);
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.highSecurityParamSaved'), 'success');
  };

  const disableHighSecuritySession = async () => {
    hapticTap();
    const confirmed = await showConfirm(t('settings.highSecuritySessionDisableConfirmDesc', {
      default: 'Tắt phiên bảo mật cao và đưa tự khóa về chế độ thường 5 phút?',
    }), {
      title: t('settings.highSecuritySessionConfirmTitle'),
      confirmText: t('common.confirm'),
    });
    if (!confirmed) return;

    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: 'false' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(DEFAULT_MS) }),
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'balanced' }),
      Preferences.set({ key: AUTOLOCK_BACKGROUND_KEY, value: String(DEFAULT_MS) }),
      Preferences.set({ key: AUTOLOCK_BLUR_KEY, value: String(DEFAULT_MS) }),
      Preferences.set({ key: AUTOLOCK_AFTER_REVEAL_KEY, value: String(DEFAULT_MS) }),
      Preferences.set({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, value: 'false' }),
      Preferences.set({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY, value: 'false' }),
      Preferences.set({ key: CLIPBOARD_TIMEOUT_KEY, value: String(30 * 1000) }),
      Preferences.set({ key: SECRET_COPY_DISABLED_KEY, value: 'false' }),
    ]);

    setAutoLockEnabled(false);
    setCurrentAutoLockMs(DEFAULT_MS);
    setContextAutoLockPreset('balanced');
    setContextBackgroundSeconds(String(Math.round(DEFAULT_MS / 1000)));
    setContextSwitchSeconds(String(Math.round(DEFAULT_MS / 1000)));
    setContextRevealSeconds(String(Math.round(DEFAULT_MS / 1000)));
    setContextLockAfterCopy(false);
    setContextScreenOffLock(false);
    setCurrentClipboardMs(30 * 1000);
    setSecretCopyDisabled(false);
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.highSecuritySessionDisabledToast', { default: 'Đã tắt phiên bảo mật cao' }), 'success');
  };

  const handleToggleLogoLock = async () => {
    const next = !logoLockEnabled;
    hapticTap();
    await Preferences.set({ key: LOGO_LOCK_ENABLED_KEY, value: next ? 'true' : 'false' });
    setLogoLockEnabled(next);
    window.dispatchEvent(new Event(LOGO_LOCK_SETTINGS_CHANGED_EVENT));
    showToast(next ? t('settings.logoLockEnabledToast') : t('settings.logoLockDisabledToast'), 'success');
  };

  const resetSensitivePinSetup = () => {
    setShowSensitivePinSetup(false);
    setSensitivePinInput('');
    setSensitivePinConfirm('');
  };

  const handleToggleSensitivePin = async () => {
    hapticTap();

    if (sensitivePinEnabled) {
      const confirmed = await showConfirm(t('settings.sensitivePinDisableConfirmDesc'), {
        danger: true,
        title: t('settings.sensitivePinDisableConfirmTitle'),
      });
      if (!confirmed) return;

      await removeSensitivePin();
      setSensitivePinEnabled(false);
      resetSensitivePinSetup();
      showToast(t('settings.sensitivePinDisabledToast'), 'info');
      return;
    }

    setShowSensitivePinDetails(true);
    setShowSensitivePinSetup(true);
  };

  const handleSaveSensitivePin = async () => {
    if (sensitivePinBusy) return;

    const pin = sanitizePinInput(sensitivePinInput);
    const confirmPin = sanitizePinInput(sensitivePinConfirm);

    if (!isSixDigitPin(pin) || !isSixDigitPin(confirmPin)) {
      showToast(t('pinLock.enter6Digits'), 'error');
      return;
    }

    if (pin !== confirmPin) {
      showToast(t('settings.sensitivePinMismatch'), 'error');
      return;
    }

    setSensitivePinBusy(true);
    try {
      await setSensitivePin(pin);
      setSensitivePinEnabled(true);
      resetSensitivePinSetup();
      showToast(t('settings.sensitivePinEnabledToast'), 'success');
    } catch (error) {
      showToast(getErrorMessage(error) || t('settings.sensitivePinInvalid'), 'error');
    } finally {
      setSensitivePinBusy(false);
    }
  };

  return (
    <>
      <SettingsGroupLabel>{t('settings.securityOverviewGroup', { default: 'Tổng quan bảo mật' })}</SettingsGroupLabel>

      <SecurityStatusSection
        t={t}
        expanded={showSecurityStatus}
        onToggle={() => { hapticTap(); setShowSecurityStatus(!showSecurityStatus); }}
        securityStatus={securityStatus}
        hardwareSecurityLabel={hardwareSecurityLabel}
      />

      <SettingsGroupLabel>{t('settings.unlockAuthGroup', { default: 'Mở khóa & xác thực' })}</SettingsGroupLabel>

      <PinBiometricSection
        t={t}
        hasBiometric={hasBiometric}
        showChangePin={showChangePin}
        setShowChangePin={setShowChangePin}
        pinStep={pinStep}
        pinCurrent={pinCurrent}
        setPinCurrent={(value) => setPinCurrent(sanitizePinInput(value))}
        pinNew={pinNew}
        setPinNew={(value) => setPinNew(sanitizePinInput(value))}
        pinConfirmVal={pinConfirmVal}
        setPinConfirmVal={(value) => setPinConfirmVal(sanitizePinInput(value))}
        pinError={pinError}
        handleChangePin={handleChangePin}
        killSwitchEnabled={killSwitchEnabled}
        handleToggleKillSwitch={handleToggleKillSwitch}
        hasDecoyPin={hasDecoyPin}
        showDecoyPinInput={showDecoyPinInput}
        decoyPinInput={decoyPinInput}
        setDecoyPinInput={(value) => setDecoyPinInput(sanitizePinInput(value))}
        handleToggleDecoy={handleToggleDecoy}
        handleSetDecoyPin={handleSetDecoyPin}
        shakeToLockEnabled={shakeToLockEnabled}
        handleToggleShakeToLock={handleToggleShakeToLock}
        shakeSensitivity={shakeSensitivity}
        handleChangeShakeSensitivity={handleChangeShakeSensitivity}
        isTestingShakeSensor={isTestingShakeSensor}
        shakeSensorResult={shakeSensorResult}
        handleTestShakeSensor={handleTestShakeSensor}
        onTap={hapticTap}
        settingStatus={settingStatus}
        toggleSwitch={toggleSwitch}
      />

      <SettingsGroupLabel>{t('settings.securityControlsGroup', { default: 'Kiểm soát bảo mật' })}</SettingsGroupLabel>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-surface-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('settings.securityControlsTitle', { default: 'Cài đặt bảo vệ nâng cao' })}</p>
              <p className="text-xs text-surface-400">{t('settings.securityControlsDesc', { default: 'Các lớp khóa, chống lộ dữ liệu và bảo vệ vault được nhóm theo mục đích sử dụng.' })}</p>
            </div>
          </div>
        </div>

        <div>
          <SettingsSubGroupLabel>{t('settings.appLockGroup', { default: 'Khóa ứng dụng' })}</SettingsSubGroupLabel>

          <div className="border-b border-surface-700/30">
            <div className="flex items-start justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => { hapticTap(); setShowHighSecurityDetails(!showHighSecurityDetails); }}
                className="flex min-w-0 flex-1 gap-3 text-left"
              >
                <ShieldAlert size={16} className={`mt-1 flex-shrink-0 ${contextAutoLockPreset === 'paranoid' ? 'text-amber-400' : 'text-surface-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{t('settings.highSecuritySessionTitle')}</p>
                  <p className="mt-1 text-xs text-surface-500">
                    {t('settings.highSecuritySessionDesc')}
                  </p>
                </div>
              </button>
              <div className="flex flex-shrink-0 items-center gap-2">
                {settingStatus(contextAutoLockPreset === 'paranoid' ? t('settings.enabled') : t('settings.disabled'), contextAutoLockPreset === 'paranoid')}
                <button type="button" onClick={() => { hapticTap(); setShowHighSecurityDetails(!showHighSecurityDetails); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
                  <ChevronDown size={16} className={`transition-transform ${showHighSecurityDetails ? 'rotate-180' : ''}`} />
                </button>
                {toggleSwitch(
                  contextAutoLockPreset === 'paranoid',
                  contextAutoLockPreset === 'paranoid' ? disableHighSecuritySession : enableHighSecuritySession,
                  t('settings.highSecuritySessionTitle'),
                  'bg-amber-500',
                )}
              </div>
            </div>
            {showHighSecurityDetails && (
              <div className="mx-4 mb-4 space-y-3">
                <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-surface-900/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-100">{t('settings.highSecuritySessionDetailsIntro')}</p>
                      <p className="mt-1 text-[0.7rem] leading-relaxed text-amber-100/70">{t('settings.highSecurityCustomizeNote')}</p>
                    </div>
                    {settingStatus(contextAutoLockPreset === 'paranoid' ? t('settings.enabled') : t('settings.custom'), contextAutoLockPreset === 'paranoid')}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      [t('settings.highSecurityDetailNoCopyTitle'), secretCopyDisabled ? t('settings.enabled') : t('settings.disabled')],
                      [t('settings.highSecurityDetailIdleTitle'), formatAutoLock(currentAutoLockMs)],
                      [t('settings.highSecurityDetailBackgroundTitle'), `${contextBackgroundSeconds} s`],
                      [t('settings.highSecurityDetailBlurTitle'), `${contextSwitchSeconds} s`],
                      [t('settings.highSecurityDetailRevealTitle'), `${contextRevealSeconds} s`],
                      [t('settings.highSecurityDetailCopyLockTitle'), contextLockAfterCopy ? t('settings.enabled') : t('settings.disabled')],
                      [t('settings.highSecurityDetailScreenOffTitle'), contextScreenOffLock ? t('settings.enabled') : t('settings.disabled')],
                      [t('settings.highSecurityDetailClipboardTitle'), formatClipboardTimeout(currentClipboardMs)],
                      [t('settings.highSecurityDetailSecureDisplayTitle'), secureDisplay.enabled ? t('settings.enabled') : t('settings.disabled')],
                      [t('settings.highSecurityDetailScreenCaptureTitle'), screenSecurity.blocked ? t('settings.blocked') : t('settings.allowed')],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-surface-700/45 bg-surface-950/45 px-3 py-2">
                        <p className="truncate text-[0.65rem] text-surface-500">{label}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-surface-100">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-surface-700/60 bg-surface-900/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">{t('settings.highSecurityCustomizeButton')}</p>
                      <p className="mt-1 text-[0.65rem] leading-relaxed text-surface-400">{t('settings.highSecurityManualWarning')}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-surface-700/60 bg-surface-950/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-white">{t('settings.highSecurityParamIdleTitle')}</p>
                        {settingStatus(formatAutoLock(currentAutoLockMs), true)}
                      </div>
                      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          inputMode="numeric"
                          value={Math.round(currentAutoLockMs / 60000)}
                          onChange={e => setCurrentAutoLockMs(Math.max(1, Number.parseInt(e.target.value || '1', 10)) * 60000)}
                          className="min-w-0 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                        />
                        <button type="button" onClick={() => saveHighSecurityIdleParam(String(Math.round(currentAutoLockMs / 60000)))} className="btn-glow rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-surface-950">
                          {t('common.save')}
                        </button>
                      </div>
                    </div>

                    {[
                      {
                        title: t('settings.highSecurityParamBackgroundTitle'),
                        desc: t('settings.highSecurityParamBackgroundDesc'),
                        value: contextBackgroundSeconds,
                        setValue: setContextBackgroundSeconds,
                        save: () => saveHighSecurityAutoLockParam(AUTOLOCK_BACKGROUND_KEY, contextBackgroundSeconds, setContextBackgroundSeconds),
                      },
                      {
                        title: t('settings.highSecurityParamBlurTitle'),
                        desc: t('settings.highSecurityParamBlurDesc'),
                        value: contextSwitchSeconds,
                        setValue: setContextSwitchSeconds,
                        save: () => saveHighSecurityAutoLockParam(AUTOLOCK_BLUR_KEY, contextSwitchSeconds, setContextSwitchSeconds),
                      },
                      {
                        title: t('settings.highSecurityParamRevealTitle'),
                        desc: t('settings.highSecurityParamRevealDesc'),
                        value: contextRevealSeconds,
                        setValue: setContextRevealSeconds,
                        save: () => saveHighSecurityAutoLockParam(AUTOLOCK_AFTER_REVEAL_KEY, contextRevealSeconds, setContextRevealSeconds),
                      },
                    ].map(item => (
                      <div key={item.title} className="rounded-lg border border-surface-700/60 bg-surface-950/40 p-3">
                        <p className="text-xs font-semibold text-white">{item.title}</p>
                        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                          <input
                            type="number"
                            min="0"
                            max="86400"
                            inputMode="numeric"
                            value={item.value}
                            onChange={e => item.setValue(e.target.value)}
                            className="min-w-0 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                          />
                          <button type="button" onClick={item.save} className="btn-glow rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-surface-950">
                            {t('common.save')}
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-lg border border-surface-700/60 bg-surface-950/40 p-3">
                      <p className="text-xs font-semibold text-white">{t('settings.highSecurityParamClipboardTitle')}</p>
                      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="number"
                          min="0"
                          max="86400"
                          inputMode="numeric"
                          value={Math.round(currentClipboardMs / 1000)}
                          onChange={e => setCurrentClipboardMs(Math.max(0, Number.parseInt(e.target.value || '0', 10)) * 1000)}
                          className="min-w-0 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                        />
                        <button type="button" onClick={() => saveHighSecurityClipboardParam(String(Math.round(currentClipboardMs / 1000)))} className="btn-glow rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-surface-950">
                          {t('common.save')}
                        </button>
                      </div>
                    </div>

                    {[
                      {
                        title: t('settings.highSecurityParamCopyLockTitle'),
                        desc: t('settings.highSecurityParamCopyLockDesc'),
                        active: contextLockAfterCopy,
                        toggle: () => setHighSecurityBooleanParam(AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, !contextLockAfterCopy, setContextLockAfterCopy),
                      },
                      {
                        title: t('settings.highSecurityParamScreenOffTitle'),
                        desc: t('settings.highSecurityParamScreenOffDesc'),
                        active: contextScreenOffLock,
                        toggle: () => setHighSecurityBooleanParam(AUTOLOCK_SCREEN_OFF_LOCK_KEY, !contextScreenOffLock, setContextScreenOffLock),
                      },
                      {
                        title: t('settings.highSecurityParamNoCopyTitle'),
                        desc: t('settings.highSecurityParamNoCopyDesc'),
                        active: secretCopyDisabled,
                        toggle: () => setHighSecurityBooleanParam(SECRET_COPY_DISABLED_KEY, !secretCopyDisabled, setSecretCopyDisabled, false),
                      },
                      {
                        title: t('settings.highSecurityParamSecureDisplayTitle'),
                        desc: t('settings.highSecurityParamSecureDisplayDesc'),
                        active: secureDisplay.enabled,
                        toggle: () => { hapticTap(); secureDisplay.setEnabled(!secureDisplay.enabled); showToast(t('settings.highSecurityParamSaved'), 'success'); },
                      },
                    ].map(item => (
                      <div key={item.title} className="flex items-start justify-between gap-3 rounded-lg border border-surface-700/60 bg-surface-950/40 p-3">
                        <div>
                          <p className="text-xs font-semibold text-white">{item.title}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {settingStatus(item.active ? t('settings.enabled') : t('settings.disabled'), item.active)}
                          {toggleSwitch(item.active, item.toggle, item.title, 'bg-amber-500')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logo Lock */}
          <div className="border-b border-surface-700/30">
            <div className="flex items-start justify-between gap-3 p-4">
            <button
              type="button"
              onClick={handleToggleLogoLock}
              className="flex min-w-0 flex-1 gap-3 text-left"
            >
              <ShieldAlert size={16} className={`mt-1 flex-shrink-0 ${logoLockEnabled ? 'text-rose-400' : 'text-surface-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t('settings.logoLockTitle')}</p>
                <p className="mt-1 text-xs text-surface-500">
                  {logoLockEnabled ? t('settings.logoLockSummaryOn') : t('settings.logoLockSummaryOff')}
                </p>
              </div>
            </button>
              <div className="flex flex-shrink-0 items-center gap-2">
                {settingStatus(logoLockEnabled ? t('settings.enabled') : t('settings.disabled'), logoLockEnabled)}
                {toggleSwitch(logoLockEnabled, handleToggleLogoLock, t('settings.logoLockTitle'), 'bg-rose-500')}
              </div>
            </div>
          </div>

          {/* Root/Data Tamper Guard */}
          <div className="border-b border-surface-700/30">
            <div className="flex items-start justify-between gap-3 p-4">
            <button
              type="button"
              onClick={() => { hapticTap(); setShowDeviceIntegrityGuard(!showDeviceIntegrityGuard); }}
              className="flex min-w-0 flex-1 gap-3 text-left"
            >
              <ShieldAlert size={16} className={`mt-1 flex-shrink-0 ${deviceIntegrityGuard ? 'text-red-400' : 'text-surface-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t('settings.deviceIntegrityTitle')}</p>
                <p className="mt-1 truncate text-xs text-surface-500">
                  {deviceIntegrityGuard ? t('settings.deviceIntegritySummaryOn') : t('settings.deviceIntegritySummaryOff')}
                </p>
              </div>
            </button>
            <div className="flex flex-shrink-0 items-center gap-2">
              {settingStatus(deviceIntegrityGuard ? t('settings.enabled') : t('settings.disabled'), deviceIntegrityGuard)}
              <button type="button" onClick={() => { hapticTap(); setShowDeviceIntegrityGuard(!showDeviceIntegrityGuard); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
                <ChevronDown size={16} className={`transition-transform ${showDeviceIntegrityGuard ? 'rotate-180' : ''}`} />
              </button>
                {toggleSwitch(
                  deviceIntegrityGuard,
                  handleToggleDeviceIntegrityGuard,
                  t('settings.deviceIntegrityTitle'),
                  'bg-red-500',
                  deviceIntegrityBusy,
                )}
            </div>
          </div>
          {showDeviceIntegrityGuard && (
            <div className="mx-4 mb-4 space-y-3">
              <p className="text-xs leading-relaxed text-surface-400">{t('settings.deviceIntegrityDesc')}</p>
              <div className={`rounded-xl border p-3 text-xs leading-relaxed ${
                deviceRiskInfo?.risky
                  ? 'border-red-500/25 bg-red-500/10 text-red-100'
                  : 'border-emerald-500/15 bg-emerald-500/5 text-emerald-100/85'
              }`}>
                {deviceRiskInfo?.risky
                  ? t('settings.deviceIntegrityRiskDetected', { reasons: formatDeviceRiskReasons() })
                  : t('settings.deviceIntegrityNoRisk')}
              </div>
              <Notice variant="warning">
                {t('settings.deviceIntegrityLimit')}
              </Notice>
            </div>
          )}
        </div>

          <SecurityAutomationSection
          t={t}
          showAutoLock={showAutoLock}
          setShowAutoLock={setShowAutoLock}
          showClipboard={showClipboard}
          setShowClipboard={setShowClipboard}
          autoLockEnabled={autoLockEnabled}
          currentAutoLockMs={currentAutoLockMs}
          currentClipboardMs={currentClipboardMs}
          secretCopyDisabled={secretCopyDisabled}
          toggleSecretCopyDisabled={toggleSecretCopyDisabled}
          customAutoLock={customAutoLock}
          setCustomAutoLock={setCustomAutoLock}
          customClipboard={customClipboard}
          setCustomClipboard={setCustomClipboard}
          setAutoLockPreference={setAutoLockPreference}
          saveAutoLock={saveAutoLock}
          saveCustomAutoLock={saveCustomAutoLock}
          saveClipboard={saveClipboard}
          saveCustomClipboard={saveCustomClipboard}
          formatAutoLock={formatAutoLock}
          formatClipboardTimeout={formatClipboardTimeout}
          settingStatus={settingStatus}
            onTap={hapticTap}
            toggleSwitch={toggleSwitch}
          />

          <SettingsSubGroupLabel>{t('settings.sensitiveActionProtectionGroup', { default: 'Xác nhận thao tác nhạy cảm' })}</SettingsSubGroupLabel>

          <div className="border-b border-surface-700/30">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { hapticTap(); setShowSensitivePinDetails(!showSensitivePinDetails); }}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                    sensitivePinEnabled
                      ? 'border-brand-400/25 bg-brand-500/15 text-brand-300'
                      : 'border-surface-700/60 bg-surface-800/70 text-surface-400'
                  }`}>
                    <ShieldCheck size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{t('settings.sensitivePinTitle')}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] ${
                        sensitivePinEnabled
                          ? 'bg-brand-500/15 text-brand-200'
                          : 'bg-surface-800 text-surface-400'
                      }`}>
                        {sensitivePinEnabled ? t('settings.enabled') : t('settings.disabled')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-surface-500">
                      {sensitivePinEnabled
                        ? t('settings.sensitivePinSummaryOn')
                        : t('settings.sensitivePinSummaryOff')}
                    </p>
                  </div>
                </button>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { hapticTap(); setShowSensitivePinDetails(!showSensitivePinDetails); }}
                    className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
                    aria-label={t('settings.expandDetails')}
                  >
                    <ChevronDown size={16} className={`transition-transform ${showSensitivePinDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {toggleSwitch(sensitivePinEnabled, handleToggleSensitivePin, t('settings.sensitivePinTitle'), 'bg-brand-500')}
                </div>
              </div>

              {showSensitivePinDetails && (
                <div className="mt-4 space-y-3 rounded-2xl border border-brand-500/15 bg-gradient-to-br from-brand-500/10 via-surface-900/80 to-surface-950/80 p-3 shadow-inner">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-200">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">{t('settings.sensitivePinDetailsTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-300">{t('settings.sensitivePinDetailsIntro')}</p>
                    </div>
                  </div>

                  {showSensitivePinSetup && !sensitivePinEnabled && (
                    <div className="space-y-3 rounded-xl border border-brand-500/20 bg-surface-950/55 p-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{t('settings.sensitivePinCreateTitle', { default: 'Tạo PIN phụ 6 chữ số' })}</p>
                        <p className="mt-1 text-xs leading-relaxed text-surface-400">
                          {t('settings.sensitivePinCreateDesc', { default: 'PIN này được yêu cầu trước khi cho phép hiển/xuất/nhập ghi đè hoặc thao tác Shamir.' })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <PasswordInput
                          value={sensitivePinInput}
                          onChange={e => setSensitivePinInput(sanitizePinInput(e.target.value))}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSensitivePin()}
                          placeholder={t('settings.sensitivePinCreatePlaceholder', { default: 'Nhập PIN phụ 6 chữ số' })}
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-white placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
                        />
                        <PasswordInput
                          value={sensitivePinConfirm}
                          onChange={e => setSensitivePinConfirm(sanitizePinInput(e.target.value))}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSensitivePin()}
                          placeholder={t('settings.sensitivePinConfirmPlaceholder', { default: 'Nhập lại PIN phụ' })}
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-white placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={resetSensitivePinSetup}
                          disabled={sensitivePinBusy}
                          className="btn-glow flex-1 rounded-lg bg-surface-700 py-2 text-xs text-surface-300 disabled:opacity-50"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSensitivePin}
                          disabled={sensitivePinBusy}
                          className="btn-glow flex-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {t('common.save')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <div className="rounded-xl border border-surface-700/50 bg-surface-950/45 p-3">
                      <p className="text-xs font-semibold text-white">{t('settings.sensitivePinDetailLayerTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.sensitivePinDetailLayerDesc')}</p>
                    </div>
                    <div className="rounded-xl border border-surface-700/50 bg-surface-950/45 p-3">
                      <p className="text-xs font-semibold text-white">{t('settings.sensitivePinDetailScopeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.sensitivePinDetailScopeDesc')}</p>
                    </div>
                    <div className="rounded-xl border border-surface-700/50 bg-surface-950/45 p-3">
                      <p className="text-xs font-semibold text-white">{t('settings.sensitivePinDetailStorageTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.sensitivePinDetailStorageDesc')}</p>
                    </div>
                  </div>

                  <div className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                    sensitivePinEnabled
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                  }`}>
                    {sensitivePinEnabled
                      ? t('settings.sensitivePinStatusEnabled')
                      : t('settings.sensitivePinStatusDisabled')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <SettingsSubGroupLabel>{t('settings.contentDeviceProtectionGroup', { default: 'Bảo vệ nội dung, thiết bị & vault' })}</SettingsSubGroupLabel>

          <AdvancedSecuritySection
          t={t}
          securityStatus={securityStatus}
          hardwareBoundBusy={hardwareBoundBusy}
          showSecureDisplay={showSecureDisplay}
          setShowSecureDisplay={setShowSecureDisplay}
          showHardwareBound={showHardwareBound}
          setShowHardwareBound={setShowHardwareBound}
          showScrambledKeyboard={showScrambledKeyboard}
          setShowScrambledKeyboard={setShowScrambledKeyboard}
          showScreenCapture={showScreenCapture}
          setShowScreenCapture={setShowScreenCapture}
          showMasterPasswordDetails={showMasterPasswordDetails}
          setShowMasterPasswordDetails={setShowMasterPasswordDetails}
          showMPSetup={showMPSetup}
          setShowMPSetup={setShowMPSetup}
          mpInput={mpInput}
          setMpInput={setMpInput}
          mpConfirm={mpConfirm}
          setMpConfirm={setMpConfirm}
          showMPRemove={showMPRemove}
          setShowMPRemove={setShowMPRemove}
          mpRemoveInput={mpRemoveInput}
          setMpRemoveInput={setMpRemoveInput}
          mpBusy={mpBusy}
          screenCapturePassword={screenCapturePassword}
          setScreenCapturePassword={setScreenCapturePassword}
          screenCaptureTarget={screenCaptureTarget}
          setScreenCaptureTarget={setScreenCaptureTarget}
          secureDisplay={secureDisplay}
          scrambledKeyboard={scrambledKeyboard}
          screenSecurity={screenSecurity}
          mp={mp}
          settingStatus={settingStatus}
          hardwareSecurityLabel={hardwareSecurityLabel}
          handleToggleHardwareBound={handleToggleHardwareBound}
          requestScreenCaptureToggle={requestScreenCaptureToggle}
          verifyScreenCaptureChange={verifyScreenCaptureChange}
          handleSetMP={handleSetMP}
          handleRemoveMP={handleRemoveMP}
            showToast={showToast}
            onTap={hapticTap}
            toggleSwitch={toggleSwitch}
          />
        </div>
      </div>

    </>
  );
}

