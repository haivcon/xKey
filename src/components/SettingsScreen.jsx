import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, ShieldAlert, ShieldCheck, Sun, Moon, Download, Lock, Globe, Check, ChevronDown, Timer, Clipboard, KeyRound, Monitor, ShieldOff, RefreshCw, Save, QrCode, Heart, Camera, Eye, EyeOff } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { loadWallets, saveWallets } from '../utils/storage';
import { exportPortableBackup } from '../utils/backupUtils';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT, useLanguage } from '../contexts/LanguageContext';
import { useMasterPassword } from '../contexts/MasterPasswordContext';
import { LANGUAGES } from '../locales';
import { AUTOLOCK_KEY } from '../hooks/useAutoLock';
import { CLIPBOARD_TIMEOUT_KEY, CLIPBOARD_OPTIONS } from '../utils/clipboard';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { PIN_HASH_KEY, KILL_SWITCH_KEY } from './PinLockScreen';
import { isBiometricAvailable } from '../utils/storage';
import CryptoJS from 'crypto-js';
import QRTransferModal from './QRTransferModal';
import QRReceiveModal from './QRReceiveModal';
import DonateModal from './DonateModal';
import PasswordInput from './PasswordInput';

const AUTOLOCK_OPTIONS = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
];

const THEME_OPTIONS = [
  { key: 'dark', icon: Moon, label: 'settings.darkMode', color: 'indigo' },
  { key: 'light', icon: Sun, label: 'settings.lightMode', color: 'amber' },
  { key: 'amoled', icon: Monitor, label: 'settings.amoledMode', color: 'slate' },
];

