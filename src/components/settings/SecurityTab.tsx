import { useState, useEffect, type ChangeEvent, type ReactNode } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, Timer, Clipboard, KeyRound, Lock, ChevronDown, RefreshCw, Monitor, Keyboard, Eye, Camera, Cpu } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useT } from '../../contexts/LanguageContext';
import { useMasterPassword } from '../../contexts/MasterPasswordContext';
import { AUTOLOCK_KEY, DEFAULT_MS, AUTOLOCK_SETTINGS_CHANGED_EVENT } from '../../hooks/useAutoLock';
import {
  requestMotionPermission,
  SHAKE_SETTINGS_CHANGED_EVENT,
  SHAKE_SENSITIVITY_KEY,
  SHAKE_TO_LOCK_KEY,
} from '../../hooks/useShakeToLock';
import { CLIPBOARD_TIMEOUT_KEY, CLIPBOARD_OPTIONS } from '../../utils/clipboard';
import { hapticTap, hapticSuccess } from '../../utils/haptics';
import { PIN_HASH_KEY, KILL_SWITCH_KEY } from '../PinLockScreen';
import { getVaultSecurityStatus, isBiometricAvailable, setHardwareBoundOnlyMode } from '../../utils/storage';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled, setDeviceIntegrityGuardEnabled, type DeviceIntegrityRisk } from '../../utils/deviceIntegrity';
import PasswordInput from '../PasswordInput';
import { useScrambledKeyboard } from '../../contexts/ScrambledKeyboardContext';
import { useSecureDisplay } from '../../contexts/SecureDisplayContext';
import { useScreenSecurity } from '../../contexts/ScreenSecurityContext';
import Notice from '../Notice';

const AUTOLOCK_OPTIONS = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
];

type SecurityTabProps = {
  aesKey: string;
};

type PinStep = 'current' | 'new' | 'confirm';
type VaultSecurityStatus = Awaited<ReturnType<typeof getVaultSecurityStatus>>;

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : ''
);

const parseStoredInt = (value: string | null, fallback = 0): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hashPin = (p: string) => CryptoJS.SHA256(p + 'xkey_pin_salt_v1').toString();

