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
  AUTOLOCK_KEY,
  AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY,
  AUTOLOCK_PRESET_KEY,
  AUTOLOCK_SCREEN_OFF_LOCK_KEY,
  AUTOLOCK_SETTINGS_CHANGED_EVENT,
  CONTEXT_AUTOLOCK_PRESETS,
  DEFAULT_MS,
  PRESET_SETTINGS,
  type AutoLockPreset,
  type BuiltInAutoLockPreset,
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
import { getErrorMessage, hashPin, parseStoredInt, type PinStep } from '../securityTabUtils';
import { AdvancedSecuritySection } from './AdvancedSecuritySection';
import { SecurityStatusSection } from './SecurityStatusSection';
import { PinBiometricSection } from './PinBiometricSection';
import { SecurityAutomationSection } from './SecurityAutomationSection';

export type SecurityTabProps = {
  aesKey: string;
};

type VaultSecurityStatus = Awaited<ReturnType<typeof getVaultSecurityStatus>>;

function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-2 px-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-surface-500 first:mt-0">
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
  const [currentAutoLockMs, setCurrentAutoLockMs] = useState(DEFAULT_MS);
  const [contextAutoLockPreset, setContextAutoLockPreset] = useState<AutoLockPreset>('balanced');
  const [contextBackgroundSeconds, setContextBackgroundSeconds] = useState('30');
  const [contextSwitchSeconds, setContextSwitchSeconds] = useState('15');
  const [contextRevealSeconds, setContextRevealSeconds] = useState('30');
  const [contextLockAfterCopy, setContextLockAfterCopy] = useState(false);
  const [contextScreenOffLock, setContextScreenOffLock] = useState(true);
  const [currentClipboardMs, setCurrentClipboardMs] = useState(30000);
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
      setContextLockAfterCopy(lockAfterCopy === null ? presetDefaults.lockAfterSecretCopy : lockAfterCopy === 'true');
      setContextScreenOffLock(screenOffLock === null ? presetDefaults.screenOffLock : screenOffLock === 'true');
      const { value: clipboardMs } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
      const clipboardTimeout = parseStoredInt(clipboardMs);
      setCurrentClipboardMs(Number.isFinite(clipboardTimeout) && clipboardTimeout >= 0 ? clipboardTimeout : 30000);
      const { value: secretCopyOff } = await Preferences.get({ key: SECRET_COPY_DISABLED_KEY });
      setSecretCopyDisabled(secretCopyOff === 'true');
    };
    loadSettings();
  }, []);

  const saveAutoLock = async (ms: number | string) => {
    const safeMs = Number.parseInt(String(ms), 10);
    if (!Number.isFinite(safeMs) || safeMs < 60000 || safeMs > 24 * 60 * 60 * 1000) {
      showToast(t('settings.autoLockRangeError'), 'warning');
      return;
    }
    const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
    if (!ok) return;
    hapticTap();
    await Preferences.set({ key: AUTOLOCK_KEY, value: String(safeMs) });
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

  const saveContextAutoLockPreset = async (preset: AutoLockPreset) => {
    const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
    if (!ok) return;
    hapticTap();

    if (preset === 'custom') {
      await Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: preset });
    } else {
      const policy = PRESET_SETTINGS[preset as BuiltInAutoLockPreset];
      await Promise.all([
        Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: preset }),
        Preferences.set({ key: AUTOLOCK_BACKGROUND_KEY, value: String(policy.backgroundMs) }),
        Preferences.set({ key: AUTOLOCK_BLUR_KEY, value: String(policy.blurMs) }),
        Preferences.set({ key: AUTOLOCK_AFTER_REVEAL_KEY, value: String(policy.afterRevealMs) }),
        Preferences.set({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, value: policy.lockAfterSecretCopy ? 'true' : 'false' }),
        Preferences.set({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY, value: policy.screenOffLock ? 'true' : 'false' }),
      ]);
    }

    if (preset !== 'custom') {
      const policy = PRESET_SETTINGS[preset as BuiltInAutoLockPreset];
      setContextBackgroundSeconds(String(Math.round(policy.backgroundMs / 1000)));
      setContextSwitchSeconds(String(Math.round(policy.blurMs / 1000)));
      setContextRevealSeconds(String(Math.round(policy.afterRevealMs / 1000)));
      setContextLockAfterCopy(policy.lockAfterSecretCopy);
      setContextScreenOffLock(policy.screenOffLock);
    }

    setContextAutoLockPreset(preset);
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.contextAutoLockPresetSaved', { preset: t(`settings.contextAutoLockPreset_${preset}`) }), 'success');
  };

  const saveCustomContextAutoLock = async () => {
    const backgroundMs = Number.parseInt(contextBackgroundSeconds, 10) * 1000;
    const blurMs = Number.parseInt(contextSwitchSeconds, 10) * 1000;
    const afterRevealMs = Number.parseInt(contextRevealSeconds, 10) * 1000;
    const validMs = [backgroundMs, blurMs, afterRevealMs].every(ms => Number.isFinite(ms) && ms >= 0 && ms <= 24 * 60 * 60 * 1000);
    if (!validMs) {
      showToast(t('settings.autoLockRangeError'), 'warning');
      return;
    }

    const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
    if (!ok) return;
    hapticTap();
    await Promise.all([
      Preferences.set({ key: AUTOLOCK_PRESET_KEY, value: 'custom' }),
      Preferences.set({ key: AUTOLOCK_BACKGROUND_KEY, value: String(backgroundMs) }),
      Preferences.set({ key: AUTOLOCK_BLUR_KEY, value: String(blurMs) }),
      Preferences.set({ key: AUTOLOCK_AFTER_REVEAL_KEY, value: String(afterRevealMs) }),
      Preferences.set({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY, value: contextLockAfterCopy ? 'true' : 'false' }),
      Preferences.set({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY, value: contextScreenOffLock ? 'true' : 'false' }),
    ]);
    setContextAutoLockPreset('custom');
    window.dispatchEvent(new Event(AUTOLOCK_SETTINGS_CHANGED_EVENT));
    showToast(t('settings.contextAutoLockCustomSaved'), 'success');
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
    if (next) {
      const confirmed = await showConfirm(t('settings.hardwareBoundBackupConfirm'), {
        danger: true,
        title: t('settings.hardwareBoundConfirmTitle'),
        confirmText: t('common.confirm'),
      });
      if (!confirmed) return;
    }
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
      if (next) {
        const confirmed = await showConfirm(t('settings.deviceIntegrityConfirm'), {
          danger: true,
          title: t('settings.deviceIntegrityConfirmTitle'),
          confirmText: t('common.confirm'),
        });
        if (!confirmed) return;
      }
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
      if (pinNew.length < 6) { setPinError(t('pinLock.enter6Digits')); return; }
      setPinStep('confirm'); setPinError('');
    } else if (pinStep === 'confirm') {
      if (pinConfirmVal !== pinNew) {
        setPinError(t('settings.pinsNotMatch'));
        setPinStep('new'); setPinNew(''); setPinConfirmVal('');
        return;
      }
      await Preferences.set({ key: PIN_HASH_KEY, value: hashPin(pinNew) });
      hapticSuccess();
      showToast(t('settings.pinChangedSuccess'), 'success');
      setShowChangePin(false);
      setPinCurrent(''); setPinNew(''); setPinConfirmVal(''); setPinStep('current');
    }
  };

  const handleToggleKillSwitch = async () => {
    const newVal = !killSwitchEnabled;
    if (newVal) {
      const confirm = await showConfirm(t('settings.killSwitchConfirm'), { danger: true });
      if (!confirm) return;
    }
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
    if (decoyPinInput.length !== 6) { showToast(t('pinLock.enter6Digits'), 'error'); return; }
    const { value: mainPinHash } = await Preferences.get({ key: PIN_HASH_KEY });
    if (hashPin(decoyPinInput) === mainPinHash) { showToast(t('settings.decoySameAsMain'), 'error'); return; }
    await Preferences.set({ key: DECOY_PIN_HASH_KEY, value: hashPin(decoyPinInput) });
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

  return (
    <>
      <SettingsGroupLabel>{t('settings.securityStatusTitle')}</SettingsGroupLabel>

      <SecurityStatusSection
        t={t}
        expanded={showSecurityStatus}
        onToggle={() => { hapticTap(); setShowSecurityStatus(!showSecurityStatus); }}
        securityStatus={securityStatus}
        hardwareSecurityLabel={hardwareSecurityLabel}
      />

      <SettingsGroupLabel>{t('settings.pinLockTitle')}</SettingsGroupLabel>

      <PinBiometricSection
        t={t}
        hasBiometric={hasBiometric}
        showChangePin={showChangePin}
        setShowChangePin={setShowChangePin}
        pinStep={pinStep}
        pinCurrent={pinCurrent}
        setPinCurrent={setPinCurrent}
        pinNew={pinNew}
        setPinNew={setPinNew}
        pinConfirmVal={pinConfirmVal}
        setPinConfirmVal={setPinConfirmVal}
        pinError={pinError}
        handleChangePin={handleChangePin}
        killSwitchEnabled={killSwitchEnabled}
        handleToggleKillSwitch={handleToggleKillSwitch}
        hasDecoyPin={hasDecoyPin}
        showDecoyPinInput={showDecoyPinInput}
        decoyPinInput={decoyPinInput}
        setDecoyPinInput={setDecoyPinInput}
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
      />

      <SettingsGroupLabel>{t('settings.security')}</SettingsGroupLabel>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('settings.security')}</p>
              <p className="text-xs text-surface-400">{t('settings.securityDesc')}</p>
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
              <button
                type="button"
                onClick={handleToggleDeviceIntegrityGuard}
                disabled={deviceIntegrityBusy}
                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-50 ${deviceIntegrityGuard ? 'bg-red-500' : 'bg-surface-700'}`}
                aria-label={t('settings.deviceIntegrityTitle')}
              >
                <span className={`h-5 w-5 rounded-full bg-white transition-transform ${deviceIntegrityGuard ? 'translate-x-5' : ''}`} />
              </button>
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
          currentAutoLockMs={currentAutoLockMs}
          contextAutoLockPreset={contextAutoLockPreset}
          contextAutoLockPresets={CONTEXT_AUTOLOCK_PRESETS}
          presetSettings={PRESET_SETTINGS}
          saveContextAutoLockPreset={saveContextAutoLockPreset}
          contextBackgroundSeconds={contextBackgroundSeconds}
          setContextBackgroundSeconds={setContextBackgroundSeconds}
          contextSwitchSeconds={contextSwitchSeconds}
          setContextSwitchSeconds={setContextSwitchSeconds}
          contextRevealSeconds={contextRevealSeconds}
          setContextRevealSeconds={setContextRevealSeconds}
          contextLockAfterCopy={contextLockAfterCopy}
          setContextLockAfterCopy={setContextLockAfterCopy}
          contextScreenOffLock={contextScreenOffLock}
          setContextScreenOffLock={setContextScreenOffLock}
          saveCustomContextAutoLock={saveCustomContextAutoLock}
          currentClipboardMs={currentClipboardMs}
          secretCopyDisabled={secretCopyDisabled}
          toggleSecretCopyDisabled={toggleSecretCopyDisabled}
          customAutoLock={customAutoLock}
          setCustomAutoLock={setCustomAutoLock}
          customClipboard={customClipboard}
          setCustomClipboard={setCustomClipboard}
          saveAutoLock={saveAutoLock}
          saveCustomAutoLock={saveCustomAutoLock}
          saveClipboard={saveClipboard}
          saveCustomClipboard={saveCustomClipboard}
          formatAutoLock={formatAutoLock}
          formatClipboardTimeout={formatClipboardTimeout}
          settingStatus={settingStatus}
          onTap={hapticTap}
        />

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
        />
      </div>

    </>
  );
}

