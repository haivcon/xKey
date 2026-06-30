import { useState, useEffect, type ChangeEvent, type ReactNode } from 'react';
import { ChevronDown, Download, Fingerprint, Import, ScanSearch, ShieldCheck, Siren } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useT } from '../../../contexts/LanguageContext';
import { useMasterPassword } from '../../../contexts/MasterPasswordContext';
import {
  AUTOLOCK_ENABLED_KEY,
  AUTOLOCK_KEY,
  AUTOLOCK_SETTINGS_CHANGED_EVENT,
  DEFAULT_MS,
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
import { SecurityRecommendationsSection } from './SecurityRecommendationsSection';
import { calculateSecurityScore, type SecurityScoreItem } from './securityScore';
import { isSensitivePinEnabled, removeSensitivePin, requireSensitivePin, setSensitivePin } from '../../../features/security/sensitivePin';
import { LOGO_LOCK_ENABLED_KEY, LOGO_LOCK_SETTINGS_CHANGED_EVENT } from '../../../features/security/logoLock';

export type SecurityTabProps = {
  aesKey: string;
};

type VaultSecurityStatus = Awaited<ReturnType<typeof getVaultSecurityStatus>>;

function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <div className="security-group-label">
      {children}
    </div>
  );
}

function SettingsSubGroupLabel({ children }: { children: string }) {
  return (
    <div className="security-subgroup-label mt-4 border-y border-surface-200 bg-surface-50 px-4 py-2.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-surface-600 first:mt-0 dark:border-surface-700/30 dark:bg-surface-950/35 dark:text-surface-300">
      {children}
    </div>
  );
}