export default function SecurityTab({ aesKey }: SecurityTabProps) {
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
  const [currentClipboardMs, setCurrentClipboardMs] = useState(30000);
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
  const [shakeSensitivity, setShakeSensitivity] = useState(15);

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
      const { value: decoyHash } = await Preferences.get({ key: 'xkey_decoy_pin_hash' });
      setHasDecoyPin(!!decoyHash);
      const { value: shakeVal } = await Preferences.get({ key: SHAKE_TO_LOCK_KEY });
      setShakeToLockEnabled(shakeVal === 'true');
      const { value: shakeSens } = await Preferences.get({ key: SHAKE_SENSITIVITY_KEY });
      if (shakeSens) setShakeSensitivity(Number(shakeSens));
      const { value: autoLockMs } = await Preferences.get({ key: AUTOLOCK_KEY });
      const ms = parseStoredInt(autoLockMs);
      setCurrentAutoLockMs(Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_MS);
      const { value: clipboardMs } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
      const clipboardTimeout = parseStoredInt(clipboardMs);
      setCurrentClipboardMs(Number.isFinite(clipboardTimeout) && clipboardTimeout >= 0 ? clipboardTimeout : 30000);
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

  const formatAutoLock = (ms: number) => {
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
    } finally {
      setMpBusy(false);
    }
  };

  const handleChangePin = async () => {
    if (pinStep === 'current') {
      const { value: stored } = await Preferences.get({ key: PIN_HASH_KEY });
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
        await Preferences.remove({ key: 'xkey_decoy_pin_hash' });
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
    await Preferences.set({ key: 'xkey_decoy_pin_hash', value: hashPin(decoyPinInput) });
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

  return (
    <>
      {/* ═══ Security Section ═══ */}
      <div className="glass-card overflow-hidden">
        <button
          type="button"
          onClick={() => { hapticTap(); setShowSecurityStatus(!showSecurityStatus); }}
          className="flex w-full items-center justify-between gap-3 border-b border-surface-700/50 p-4 text-left transition-colors hover:bg-surface-800/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('settings.securityStatusTitle')}</p>
              <p className="text-xs text-surface-400">{t('settings.securityStatusDesc')}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`flex-shrink-0 text-surface-500 transition-transform ${showSecurityStatus ? 'rotate-180' : ''}`} />
        </button>
        {showSecurityStatus && (
          <div className="mx-4 mt-4 mb-2 rounded-xl border border-surface-700/60 bg-surface-900/40 divide-y divide-surface-700/30">
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-400">{t('settings.securityMode')}</span>
              <span className="text-xs font-semibold text-white">
                {securityStatus ? t(`settings.securityMode_${securityStatus.mode}`) : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-400">{t('settings.vaultKeyProtection')}</span>
              <span className="text-xs font-semibold text-white">
                {securityStatus?.deviceProtected ? t('settings.keystoreProtected') : t('settings.fallbackProtected')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-400">{t('settings.deviceCredential')}</span>
              <span className={`text-xs font-bold ${securityStatus?.deviceCredentialAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {securityStatus?.deviceCredentialAvailable ? t('settings.available') : t('settings.unavailable')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-400">{t('settings.hardwareSecurity')}</span>
              <span className={`text-right text-xs font-bold ${securityStatus?.hardwareInfo?.strongBoxSupported || securityStatus?.hardwareInfo?.keystoreAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {securityStatus ? hardwareSecurityLabel() : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-400">{t('settings.compatibilityFallback')}</span>
              <span className={`text-xs font-bold ${securityStatus?.fallback ? 'text-amber-400' : 'text-emerald-400'}`}>
                {securityStatus?.fallback ? t('settings.enabled') : t('settings.disabled')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-400">{t('settings.ramOnlyDecryptedVault')}</span>
              <span className="text-right text-xs font-bold text-emerald-400">
                {securityStatus?.storage?.ramOnlyDecrypted ? t('settings.ramOnlyDecryptedStatus') : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-400">{t('settings.vaultStorageLayout')}</span>
              <span className={`text-right text-xs font-bold ${
                !securityStatus?.vaultExists
                  ? 'text-surface-400'
                  : securityStatus?.vaultStorageError || securityStatus?.storage?.fragmentedStorageHealthy === false ? 'text-red-400'
                  : securityStatus?.storage?.fragmentedStorage ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {!securityStatus?.vaultExists
                  ? t('settings.noVaultStorageYet')
                  : securityStatus?.vaultStorageError || securityStatus?.storage?.fragmentedStorageHealthy === false
                  ? t('settings.vaultStorageError')
                  : securityStatus?.storage?.fragmentedStorage
                  ? t('settings.fragmentedVaultStorage', { count: securityStatus.storage.fragmentCount || 3 })
                  : t('settings.legacyVaultStorage')}
              </span>
            </div>
          </div>
        )}
        {securityStatus?.fallback && (
          <Notice variant="warning" className="mx-4 my-4">
            {t('settings.compatibilityFallbackWarning')}
          </Notice>
        )}
      </div>

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

        {/* Auto-Lock Timeout */}
        <button onClick={() => { hapticTap(); setShowAutoLock(!showAutoLock); setShowClipboard(false); }}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
          <div className="flex min-w-0 items-center gap-3 text-left">
            <Timer size={16} className="text-surface-400" />
            <div className="min-w-0">
              <span className="block text-sm text-white">{t('settings.autoLock')}</span>
              <span className="block truncate text-xs text-surface-500">{t('settings.autoLockSummary', { value: formatAutoLock(currentAutoLockMs) })}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {settingStatus(formatAutoLock(currentAutoLockMs), true)}
            <ChevronDown size={16} className={`text-surface-500 transition-transform ${showAutoLock ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showAutoLock && (
          <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-surface-700/60 bg-surface-900/70 px-3 py-2">
              <span className="text-xs text-surface-400">{t('settings.autoLockCurrent')}</span>
              <span className="text-sm font-semibold text-brand-300">{formatAutoLock(currentAutoLockMs)}</span>
            </div>
            <p className="text-xs leading-relaxed text-surface-400">{t('settings.autoLockDesc')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUTOLOCK_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => saveAutoLock(opt.value)}
                  className={`btn-glow px-4 py-2 text-xs rounded-lg transition-colors ${currentAutoLockMs === opt.value ? 'bg-brand-500/20 text-brand-200 border border-brand-500/50' : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border border-transparent'}`}>
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
          </div>
        )}

        {/* Clipboard Auto-Clear */}
        <button onClick={() => { hapticTap(); setShowClipboard(!showClipboard); setShowAutoLock(false); }}
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
          </div>
        )}

        {/* Secure Display Rendering */}
        <div className="border-b border-surface-700/30">
          <div className="flex items-start justify-between gap-3 p-4">
            <button
              type="button"
              onClick={() => { hapticTap(); setShowSecureDisplay(!showSecureDisplay); }}
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
                onClick={() => { hapticTap(); setShowSecureDisplay(!showSecureDisplay); }}
                className="p-1 text-surface-500"
                aria-label={t('settings.expandDetails')}
              >
                <ChevronDown size={16} className={`transition-transform ${showSecureDisplay ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTap();
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
              onClick={() => { hapticTap(); setShowHardwareBound(!showHardwareBound); }}
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
              <button type="button" onClick={() => { hapticTap(); setShowHardwareBound(!showHardwareBound); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
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
              onClick={() => { hapticTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }}
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
              <button type="button" onClick={() => { hapticTap(); setShowScrambledKeyboard(!showScrambledKeyboard); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
                <ChevronDown size={16} className={`transition-transform ${showScrambledKeyboard ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTap();
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
                        hapticTap();
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
              onClick={() => { hapticTap(); setShowScreenCapture(!showScreenCapture); }}
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
              <button type="button" onClick={() => { hapticTap(); setShowScreenCapture(!showScreenCapture); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
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
              onClick={() => { hapticTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }}
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
              <button type="button" onClick={() => { hapticTap(); setShowMasterPasswordDetails(!showMasterPasswordDetails); }} className="p-1 text-surface-500" aria-label={t('settings.expandDetails')}>
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
                  <button onClick={() => { hapticTap(); setShowMPRemove(true); }} className="btn-glow btn-glow-danger text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg">
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
                  <button onClick={() => { hapticTap(); setShowMPSetup(true); }}
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
      </div>

      {/* ═══ PIN & Kill Switch (only if no biometric) ═══ */}
      {!hasBiometric && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Lock size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">{t('settings.pinLockTitle')}</h3>
                <p className="text-xs text-surface-400">{t('settings.pinLockDesc')}</p>
              </div>
            </div>
          </div>

          {/* Change PIN */}
          <button onClick={() => { hapticTap(); setShowChangePin(!showChangePin); }}
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

          {/* Kill Switch */}
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

          {/* Decoy Vault */}
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

          {/* Shake to Lock */}
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
                  <span>{shakeSensitivity === 10 ? t('settings.high') : shakeSensitivity === 15 ? t('settings.medium') : t('settings.low')}</span>
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
      )}
    </>
  );
}