export default function SettingsScreen({ aesKey, onBack, onWipe, onImport }) {
    const [activeTab, setActiveTab] = useState('general');
    const [exporting, setExporting] = useState(false);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');
    const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showAutoLock, setShowAutoLock] = useState(false);
    const [showClipboard, setShowClipboard] = useState(false);
    const [customAutoLock, setCustomAutoLock] = useState('');
    const [customClipboard, setCustomClipboard] = useState('');
    const [currentAutoLock, setCurrentAutoLock] = useState('');
    const [currentClipboard, setCurrentClipboard] = useState('');
    const [showMPSetup, setShowMPSetup] = useState(false);
    const [mpInput, setMpInput] = useState('');
    const [mpConfirm, setMpConfirm] = useState('');
    const [showMPIcon, setShowMPIcon] = useState(false);

    // Change PIN state
    const [showChangePin, setShowChangePin] = useState(false);
    const [pinStep, setPinStep] = useState('current'); // current | new | confirm
    const [pinCurrent, setPinCurrent] = useState('');
    const [pinNew, setPinNew] = useState('');
    const [pinConfirmVal, setPinConfirmVal] = useState('');
    const [pinError, setPinError] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false);

    // Kill Switch state
    const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
    
    // New Features
    const [hasDecoyPin, setHasDecoyPin] = useState(false);
    const [showDecoyPinInput, setShowDecoyPinInput] = useState(false);
    const [decoyPinInput, setDecoyPinInput] = useState('');
    const [shakeToLockEnabled, setShakeToLockEnabled] = useState(false);
    const [shakeSensitivity, setShakeSensitivity] = useState(15);
    const hashPin = (p) => CryptoJS.SHA256(p + 'xkey_pin_salt_v1').toString();

    // Auto-Backup state
    const [autoBackupInterval, setAutoBackupInterval] = useState('off');
    const [showAutoBackup, setShowAutoBackup] = useState(false);
    const [autoBackupPassword, setAutoBackupPassword] = useState('');

    // Is biometric available
    const [hasBiometric, setHasBiometric] = useState(true);

    // QR Transfer
    const [showQRTransfer, setShowQRTransfer] = useState(false);
    const [showQRReceive, setShowQRReceive] = useState(false);
    const [transferWallets, setTransferWallets] = useState([]);
    const [showDonate, setShowDonate] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const { theme, setTheme } = useTheme();
    const { showToast } = useToast();
    const showConfirm = useConfirm();
    const t = useT();
    const { lang, changeLang } = useLanguage();
    const mp = useMasterPassword();

    const currentLang = LANGUAGES.find(l => l.code === lang);

    useEffect(() => {
        import('@capacitor/keyboard').then(({ Keyboard }) => {
            Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
            Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
        }).catch(() => {});
        return () => {
            import('@capacitor/keyboard').then(({ Keyboard }) => {
                Keyboard.removeAllListeners();
            }).catch(() => {});
        };
    }, []);

    useEffect(() => {
        const loadCurrentSettings = async () => {
            const { value: al } = await Preferences.get({ key: AUTOLOCK_KEY });
            if (al) {
                const opt = AUTOLOCK_OPTIONS.find(o => o.value == al);
                setCurrentAutoLock(opt ? opt.label : `${Math.round(al / 60000)} min`);
            } else {
                setCurrentAutoLock('5 min');
            }

            const { value: cb } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
            if (cb) {
                const opt = CLIPBOARD_OPTIONS.find(o => o.value == cb);
                setCurrentClipboard(opt ? opt.label : `${Math.round(cb / 1000)} s`);
            } else {
                setCurrentClipboard('45 s');
            }
        };
        loadCurrentSettings();
    }, []);

    // Load PIN/Kill Switch/Auto-Backup settings
    useEffect(() => {
        (async () => {
            const { value: pinHash } = await Preferences.get({ key: PIN_HASH_KEY });
            setHasPinSet(!!pinHash);
            const { value: ks } = await Preferences.get({ key: KILL_SWITCH_KEY });
            setKillSwitchEnabled(ks === 'true');
            const { value: abInterval } = await Preferences.get({ key: 'xkey_autobackup_interval' });
            if (abInterval) setAutoBackupInterval(abInterval);
            const { value: abPass } = await Preferences.get({ key: 'xkey_autobackup_password' });
            if (abPass) setAutoBackupPassword(abPass);
            const bio = await isBiometricAvailable();
            setHasBiometric(bio);

            const { value: decoyHash } = await Preferences.get({ key: 'xkey_decoy_pin_hash' });
            setHasDecoyPin(!!decoyHash);
            const { value: shakeVal } = await Preferences.get({ key: 'xkey_shake_to_lock' });
            setShakeToLockEnabled(shakeVal === 'true');
            const { value: shakeSens } = await Preferences.get({ key: 'xkey_shake_sensitivity' });
            if (shakeSens) setShakeSensitivity(Number(shakeSens));
        })();
    }, []);

    const handleExportPortable = async () => {
        if (!backupPassword || backupPassword.length < 6) {
            showToast(t('settings.passwordMinError'), 'warning');
            return;
        }
        if (backupPassword !== backupPasswordConfirm) {
            showToast(t('settings.passwordMismatch'), 'error');
            return;
        }
        setExporting(true);
        try {
            const wallets = await loadWallets(aesKey);
            const success = await exportPortableBackup(wallets, null, backupPassword);
            if (!success) showToast(t('settings.exportFailed'), 'error');
            else {
                hapticSuccess();
                showToast(t('settings.exportSuccess'), 'success');
                setShowPasswordInput(false);
                setBackupPassword('');
                setBackupPasswordConfirm('');
            }
        } catch (e) {
            showToast(t('settings.exportError'), 'error');
        }
        setExporting(false);
    };

    const handleWipe = async () => {
        const ok = await showConfirm(t('settings.wipeConfirm'), { danger: true });
        if (!ok) return;
        const { wipeAllData } = await import('../utils/storage');
        await wipeAllData();
        onWipe();
    };

    const saveAutoLock = async (ms) => {
        const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
        if (!ok) return;
        hapticTap();
        await Preferences.set({ key: AUTOLOCK_KEY, value: String(ms) });
        const opt = AUTOLOCK_OPTIONS.find(o => o.value == ms);
        setCurrentAutoLock(opt ? opt.label : `${Math.round(ms / 60000)} min`);
        showToast(t('settings.autoLockSaved'), 'success');
        setShowAutoLock(false);
    };

    const saveClipboard = async (ms) => {
        const ok = await showConfirm(t('settings.changeConfirm', { default: 'Are you sure you want to change this setting?' }));
        if (!ok) return;
        hapticTap();
        await Preferences.set({ key: CLIPBOARD_TIMEOUT_KEY, value: String(ms) });
        const opt = CLIPBOARD_OPTIONS.find(o => o.value == ms);
        setCurrentClipboard(opt ? opt.label : `${Math.round(ms / 1000)} s`);
        showToast(t('settings.clipboardSaved'), 'success');
        setShowClipboard(false);
    };

    const handleSetMP = async () => {
        if (!mpInput || mpInput.length < 6) {
            showToast(t('settings.passwordMinError'), 'warning'); return;
        }
        if (mpInput !== mpConfirm) {
            showToast(t('settings.passwordMismatch'), 'error'); return;
        }
        await mp.setMasterPassword(mpInput);
        hapticSuccess();
        showToast(t('settings.masterPasswordSet'), 'success');
        setShowMPSetup(false); setMpInput(''); setMpConfirm('');
    };

    const handleRemoveMP = async () => {
        const ok = await showConfirm(t('settings.removeMPConfirm'), { danger: false });
        if (!ok) return;
        await mp.removeMasterPassword();
        showToast(t('settings.masterPasswordRemoved'), 'success');
    };



    const handleChangePin = async () => {
        if (pinStep === 'current') {
            const { value: stored } = await Preferences.get({ key: PIN_HASH_KEY });
            if (hashPin(pinCurrent) !== stored) {
                setPinError('Incorrect current PIN');
                return;
            }
            setPinStep('new');
            setPinError('');
        } else if (pinStep === 'new') {
            if (pinNew.length < 6) {
                setPinError('PIN must be 6 digits');
                return;
            }
            setPinStep('confirm');
            setPinError('');
        } else if (pinStep === 'confirm') {
            if (pinConfirmVal !== pinNew) {
                setPinError(t('settings.pinsNotMatch'));
                setPinStep('new');
                setPinNew('');
                setPinConfirmVal('');
                return;
            }
            await Preferences.set({ key: PIN_HASH_KEY, value: hashPin(pinNew) });
            hapticSuccess();
            showToast(t('settings.pinChangedSuccess'), 'success');
            setShowChangePin(false);
            setPinCurrent(''); setPinNew(''); setPinConfirmVal('');
            setPinStep('current');
        }
    };

    const handleToggleKillSwitch = async () => {
        const newVal = !killSwitchEnabled;
        if (newVal) {
            const confirm = await showConfirm(
                t('settings.killSwitchConfirm'),
                { danger: true }
            );
            if (!confirm) return;
        }
        await Preferences.set({ key: KILL_SWITCH_KEY, value: String(newVal) });
        setKillSwitchEnabled(newVal);
        await Preferences.set({ key: KILL_SWITCH_KEY, value: String(newVal) });
        showToast(newVal ? t('settings.killSwitchEnabled') : t('settings.killSwitchDisabled'), newVal ? 'warning' : 'info');
    };

    const handleToggleDecoy = async () => {
        if (hasDecoyPin) {
            const confirmed = await showConfirm(t('settings.decoyRemoveConfirm') || 'Remove Decoy Vault PIN?', t('settings.decoyRemoveWarning') || 'Are you sure you want to disable the Decoy Vault?');
            if (confirmed) {
                await Preferences.remove({ key: 'xkey_decoy_pin_hash' });
                setHasDecoyPin(false);
                showToast(t('settings.decoyRemoved') || 'Decoy Vault disabled', 'info');
            }
        } else {
            setShowDecoyPinInput(!showDecoyPinInput);
        }
    };

    const handleSetDecoyPin = async () => {
        if (decoyPinInput.length !== 6) {
            showToast(t('pinLock.enter6Digits') || 'PIN must be 6 digits', 'error');
            return;
        }
        const { value: mainPinHash } = await Preferences.get({ key: PIN_HASH_KEY });
        if (hashPin(decoyPinInput) === mainPinHash) {
             showToast(t('settings.decoySameAsMain') || 'Decoy PIN must be different from main PIN', 'error');
             return;
        }
        await Preferences.set({ key: 'xkey_decoy_pin_hash', value: hashPin(decoyPinInput) });
        setHasDecoyPin(true);
        setShowDecoyPinInput(false);
        setDecoyPinInput('');
        showToast(t('settings.decoyEnabled') || 'Decoy Vault enabled', 'success');
    };

    const handleToggleShakeToLock = async () => {
        const newVal = !shakeToLockEnabled;
        setShakeToLockEnabled(newVal);
        await Preferences.set({ key: 'xkey_shake_to_lock', value: newVal ? 'true' : 'false' });
    };

    const handleChangeShakeSensitivity = async (e) => {
        const val = Number(e.target.value);
        setShakeSensitivity(val);
        await Preferences.set({ key: 'xkey_shake_sensitivity', value: String(val) });
    };

    const saveAutoBackup = async (interval) => {
        await Preferences.set({ key: 'xkey_autobackup_interval', value: interval });
        setAutoBackupInterval(interval);
        showToast(t('settings.autoBackupSet', { interval: interval }), 'success');
    };

    const saveAutoBackupPassword = async () => {
        if (autoBackupPassword.length < 6) {
            showToast(t('settings.passwordMinError'), 'warning');
            return;
        }
        await Preferences.set({ key: 'xkey_autobackup_password', value: autoBackupPassword });
        hapticSuccess();
        showToast(t('settings.autoBackupPasswordSaved'), 'success');
    };

    return (
        <div className={`min-h-screen bg-surface-900 text-surface-50 p-4 transition-all duration-300 ${isKeyboardVisible ? 'pb-96' : 'pb-10'}`}>
            <header className="flex items-center justify-between mb-8 sticky top-0 bg-surface-900/80 backdrop-blur-md py-4 z-10">
                <button onClick={onBack} className="btn-icon-glow p-2 rounded-full hover:bg-surface-800 transition-colors">
                    <ArrowLeft size={24} className="text-surface-300" />
                </button>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 pr-1">
                    {t('settings.title')}
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-xl mx-auto mb-6">
                <div className="flex bg-surface-800/50 p-1 rounded-xl">
                    <button onClick={() => { hapticTap(); setActiveTab('general'); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'general' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/80'}`}>
                        {t('settings.tabGeneral') || 'Chung'}
                    </button>
                    <button onClick={() => { hapticTap(); setActiveTab('security'); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'security' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/80'}`}>
                        {t('settings.tabSecurity') || 'Bảo mật'}
                    </button>
                    <button onClick={() => { hapticTap(); setActiveTab('data'); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'data' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/80'}`}>
                        {t('settings.tabData') || 'Dữ liệu'}
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto space-y-6">

                {activeTab === 'general' && (
                    <>
                        {/* ═══ Language Picker ═══ */}
                        <div className="glass-card overflow-hidden">
                    <button
                        onClick={() => { hapticTap(); setShowLangPicker(!showLangPicker); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                                <Globe size={20} className="text-brand-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-white font-medium text-sm">{t('settings.language')}</p>
                                <p className="text-xs text-surface-400">{currentLang?.flag} {currentLang?.nativeName}</p>
                            </div>
                        </div>
                        <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${showLangPicker ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showLangPicker ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-4 pb-4 border-t border-surface-700/50">
                            <p className="text-xs text-surface-500 py-3">{t('settings.languageDesc')}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {LANGUAGES.map(l => {
                                    const isActive = lang === l.code;
                                    return (
                                        <button
                                            key={l.code}
                                            onClick={() => { changeLang(l.code); setShowLangPicker(false); }}
                                            className={`relative flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-all duration-150 
                                                ${isActive 
                                                    ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white shadow-lg shadow-brand-500/5' 
                                                    : 'bg-surface-800/60 border-2 border-transparent text-surface-400 hover:bg-surface-700/80 hover:text-white hover:border-surface-600'}`}
                                        >
                                            <span className="text-xl leading-none">{l.flag}</span>
                                            <span className="font-medium truncate w-full text-center">{l.nativeName}</span>
                                            {isActive && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shadow-md">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ Theme Selector — 3-state ═══ */}
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <Moon size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">{t('settings.appearance')}</p>
                            <p className="text-xs text-surface-400">{t(`settings.${theme}Mode`)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {THEME_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const active = theme === opt.key;
                            return (
                                <button key={opt.key} onClick={() => { hapticTap(); setTheme(opt.key); }}
                                    className={`btn-glow flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all
                                        ${active ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white' : 'bg-surface-800/60 border-2 border-transparent text-surface-400 hover:text-white'}`}>
                                    <Icon size={14} />
                                    {t(opt.label)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ Donate ═══ */}
                <div className="bg-gradient-to-br from-brand-600/10 via-fuchsia-500/10 to-surface-800 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <Heart size={20} className="text-white fill-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">{t('donate.title')}</h2>
                                <p className="text-xs text-brand-400">{t('donate.subtitle')}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowDonate(true)}
                            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                        >
                            Donate
                        </button>
                    </div>
                </div>
                </>
                )}

                {activeTab === 'security' && (
                    <>
                        {/* ═══ Security Section ═══ */}
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

                    {/* Auto-Lock Timeout */}
                    <button onClick={() => { hapticTap(); setShowAutoLock(!showAutoLock); setShowClipboard(false); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
                        <div className="flex items-center gap-3">
                            <Timer size={16} className="text-surface-400" />
                            <span className="text-sm text-white">{t('settings.autoLock')}</span>
                        </div>
                        <ChevronDown size={16} className={`text-surface-500 transition-transform ${showAutoLock ? 'rotate-180' : ''}`} />
                    </button>
                    {showAutoLock && (
                        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {AUTOLOCK_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => saveAutoLock(opt.value)}
                                        className="btn-glow px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs rounded-lg transition-colors">
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={customAutoLock} onChange={e => setCustomAutoLock(e.target.value)}
                                    placeholder={t('settings.customMinutes')} min="1"
                                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                                    className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                <button onClick={() => { const m = parseInt(customAutoLock); if (m > 0) saveAutoLock(m * 60000); }}
                                    className="btn-glow bg-brand-600 text-white px-4 py-2 rounded-lg text-xs">{t('common.save')}</button>
                            </div>
                        </div>
                    )}

                    {/* Clipboard Auto-Clear */}
                    <button onClick={() => { hapticTap(); setShowClipboard(!showClipboard); setShowAutoLock(false); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors border-b border-surface-700/30">
                        <div className="flex items-center gap-3">
                            <Clipboard size={16} className="text-surface-400" />
                            <span className="text-sm text-white">{t('settings.clipboardClear')}</span>
                        </div>
                        <ChevronDown size={16} className={`text-surface-500 transition-transform ${showClipboard ? 'rotate-180' : ''}`} />
                    </button>
                    {showClipboard && (
                        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {CLIPBOARD_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => saveClipboard(opt.value)}
                                        className="btn-glow px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs rounded-lg transition-colors">
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={customClipboard} onChange={e => setCustomClipboard(e.target.value)}
                                    placeholder={t('settings.customSeconds')} min="5"
                                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                                    className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                <button onClick={() => { const s = parseInt(customClipboard); if (s >= 5) saveClipboard(s * 1000); }}
                                    className="btn-glow bg-brand-600 text-white px-4 py-2 rounded-lg text-xs">{t('common.save')}</button>
                            </div>
                        </div>
                    )}

                    {/* Master Password */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <KeyRound size={16} className="text-surface-400" />
                                <span className="text-sm text-white">{t('settings.masterPassword')}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${mp.hasMasterPassword ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-surface-500'}`}>
                                {mp.hasMasterPassword ? t('settings.mpEnabled') : t('settings.mpDisabled')}
                            </span>
                        </div>
                        <p className="text-[11px] text-surface-500 mb-3">{t('settings.masterPasswordDesc')}</p>
                        {mp.hasMasterPassword ? (
                            <button onClick={handleRemoveMP} className="btn-glow btn-glow-danger text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg">
                                {t('settings.removeMasterPassword')}
                            </button>
                        ) : (
                            !showMPSetup ? (
                                <button onClick={() => { hapticTap(); setShowMPSetup(true); }}
                                    className="btn-glow text-xs text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 px-4 py-2 rounded-lg">
                                    {t('settings.setMasterPassword')}
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input type={showMPIcon ? "text" : "password"} value={mpInput} onChange={e => setMpInput(e.target.value)} autoFocus
                                            placeholder={t('settings.passwordMin')}
                                            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                        <button onClick={() => setShowMPIcon(!showMPIcon)} className="absolute right-3 top-2.5 text-surface-500 hover:text-white transition-colors">
                                            {showMPIcon ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input type={showMPIcon ? "text" : "password"} value={mpConfirm} onChange={e => setMpConfirm(e.target.value)}
                                            placeholder={t('settings.reenterPassword')}
                                            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                        <button onClick={() => setShowMPIcon(!showMPIcon)} className="absolute right-3 top-2.5 text-surface-500 hover:text-white transition-colors">
                                            {showMPIcon ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setShowMPSetup(false); setMpInput(''); setMpConfirm(''); }}
                                            className="btn-glow flex-1 bg-surface-700 text-surface-300 py-2 rounded-lg text-xs">{t('common.cancel')}</button>
                                        <button onClick={handleSetMP}
                                            className="btn-glow btn-glow-success flex-1 bg-brand-600 text-white py-2 rounded-lg text-xs font-medium">{t('common.save')}</button>
                                    </div>
                                </div>
                            )
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
                                        placeholder={t('settings.currentPin')} maxLength={6} autoFocus
                                        className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                )}
                                {pinStep === 'new' && (
                                    <PasswordInput value={pinNew} onChange={e => setPinNew(e.target.value)}
                                        placeholder={t('settings.newPin')} maxLength={6} autoFocus
                                        className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                )}
                                {pinStep === 'confirm' && (
                                    <PasswordInput value={pinConfirmVal} onChange={e => setPinConfirmVal(e.target.value)}
                                        placeholder={t('settings.confirmNewPin')} maxLength={6} autoFocus
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
                                        <h3 className="text-white font-medium">{t('settings.decoyVaultTitle') || 'Decoy Vault'}</h3>
                                        <p className="text-xs text-surface-400">{t('settings.decoyVaultDesc') || 'Set a fake PIN to open an empty vault'}</p>
                                    </div>
                                </div>
                                <button onClick={handleToggleDecoy} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${hasDecoyPin ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-surface-700 text-white hover:bg-surface-600'}`}>
                                    {hasDecoyPin ? t('settings.removeDecoyPin') || 'Remove' : t('settings.setDecoyPin') || 'Setup'}
                                </button>
                            </div>
                            {showDecoyPinInput && !hasDecoyPin && (
                                <div className="flex items-center gap-2 mt-2 bg-surface-900/50 p-2 rounded-lg">
                                    <PasswordInput 
                                        value={decoyPinInput} 
                                        onChange={(e) => setDecoyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="6-digit PIN" 
                                        maxLength={6} 
                                        wrapperClassName="flex-1"
                                        className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" 
                                    />
                                    <button onClick={handleSetDecoyPin} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors">
                                        {t('settings.save') || 'Save'}
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
                                        <h3 className="text-white font-medium">{t('settings.shakeToLockTitle') || 'Shake to Lock'}</h3>
                                        <p className="text-xs text-surface-400">{t('settings.shakeToLockDesc') || 'Lock app immediately when shaking device'}</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${shakeToLockEnabled ? 'bg-brand-500' : 'bg-surface-700'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${shakeToLockEnabled ? 'translate-x-4' : ''}`} />
                                </div>
                            </button>
                            {shakeToLockEnabled && (
                                <div className="px-4 pb-4">
                                    <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
                                        <span>{t('settings.shakeSensitivity') || 'Sensitivity'}</span>
                                        <span>{shakeSensitivity === 10 ? (t('settings.high') || 'High') : shakeSensitivity === 15 ? (t('settings.medium') || 'Medium') : (t('settings.low') || 'Low')}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="25" 
                                        step="5"
                                        value={shakeSensitivity} 
                                        onChange={handleChangeShakeSensitivity}
                                        className="w-full h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-surface-500 mt-1">
                                        <span>{t('settings.high') || 'High'}</span>
                                        <span>{t('settings.low') || 'Low'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ Danger Zone ═══ */}
                <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ShieldAlert size={20} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-red-400">{t('settings.dangerZone')}</h2>
                            <p className="text-xs text-red-400/70">{t('settings.dangerSubtitle')}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleWipe}
                        className="btn-glow btn-glow-danger w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} />
                        {t('settings.wipeAll')}
                    </button>
                    <p className="text-xs text-surface-500 mt-3 text-center">{t('settings.wipeDesc')}</p>
                </div>
                </>
                )}

                {activeTab === 'data' && (
                    <>
                        {/* ═══ Auto-Backup ═══ */}
                <div className="glass-card overflow-hidden">
                    <button onClick={() => { hapticTap(); setShowAutoBackup(!showAutoBackup); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Save size={20} className="text-violet-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-medium">{t('settings.autoBackupTitle')}</h3>
                                <p className="text-xs text-surface-400">{t('settings.autoBackupStatus', { interval: t(`settings.${autoBackupInterval}`) || autoBackupInterval })}</p>
                            </div>
                        </div>
                        <ChevronDown size={18} className={`text-surface-500 transition-transform ${showAutoBackup ? 'rotate-180' : ''}`} />
                    </button>
                    {showAutoBackup && (
                        <div className="px-4 pb-4 border-t border-surface-700/50 space-y-3 pt-3">
                            <div className="flex gap-2">
                                {['off', 'daily', 'weekly'].map(opt => (
                                    <button key={opt} onClick={() => saveAutoBackup(opt)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${autoBackupInterval === opt ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white' : 'bg-surface-800 border-2 border-transparent text-surface-400 hover:text-white'}`}>
                                        {t(`settings.${opt}`) || opt}
                                    </button>
                                ))}
                            </div>
                            {autoBackupInterval !== 'off' && (
                                <div className="flex gap-2">
                                    <PasswordInput value={autoBackupPassword} onChange={e => setAutoBackupPassword(e.target.value)}
                                        placeholder={t('settings.backupPassword')} wrapperClassName="flex-1"
                                        className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                                    <button onClick={saveAutoBackupPassword}
                                        className="btn-glow bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition-all">{t('common.save')}</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ Vault Backup ═══ */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Download size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{t('settings.backupTitle')}</h2>
                            <p className="text-xs text-surface-400">{t('settings.backupSubtitle')}</p>
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 mb-5 flex gap-2.5">
                        <ShieldCheck size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-surface-300 leading-relaxed">{t('settings.backupInfo')}</p>
                    </div>

                    {!showPasswordInput ? (
                        <button
                            onClick={() => { hapticTap(); setShowPasswordInput(true); }}
                            disabled={exporting}
                            className="btn-glow btn-glow-success w-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Lock size={16} />
                            {t('settings.createBackup')}
                        </button>
                    ) : (
                        <div className="space-y-3 bg-surface-800/50 p-4 rounded-xl border border-surface-700">
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1.5">{t('settings.backupPassword')}</label>
                                <PasswordInput
                                    value={backupPassword} autoFocus
                                    onChange={(e) => setBackupPassword(e.target.value)}
                                    placeholder={t('settings.passwordMin')}
                                    className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1.5">{t('settings.confirmPassword')}</label>
                                <PasswordInput
                                    value={backupPasswordConfirm}
                                    onChange={(e) => setBackupPasswordConfirm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleExportPortable()}
                                    placeholder={t('settings.reenterPassword')}
                                    className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
                                />
                            </div>
                            <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 flex gap-2">
                                <ShieldAlert size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => { setShowPasswordInput(false); setBackupPassword(''); setBackupPasswordConfirm(''); }}
                                    className="btn-glow flex-1 bg-surface-700 hover:bg-surface-600 text-surface-300 py-2.5 rounded-lg text-sm transition-colors">{t('common.cancel')}</button>
                                <button onClick={handleExportPortable} disabled={exporting}
                                    className="btn-glow btn-glow-success flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    {exporting ? t('settings.exporting') : t('settings.exportBackup')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-surface-700/50 flex gap-2">
                        <button onClick={async () => {
                            hapticTap();
                            const w = await loadWallets(aesKey);
                            setTransferWallets(w || []);
                            setShowQRTransfer(true);
                        }}
                            className="btn-glow flex-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                            <QrCode size={16} />
                            {t('settings.qrTransferBtn')}
                        </button>
                        <button onClick={() => {
                            hapticTap();
                            setShowQRReceive(true);
                        }}
                            className="btn-glow flex-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                            <Camera size={16} />
                            {t('settings.qrReceiveBtn') || 'Receive QR'}
                        </button>
                    </div>
                </div>
                </>
                )}
            </div>

            {showQRTransfer && transferWallets.length > 0 && (
                <QRTransferModal
                    wallets={transferWallets}
                    onClose={() => setShowQRTransfer(false)}
                />
            )}

            {showQRReceive && (
                <QRReceiveModal
                    onClose={() => setShowQRReceive(false)}
                    onImport={async (importedWallets) => {
                        setShowQRReceive(false);
                        const current = await loadWallets(aesKey) || [];
                        
                        // Filter duplicates
                        const existingAddrs = new Set(current.map(w => w.address?.toLowerCase()).filter(Boolean));
                        const uniqueNew = importedWallets.filter(w => {
                            if (!w.address) return true;
                            const lower = w.address.toLowerCase();
                            if (existingAddrs.has(lower)) return false;
                            existingAddrs.add(lower);
                            return true;
                        });

                        const skippedCount = importedWallets.length - uniqueNew.length;
                        const finalWallets = [...current, ...uniqueNew];
                        
                        await saveWallets(finalWallets, aesKey);
                        
                        if (typeof onImport === 'function') {
                            onImport(finalWallets);
                        }
                        
                        let msg = t('home.importSuccess', { count: uniqueNew.length, folder: 'QR Transfer' });
                        if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
                        showToast(msg, 'success');
                    }}
                />
            )}

            {showDonate && (
                <DonateModal onClose={() => setShowDonate(false)} />
            )}
        </div>
    );
}