export function SecurityTabContent({ aesKey }: SecurityTabProps) {
  // Auto-lock & clipboard
  const [showSecurityStatus, setShowSecurityStatus] = useState(false);
  const [showAutoLock, setShowAutoLock] = useState(false);
  const [showClipboard, setShowClipboard] = useState(false);
  const [showSecureDisplay, setShowSecureDisplay] = useState(false);
  const [showDeviceIntegrityGuard, setShowDeviceIntegrityGuard] = useState(false);
  const [showHardwareBound, setShowHardwareBound] = useState(false);
  const [showScrambledKeyboard, setShowScrambledKeyboard] = useState(false);
  const [showMasterPasswordDetails, setShowMasterPasswordDetails] = useState(false);
  const [showScreenCapture, setShowScreenCapture] = useState(false);
  const [showSensitivePinDetails, setShowSensitivePinDetails] = useState(false);
  const [showLogoLockDetails, setShowLogoLockDetails] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [currentAutoLockMs, setCurrentAutoLockMs] = useState(DEFAULT_MS);
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
  const [pinFailedAttempts, setPinFailedAttempts] = useState(0);
  const [pinBackoffUntil, setPinBackoffUntil] = useState(0);

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

  const warnSecurityDowngrade = async (title: string) => showConfirm(
    t('settings.securityDowngradeWarning', { title }),
    {
      danger: true,
      title: t('settings.securityDowngradeTitle'),
      confirmText: t('common.confirm'),
    },
  );

  const setAutoLockPreference = async (enabled: boolean, ms = currentAutoLockMs) => {
    hapticTap();
    if (!enabled && autoLockEnabled) {
      const ok = await warnSecurityDowngrade(t('settings.autoLock'));
      if (!ok) return;
    }
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: enabled ? 'true' : 'false' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(ms > 0 ? ms : DEFAULT_MS) }),
    ]);
    setAutoLockEnabled(enabled);
    setCurrentAutoLockMs(ms > 0 ? ms : DEFAULT_MS);
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(enabled ? t('settings.autoLockSaved') : t('settings.autoLockDisabledToast'), enabled ? 'success' : 'info');
  };

  const saveAutoLock = async (ms: number | string) => {
    const safeMs = Number.parseInt(String(ms), 10);
    if (!Number.isFinite(safeMs) || safeMs < 60000 || safeMs > 24 * 60 * 60 * 1000) {
      showToast(t('settings.autoLockRangeError'), 'warning');
      return;
    }
    const ok = await showConfirm(t('settings.changeConfirm'));
    if (!ok) return;
    hapticTap();
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: 'true' }),
      Preferences.set({ key: AUTOLOCK_KEY, value: String(safeMs) }),
    ]);
    setAutoLockEnabled(true);
    setCurrentAutoLockMs(safeMs);
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
    const ok = await showConfirm(t('settings.changeConfirm'));
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
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1 ${active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent' : 'bg-surface-100 text-surface-700 ring-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:ring-transparent'}`}>
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
      className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? color : 'bg-surface-200 dark:bg-surface-700'}`}
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
        : t('settings.hardwareBoundDisableConfirm'),
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
      showToast(t('settings.screenCaptureUnsupported'), 'warning');
      return;
    }
    if (!mp.hasMasterPassword) {
      setShowMasterPasswordDetails(true);
      setShowMPSetup(true);
      showToast(t('settings.screenCaptureNeedsPassword'), 'warning');
      return;
    }
    setShowScreenCapture(true);
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
      showToast(getErrorMessage(err) || t('settings.masterPasswordRemoveError'), 'error');
    } finally {
      setMpBusy(false);
    }
  };

  const handleBackPinStep = () => {
    setPinError('');
    if (pinStep === 'confirm') {
      setPinStep('new');
      setPinConfirmVal('');
      return;
    }
    if (pinStep === 'new') {
      setPinStep('current');
      setPinNew('');
    }
  };

  const handleChangePin = async () => {
    if (pinBackoffUntil > Date.now()) {
      setPinError(t('settings.pinBackoffWait', {
        seconds: String(Math.ceil((pinBackoffUntil - Date.now()) / 1000)),
      }));
      return;
    }

    if (pinStep === 'current') {
      const { value: stored } = await Preferences.get({ key: PIN_HASH_KEY });
      if (!stored) {
        setPinStep('new');
        setPinError('');
        setPinCurrent('');
        return;
      }
      if (hashPin(pinCurrent) !== stored) {
        const nextAttempts = pinFailedAttempts + 1;
        const delaySeconds = nextAttempts >= 5 ? 30 : nextAttempts >= 3 ? 10 : 0;
        setPinFailedAttempts(nextAttempts);
        if (delaySeconds) setPinBackoffUntil(Date.now() + delaySeconds * 1000);
        setPinError(delaySeconds
          ? t('settings.incorrectCurrentPinWithDelay', {
            seconds: String(delaySeconds),
          })
          : t('settings.incorrectCurrentPin'));
        return;
      }
      setPinFailedAttempts(0);
      setPinBackoffUntil(0);
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
      setPinFailedAttempts(0); setPinBackoffUntil(0); setPinError('');
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
      const verified = await requireSensitivePin(
        t('settings.sensitivePinDisableAuthPrompt'),
      );
      if (!verified) {
        showToast(t('settings.sensitivePinWrongOrCancelled'), 'warning');
        return;
      }

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

  const handleChangeSensitivePin = async () => {
    if (!sensitivePinEnabled || sensitivePinBusy) return;

    const verified = await requireSensitivePin(
      t('settings.sensitivePinChangeAuthPrompt'),
    );
    if (!verified) {
      showToast(t('settings.sensitivePinWrongOrCancelled'), 'warning');
      return;
    }

    setShowSensitivePinDetails(true);
    setShowSensitivePinSetup(true);
    setSensitivePinInput('');
    setSensitivePinConfirm('');
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
      const wasEnabled = sensitivePinEnabled;
      setSensitivePinEnabled(true);
      resetSensitivePinSetup();
      showToast(
        wasEnabled
          ? t('settings.sensitivePinChangedToast')
          : t('settings.sensitivePinEnabledToast'),
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error) || t('settings.sensitivePinInvalid'), 'error');
    } finally {
      setSensitivePinBusy(false);
    }
  };

  const scrollToSecuritySetting = (key: string) => {
    hapticTap();
    const expanders: Record<string, () => void> = {
      'master-password': () => setShowMasterPasswordDetails(true),
      'sensitive-pin': () => setShowSensitivePinDetails(true),
      'auto-lock': () => setShowAutoLock(true),
      'screen-capture': () => setShowScreenCapture(true),
      'hardware-bound': () => setShowHardwareBound(true),
      'secret-copy': () => setShowClipboard(true),
      'decoy-vault': () => setShowDecoyPinInput(true),
      'device-integrity': () => setShowDeviceIntegrityGuard(true),
    };
    expanders[key]?.();

    window.setTimeout(() => {
      const target = document.getElementById(`security-setting-${key}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-brand-400', 'ring-offset-2', 'ring-offset-white', 'dark:ring-brand-300', 'dark:ring-offset-surface-950');
      window.setTimeout(() => {
        target.classList.remove('ring-2', 'ring-brand-400', 'ring-offset-2', 'ring-offset-white', 'dark:ring-brand-300', 'dark:ring-offset-surface-950');
      }, 2400);
    }, 120);
  };

  const scoreItems: SecurityScoreItem[] = [
    { key: 'master-password', label: t('settings.masterPasswordTitle'), active: mp.hasMasterPassword, weight: 3, severity: 'high', desc: t('settings.checkupMasterPasswordDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('master-password') },
    { key: 'sensitive-pin', label: t('settings.sensitivePinTitle'), active: sensitivePinEnabled, weight: 3, severity: 'high', desc: t('settings.checkupSensitivePinDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('sensitive-pin') },
    { key: 'auto-lock', label: t('settings.autoLock'), active: autoLockEnabled, weight: 2, severity: 'high', desc: t('settings.checkupAutoLockDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('auto-lock') },
    { key: 'screen-capture', label: t('settings.screenCaptureTitle'), active: !screenSecurity.supported || screenSecurity.blocked, weight: 2, severity: 'medium', desc: t('settings.checkupScreenCaptureDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('screen-capture') },
    { key: 'hardware-bound', label: t('settings.hardwareBoundTitle'), active: !!securityStatus?.hardwareBoundOnly, weight: 2, severity: 'medium', desc: t('settings.checkupHardwareBoundDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('hardware-bound') },
    { key: 'secret-copy', label: t('settings.secretCopyDisabledTitle'), active: secretCopyDisabled, weight: 2, severity: 'medium', desc: t('settings.checkupSecretCopyDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('secret-copy') },
    { key: 'decoy-vault', label: t('settings.decoyVaultTitle'), active: hasDecoyPin, weight: 1, severity: 'low', desc: t('settings.checkupDecoyVaultDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('decoy-vault') },
    { key: 'device-integrity', label: t('settings.deviceIntegrityTitle'), active: deviceIntegrityGuard, weight: 2, severity: 'medium', desc: t('settings.checkupDeviceIntegrityDesc'), action: t('settings.goToSetting', { default: 'Đến cài đặt' }), onClick: () => scrollToSecuritySetting('device-integrity') },
  ];

  const handleExportSecurityConfig = async () => {
    const score = calculateSecurityScore(scoreItems);
    const payload = {
      app: 'xKey',
      reportType: 'security-report',
      exportedAt: new Date().toISOString(),
      score,
      riskLevel: score.riskLevel,
      enabled: scoreItems.filter(item => item.active).map(item => ({ key: item.key, label: item.label, weight: item.weight ?? 1 })),
      missing: scoreItems.filter(item => !item.active).map(item => ({ key: item.key, label: item.label, severity: item.severity ?? 'medium', weight: item.weight ?? 1 })),
      recommended: scoreItems.filter(item => !item.active).map(item => item.key),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xkey-security-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(t('settings.securityConfigExported'), 'success');
  };

  const handleImportSecurityConfig = async () => {
    hapticTap();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const payload = JSON.parse(await file.text()) as {
          app?: string;
          reportType?: string;
          enabled?: Array<{ key?: string }>;
        };

        if (payload.app !== 'xKey' || payload.reportType !== 'security-report' || !Array.isArray(payload.enabled)) {
          showToast(t('settings.securityConfigImportInvalid', { default: 'Tệp cấu hình bảo mật không hợp lệ.' }), 'error');
          return;
        }

        const confirmed = await showConfirm(t('settings.securityConfigImportConfirm', { default: 'Nhập cấu hình sẽ chỉ áp dụng các mục có thể bật tự động. Các mục cần xác minh sẽ được điều hướng đến vùng cài đặt tương ứng.' }), {
          title: t('settings.importSecurityConfig', { default: 'Nhập cấu hình' }),
          confirmText: t('common.confirm'),
        });
        if (!confirmed) return;

        const enabledKeys = new Set(payload.enabled.map(item => item.key).filter(Boolean));
        const tasks: Promise<unknown>[] = [];

        if (enabledKeys.has('auto-lock')) {
          tasks.push(
            Preferences.set({ key: AUTOLOCK_ENABLED_KEY, value: 'true' }),
            Preferences.set({ key: AUTOLOCK_KEY, value: String(DEFAULT_MS) }),
          );
          setAutoLockEnabled(true);
          setCurrentAutoLockMs(DEFAULT_MS);
        }

        if (enabledKeys.has('secret-copy')) {
          tasks.push(Preferences.set({ key: SECRET_COPY_DISABLED_KEY, value: 'true' }));
          setSecretCopyDisabled(true);
        }

        if (enabledKeys.has('device-integrity')) {
          tasks.push(setDeviceIntegrityGuardEnabled(true));
          setDeviceIntegrityGuard(true);
        }

        await Promise.all(tasks);
        window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
        showToast(t('settings.securityConfigImported', { default: 'Đã nhập cấu hình bảo mật' }), 'success');

        const needsManualSetup = ['master-password', 'sensitive-pin', 'screen-capture', 'hardware-bound', 'decoy-vault']
          .find(key => enabledKeys.has(key));
        if (needsManualSetup) {
          scrollToSecuritySetting(needsManualSetup);
        }
      } catch {
        showToast(t('settings.securityConfigImportInvalid', { default: 'Tệp cấu hình bảo mật không hợp lệ.' }), 'error');
      }
    };
    input.click();
  };

  return (
    <div className="security-tab-theme-scope">
      <SettingsGroupLabel>{t('settings.securityOverviewGroup')}</SettingsGroupLabel>

      <SecurityStatusSection
        t={t}
        expanded={showSecurityStatus}
        onToggle={() => { hapticTap(); setShowSecurityStatus(!showSecurityStatus); }}
        securityStatus={securityStatus}
        hardwareSecurityLabel={hardwareSecurityLabel}
      />

      <SecurityRecommendationsSection
        t={t}
        scoreItems={scoreItems}
        settingStatus={settingStatus}
      />

      <SettingsGroupLabel>{t('settings.unlockAuthGroup')}</SettingsGroupLabel>

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
        pinBackoffUntil={pinBackoffUntil}
        onBackPinStep={handleBackPinStep}
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

      <SettingsGroupLabel>{t('settings.securityControlsGroup')}</SettingsGroupLabel>

      <div className="security-settings-tab glass-card overflow-hidden">
        <div className="border-b border-surface-200 p-4 dark:border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="security-row-icon flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <ShieldCheck size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-950 dark:text-white">{t('settings.securityControlsTitle')}</p>
              <p className="text-xs text-surface-700 dark:text-surface-300">{t('settings.securityControlsDesc')}</p>
            </div>
          </div>
        </div>

        <div>
          <SettingsSubGroupLabel>{t('settings.appLockGroup')}</SettingsSubGroupLabel>

          {/* Logo Lock */}
          <div className="border-b border-surface-200 dark:border-surface-200 dark:border-surface-700/30">
            <div className="flex items-start justify-between gap-3 p-4">
            <button
              type="button"
              onClick={handleToggleLogoLock}
              className="flex min-w-0 flex-1 gap-3 text-left"
            >
              <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${logoLockEnabled ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
                <Fingerprint size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.logoLockTitle')}</p>
                <p className="mt-1 text-xs text-surface-700 dark:text-surface-300">
                  {logoLockEnabled ? t('settings.logoLockSummaryOn') : t('settings.logoLockSummaryOff')}
                </p>
              </div>
            </button>
              <div className="flex flex-shrink-0 items-center gap-2">
                {settingStatus(logoLockEnabled ? t('settings.enabled') : t('settings.disabled'), logoLockEnabled)}
                <button
                  type="button"
                  onClick={() => { hapticTap(); setShowLogoLockDetails(!showLogoLockDetails); }}
                  className="p-1 text-surface-700 dark:text-surface-300"
                  aria-expanded={showLogoLockDetails}
                  aria-label={t('settings.expandDetails')}
                >
                  <ChevronDown size={16} className={`transition-transform ${showLogoLockDetails ? 'rotate-180' : ''}`} />
                </button>
                {toggleSwitch(logoLockEnabled, handleToggleLogoLock, t('settings.logoLockTitle'), 'bg-rose-500')}
              </div>
            </div>
            {showLogoLockDetails && (
              <div className="mx-4 mt-2 mb-4 rounded-xl border border-rose-500/20 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">
                <p className="font-semibold">{t('settings.logoLockDetailsTitle', { default: 'Khóa bằng logo hoạt động như thế nào?' })}</p>
                <p className="mt-1">{t('settings.logoLockDetailsDesc', { default: 'Khi bật, logo xKey trên màn hình chính sẽ phát sáng viền đỏ và trở thành nút khóa nhanh. Chạm vào logo để khóa ứng dụng ngay lập tức mà không cần hiển thị nút khóa riêng, giúp thao tác kín đáo hơn trong môi trường công cộng.' })}</p>
              </div>
            )}
          </div>

          {/* Root/Data Tamper Guard */}
          <div id="security-setting-device-integrity" className="border-b border-surface-200 transition-shadow duration-300 dark:border-surface-200 dark:border-surface-700/30">
            <div className="flex items-start justify-between gap-3 p-4">
            <button
              type="button"
              onClick={() => { hapticTap(); setShowDeviceIntegrityGuard(!showDeviceIntegrityGuard); }}
              className="flex min-w-0 flex-1 gap-3 text-left"
            >
              <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${deviceIntegrityGuard ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-red-500/10 text-red-500 dark:text-red-400'}`}>
                <ScanSearch size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.deviceIntegrityTitle')}</p>
                <p className="mt-1 truncate text-xs text-surface-700 dark:text-surface-300">
                  {deviceIntegrityGuard ? t('settings.deviceIntegritySummaryOn') : t('settings.deviceIntegritySummaryOff')}
                </p>
              </div>
            </button>
            <div className="flex flex-shrink-0 items-center gap-2">
              {settingStatus(deviceIntegrityGuard ? t('settings.enabled') : t('settings.disabled'), deviceIntegrityGuard)}
              <button type="button" onClick={() => { hapticTap(); setShowDeviceIntegrityGuard(!showDeviceIntegrityGuard); }} className="p-1 text-surface-700 dark:text-surface-300" aria-label={t('settings.expandDetails')}>
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
              <p className="text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.deviceIntegrityDesc')}</p>
              <div className={`rounded-xl border p-3 text-xs leading-relaxed ${
                deviceRiskInfo?.risky
                  ? 'border-red-500/25 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-100'
                  : 'border-emerald-500/20 bg-emerald-50 text-emerald-900 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-100/85'
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

          <SettingsSubGroupLabel>{t('settings.sensitiveActionProtectionGroup')}</SettingsSubGroupLabel>

          <div className="border-b border-surface-200 dark:border-surface-700/30">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { hapticTap(); setShowSensitivePinDetails(!showSensitivePinDetails); }}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                    sensitivePinEnabled
                      ? 'border-fuchsia-400/30 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/25 dark:bg-fuchsia-500/15 dark:text-fuchsia-300'
                      : 'border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-600 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-400'
                  }`}>
                    <Siren size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('settings.sensitivePinTitle')}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] ${
                        sensitivePinEnabled
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                      }`}>
                        {sensitivePinEnabled ? t('settings.enabled') : t('settings.disabled')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-surface-700 dark:text-surface-300">
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
                    className="p-1.5 text-surface-700 transition-colors hover:text-surface-950 dark:text-surface-300 dark:hover:text-white"
                    aria-label={t('settings.expandDetails')}
                  >
                    <ChevronDown size={16} className={`transition-transform ${showSensitivePinDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {toggleSwitch(sensitivePinEnabled, handleToggleSensitivePin, t('settings.sensitivePinTitle'), 'bg-brand-500')}
                </div>
              </div>

              {showSensitivePinDetails && (
                <div className="mt-4 space-y-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-surface-50 p-3 shadow-inner dark:border-brand-500/15 dark:from-brand-500/10 dark:via-surface-900/80 dark:to-surface-950/80">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200">
                      <Siren size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-200">{t('settings.sensitivePinDetailsTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.sensitivePinDetailsIntro')}</p>
                    </div>
                  </div>

                  {showSensitivePinSetup && (
                    <div className="space-y-3 rounded-xl border border-brand-200 bg-white/85 p-3 dark:border-brand-500/20 dark:bg-surface-950/55">
                      <div>
                        <p className="text-xs font-semibold text-surface-950 dark:text-white">
                          {sensitivePinEnabled
                            ? t('settings.sensitivePinChangeTitle')
                            : t('settings.sensitivePinCreateTitle')}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">
                          {sensitivePinEnabled
                            ? t('settings.sensitivePinChangeDesc')
                            : t('settings.sensitivePinCreateDesc')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <PasswordInput
                          value={sensitivePinInput}
                          onChange={e => setSensitivePinInput(sanitizePinInput(e.target.value))}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSensitivePin()}
                          placeholder={t('settings.sensitivePinCreatePlaceholder')}
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:placeholder:text-surface-600"
                        />
                        <PasswordInput
                          value={sensitivePinConfirm}
                          onChange={e => setSensitivePinConfirm(sanitizePinInput(e.target.value))}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSensitivePin()}
                          placeholder={t('settings.sensitivePinConfirmPlaceholder')}
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:placeholder:text-surface-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={resetSensitivePinSetup}
                          disabled={sensitivePinBusy}
                        className="btn-glow flex-1 rounded-lg bg-surface-200 py-2 text-xs font-semibold text-surface-800 disabled:opacity-50 dark:bg-surface-700 dark:text-surface-300"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSensitivePin}
                          disabled={sensitivePinBusy}
                          className="btn-glow flex-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-surface-950 dark:text-white disabled:opacity-50"
                        >
                          {t('common.save')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <div className="rounded-xl border border-surface-200 bg-white/75 p-3 dark:border-surface-700/50 dark:bg-surface-950/45">
                      <p className="text-xs font-semibold text-surface-950 dark:text-white">{t('settings.sensitivePinDetailLayerTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.sensitivePinDetailLayerDesc')}</p>
                    </div>
                    <div className="rounded-xl border border-surface-200 bg-white/75 p-3 dark:border-surface-700/50 dark:bg-surface-950/45">
                      <p className="text-xs font-semibold text-surface-950 dark:text-white">{t('settings.sensitivePinDetailScopeTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.sensitivePinDetailScopeDesc')}</p>
                    </div>
                    <div className="rounded-xl border border-surface-200 bg-white/75 p-3 dark:border-surface-700/50 dark:bg-surface-950/45">
                      <p className="text-xs font-semibold text-surface-950 dark:text-white">{t('settings.sensitivePinDetailStorageTitle')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">{t('settings.sensitivePinDetailStorageDesc')}</p>
                    </div>
                  </div>

                  {sensitivePinEnabled && !showSensitivePinSetup && (
                    <button
                      type="button"
                      onClick={handleChangeSensitivePin}
                      disabled={sensitivePinBusy}
                      className="btn-glow w-full rounded-xl border border-brand-500/25 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-800 dark:text-brand-100 disabled:opacity-50"
                    >
                      {t('settings.changeSensitivePin')}
                    </button>
                  )}

                  <div className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                    sensitivePinEnabled
                      ? 'border-emerald-500/20 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100'
                      : 'border-amber-500/20 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100'
                  }`}>
                    {sensitivePinEnabled
                      ? t('settings.sensitivePinStatusEnabled')
                      : t('settings.sensitivePinStatusDisabled')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <SettingsSubGroupLabel>{t('settings.contentDeviceProtectionGroup')}</SettingsSubGroupLabel>

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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleImportSecurityConfig}
          className="btn-glow inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-center text-[0.7rem] font-bold leading-tight text-brand-800 shadow-sm transition hover:border-brand-500 hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-500/10 dark:text-brand-100 dark:hover:border-brand-400/70 dark:hover:bg-brand-500/20"
        >
          <Import size={14} className="flex-shrink-0" />
          <span className="min-w-0 truncate">{t('settings.importSecurityConfig', { default: 'Nhập cấu hình bảo mật' })}</span>
        </button>
        <button
          type="button"
          onClick={handleExportSecurityConfig}
          className="btn-glow inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-center text-[0.7rem] font-bold leading-tight text-brand-800 shadow-sm transition hover:border-brand-500 hover:bg-brand-100 dark:border-brand-500/35 dark:bg-brand-500/10 dark:text-brand-100 dark:hover:border-brand-400/70 dark:hover:bg-brand-500/20"
        >
          <Download size={14} className="flex-shrink-0" />
          <span className="min-w-0 truncate">{t('settings.exportSecurityConfig', { default: 'Xuất cấu hình bảo mật' })}</span>
        </button>
      </div>

    </div>
  );
}

