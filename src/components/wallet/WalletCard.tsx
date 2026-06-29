import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { Wallet as WalletIcon, Check, Copy, Eye, EyeOff, ChevronDown, ChevronUp, QrCode, Pencil, Trash2, Save, X, Settings2, Pin, PinOff, FolderInput, FolderPlus, Square, CheckSquare, Coins, ShieldCheck, MoreHorizontal, Sparkles } from 'lucide-react';
import { useLanguage, useT } from '../../contexts/LanguageContext';
import { hapticTap, hapticSuccess, hapticWarning } from '../../utils/haptics';
import MarkdownRenderer from '../shared/MarkdownRenderer';
import { secureCopy } from '../../utils/clipboard';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useMasterPassword } from '../../contexts/MasterPasswordContext';
import PasswordInput from '../shared/PasswordInput';
import SecureTextarea from '../shared/SecureTextarea';
import SecureGlyphText from '../shared/SecureGlyphText';
import { TagBadge, TagEditor } from '../TagSystem';
import { formatAmountInput, formatAssetValue, formatCompactAmount, normalizeAmountInput, parseAmount } from '../../utils/amountFormat';
import { useSecureDisplay } from '../../contexts/SecureDisplayContext';
import { appendAuditLog } from '../../utils/auditLog';
import { formatKeyAge, getWalletHealth } from '../../utils/keyHealth';
import type { NetworkColor, Wallet } from '../../types';
import { XKEY_SLOGAN } from '../../utils/branding';
import { MiddleEllipsisAddress } from '../create-wallet/components';
import { createVanityAddressRenderer } from '../../hooks/vanity/vanityRenderHelpers';
import VanityScoreBadge from '../vanity/VanityScoreBadge';
import { shouldShowVanityScore } from '../../utils/vanity/vanityScoreGrade';
import type { SecretKind } from '../../utils/dataSensitivity';
import { detectSecretInText, getSecretPlacementWarning } from '../../utils/secretDetection';
import { SECRET_COPIED_EVENT, SECRET_REVEALED_EVENT } from '../../hooks/security/useAutoLock';

const AUTO_HIDE_MS = 30000;

const NETWORK_COLORS: Record<string, NetworkColor> = {
  ETH: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'ETH' },
  BSC: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'BSC' },
  Polygon: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'MATIC' },
  Arbitrum: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'ARB' },
  Optimism: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'OP' },
  Solana: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'SOL' },
  Tron: { bg: 'bg-red-600/15', text: 'text-red-300', label: 'TRX' },
  Base: { bg: 'bg-blue-600/15', text: 'text-blue-300', label: 'BASE' },
  XLAYER: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'XLAYER' },
};

const NETWORK_KEYS = Object.keys(NETWORK_COLORS);

const notifySecretRevealed = (kind: 'privateKey' | 'seedPhrase' | 'sensitiveNote') => {
  window.dispatchEvent(new CustomEvent(SECRET_REVEALED_EVENT, { detail: { kind } }));
};

const notifySecretCopied = (kind: 'privateKey' | 'seedPhrase' | 'sensitiveNote') => {
  window.dispatchEvent(new CustomEvent(SECRET_COPIED_EVENT, { detail: { kind } }));
};

export { NETWORK_COLORS, NETWORK_KEYS };

type WalletCardModel = Wallet & { newUntil?: number };
type WalletDensity = 'comfortable' | 'compact' | 'ultra';
type SensitiveAction = 'pk' | 'seed' | 'qr_pk' | 'copy_pk' | 'copy_seed' | 'sensitive_note' | 'copy_sensitive_note';
type CopyOptions = { revealAddress?: boolean; kind?: SecretKind };
type EditFields = Partial<Wallet> & { tags?: string[] };

type WalletCardProps = {
  wallet: WalletCardModel;
  onShowQR: (data: string, title: string, subtitle?: string) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onEdit?: (updatedFields: Partial<Wallet>) => void;
  onPin?: () => void;
  onMove?: (wallet: WalletCardModel) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  assetUnit?: string;
  density?: WalletDensity;
};

export default function WalletCard({ wallet, onShowQR, onDelete, onRename, onEdit, onPin, onMove, selectionMode = false, isSelected = false, onToggleSelect, assetUnit, density = 'comfortable' }: WalletCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPk, setShowPk] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [showSensitiveNotes, setShowSensitiveNotes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(wallet.name || '');
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({});
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [holdReveal, setHoldReveal] = useState<'pk' | 'seed' | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const fullAddressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useT();
  const { showToast } = useToast();
  const { brandReminders, showWalletScores, privacyMode, compactBalance } = useTheme();
  const { hasMasterPassword, verifyMasterPassword } = useMasterPassword();
  const secureDisplay = useSecureDisplay();
  const [showMPPrompt, setShowMPPrompt] = useState<SensitiveAction | null>(null);
  const [mpInput, setMpInput] = useState('');
  const isCompact = density === 'compact';
  const isUltraCompact = density === 'ultra';
  const cardPadding = isUltraCompact ? 'p-2.5' : isCompact ? 'p-3' : 'p-4';
  const cardMinHeight = '';
  const scoreBadgeCompact = isCompact || isUltraCompact;
  const standardBadgeClass = `${isUltraCompact ? 'text-[0.5rem] px-1.5 py-px' : 'text-[0.55rem] px-1.5 py-[0.0625rem]'} inline-flex items-center gap-1 rounded-full border border-surface-500/25 bg-surface-700/25 font-black uppercase leading-none tracking-wide text-surface-400/80`;
  const rowGap = isUltraCompact ? 'gap-2' : 'gap-3';
  const iconBox = isUltraCompact ? 'w-8 h-8' : isCompact ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = isUltraCompact ? 16 : isCompact ? 18 : 20;
  const titleClass = isUltraCompact ? 'text-sm' : 'text-base';
  const addressClass = isUltraCompact ? 'text-[0.72rem]' : isCompact ? 'text-[0.8rem]' : 'text-sm';
  const actionButtonClass = isUltraCompact ? 'p-1.5' : 'p-2';
  const actionIconSize = isUltraCompact ? 16 : 18;
  const isNewWallet = !!wallet.newUntil && wallet.newUntil > nowTick;
  const keyHealth = getWalletHealth(wallet, nowTick);
  const showVanityScore = !selectionMode && shouldShowVanityScore(wallet, showWalletScores);

  useEffect(() => { if (!showPk) return; const tm = setTimeout(() => setShowPk(false), AUTO_HIDE_MS); return () => clearTimeout(tm); }, [showPk]);
  useEffect(() => { if (!showSeed) return; const tm = setTimeout(() => setShowSeed(false), AUTO_HIDE_MS); return () => clearTimeout(tm); }, [showSeed]);
  useEffect(() => { if (!showSensitiveNotes) return; const tm = setTimeout(() => setShowSensitiveNotes(false), AUTO_HIDE_MS); return () => clearTimeout(tm); }, [showSensitiveNotes]);
  useEffect(() => {
    if (!wallet.newUntil || wallet.newUntil <= Date.now()) return undefined;
    const timeout = window.setTimeout(() => setNowTick(Date.now()), Math.min(wallet.newUntil - Date.now() + 1000, 24 * 60 * 60 * 1000));
    return () => window.clearTimeout(timeout);
  }, [wallet.newUntil]);
  useEffect(() => () => {
    if (fullAddressTimerRef.current) clearTimeout(fullAddressTimerRef.current);
  }, []);

  const revealFullAddress = () => {
    if (fullAddressTimerRef.current) clearTimeout(fullAddressTimerRef.current);
    setShowFullAddress(true);
    fullAddressTimerRef.current = setTimeout(() => setShowFullAddress(false), 10000);
  };

  const handleCopy = async (text: string | undefined, field: string, label: string, options: CopyOptions = {}) => {
    if (!text) {
      hapticWarning();
      showToast(t('walletCard.copyEmpty'), 'warning');
      return;
    }

    let copyBlocked = false;
    const copied = await secureCopy(text, {
      kind: options.kind || (field === 'address' || field === 'address-card' ? 'address' : field === 'pk' ? 'privateKey' : field === 'seed' ? 'mnemonic' : 'generic'),
      onBlocked: () => {
        copyBlocked = true;
        hapticWarning();
        showToast(t('walletCard.secretCopyDisabled'), 'warning');
      },
      onClear: () => showToast(t('walletCard.clipboardClearedMultiStep'), 'info'),
    });
    if (!copied) {
      hapticWarning();
      if (!copyBlocked) showToast(t('walletCard.copyFailed'), 'error');
      return;
    }

    setCopiedField(field);
    hapticSuccess();
    setTimeout(() => setCopiedField(null), 2000);

    const walletName = wallet.name || t('walletCard.unnamed');
    if (options.revealAddress) {
      appendAuditLog('wallet.address_copied', { wallet: walletName }).catch(() => {});
      revealFullAddress();
      showToast(t('walletCard.addressCopiedFull', { wallet: walletName, address: text }), 'success');
      return;
    }

    if (field === 'pk' || field === 'seed') {
      appendAuditLog('wallet.secret_copied', { wallet: walletName, field }).catch(() => {});
      notifySecretCopied(field === 'pk' ? 'privateKey' : 'seedPhrase');
      showToast(`${brandReminders ? `${XKEY_SLOGAN}\n` : ''}${t('walletCard.secretCopiedSafety', { field: label, wallet: walletName })}`, 'warning');
      return;
    }
    if (field === 'sensitive-note') {
      appendAuditLog('wallet.secret_copied', { wallet: walletName, field: 'sensitiveNote' }).catch(() => {});
      notifySecretCopied('sensitiveNote');
      showToast(`${brandReminders ? `${XKEY_SLOGAN}\n` : ''}${t('walletCard.secretCopiedSafety', { field: label, wallet: walletName })}`, 'warning');
      return;
    }
    showToast(t('walletCard.fieldCopied', { field: label, wallet: walletName }), 'success');
  };
  const formatDate = (ts?: number) => { if (!ts) return null; const d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

  const executeSensitiveAction = (actionType: SensitiveAction) => {
    if (actionType === 'pk') {
      appendAuditLog('wallet.secret_revealed', { wallet: wallet.name || t('walletCard.unnamed'), field: 'privateKey' }).catch(() => {});
      if (!showPk) notifySecretRevealed('privateKey');
      setShowPk(!showPk);
    }
    else if (actionType === 'seed') {
      appendAuditLog('wallet.secret_revealed', { wallet: wallet.name || t('walletCard.unnamed'), field: 'seedPhrase' }).catch(() => {});
      if (!showSeed) notifySecretRevealed('seedPhrase');
      setShowSeed(!showSeed);
    }
    else if (actionType === 'qr_pk') {
      appendAuditLog('wallet.secret_qr_opened', { wallet: wallet.name || t('walletCard.unnamed'), field: 'privateKey' }).catch(() => {});
      onShowQR(wallet.privateKey || '', t('walletCard.privateKey'), 'WARNING');
    }
    else if (actionType === 'copy_pk') handleCopy(wallet.privateKey, 'pk', t('walletCard.privateKey'));
    else if (actionType === 'copy_seed') handleCopy(wallet.seedPhrase, 'seed', t('walletCard.seedPhrase'));
    else if (actionType === 'sensitive_note') {
      appendAuditLog('wallet.sensitive_note_revealed', { wallet: wallet.name || t('walletCard.unnamed') }).catch(() => {});
      if (!showSensitiveNotes) notifySecretRevealed('sensitiveNote');
      setShowSensitiveNotes(!showSensitiveNotes);
    }
    else if (actionType === 'copy_sensitive_note') handleCopy(wallet.sensitiveNotes, 'sensitive-note', t('walletCard.sensitiveNote'), { kind: 'sensitiveNote' });
  };

  const handleShowSensitive = async (actionType: SensitiveAction) => {
    if (actionType === 'pk' && showPk) { setShowPk(false); return; }
    if (actionType === 'seed' && showSeed) { setShowSeed(false); return; }
    if (actionType === 'sensitive_note' && showSensitiveNotes) { setShowSensitiveNotes(false); return; }
    
    if (hasMasterPassword) {
      setShowMPPrompt(actionType);
    } else {
      executeSensitiveAction(actionType);
    }
  };

  const submitMP = async () => {
    if (!showMPPrompt) return;
    const ok = await verifyMasterPassword(mpInput);
    if (ok) {
      executeSensitiveAction(showMPPrompt);
      setShowMPPrompt(null);
      setMpInput('');
    } else {
      showToast(t('walletCard.masterPasswordWrong') || 'Wrong master password', 'error');
    }
  };

  const enterEditMode = () => {
    setEditFields({
      name: wallet.name || '',
      address: wallet.address || '',
      privateKey: wallet.privateKey || '',
      seedPhrase: wallet.seedPhrase || '',
      balance: wallet.balance || '',
      notes: wallet.notes || '',
      sensitiveNotes: wallet.sensitiveNotes || '',
      network: wallet.network || 'ETH',
      tags: wallet.tags || [],
    });
    setEditMode(true);
  };

  const moveMisplacedSecretFromNotes = () => {
    const notes = editFields.notes || '';
    const detected = detectSecretInText(notes);
    if (!detected) return;

    setEditFields(p => ({
      ...p,
      notes: '',
      privateKey: detected === 'privateKey' ? notes.trim() : p.privateKey,
      seedPhrase: detected === 'mnemonic' ? notes.trim() : p.seedPhrase,
    }));
    hapticSuccess();
    showToast(t('walletCard.secretMovedToSecretField'), 'success');
  };

  const moveNotesToSensitiveNotes = () => {
    const notes = (editFields.notes || '').trim();
    if (!notes) return;

    setEditFields(p => ({
      ...p,
      notes: '',
      sensitiveNotes: [p.sensitiveNotes, notes].filter(Boolean).join('\n\n'),
    }));
    hapticSuccess();
    showToast(t('walletCard.notesMovedToSensitiveNote'), 'success');
  };

  const saveEdit = () => {
    const nameWarning = getSecretPlacementWarning(editFields.name || '', 'name');
    const notesWarning = getSecretPlacementWarning(editFields.notes || '', 'notes');
    if (nameWarning || notesWarning) {
      hapticWarning();
      showToast(`${nameWarning || notesWarning} ${t('walletCard.moveItBeforeSaving')}`, 'warning');
      return;
    }
    hapticSuccess();
    if (onEdit) onEdit({ ...editFields, balance: normalizeAmountInput(editFields.balance || '') });
    setEditMode(false);
  };

  const cancelEdit = () => {
    hapticTap();
    setEditFields({});
    setEditMode(false);
  };

  const visibleTags = (wallet.tags || []).filter(tag => tag !== 'extra-vanity');

  const displayAddress = wallet.address || t('walletCard.noAddress');
  const { renderVanityExtraAddress } = createVanityAddressRenderer('', '');
  const vanityAddressNode = wallet.address && wallet.vanityMatchType
    ? renderVanityExtraAddress(wallet.address, wallet, true, {
      head: isUltraCompact ? 12 : 16,
      tail: isUltraCompact ? 10 : 14,
      minHead: isUltraCompact ? 5 : 6,
      minTail: isUltraCompact ? 5 : 6,
    })
    : null;

  const editInput = (key: keyof EditFields, label: string, type = 'text', multiline = false) => (
    <div>
      <label className="block text-xs text-surface-400 uppercase tracking-wider mb-1">{label}</label>
      {multiline ? (
        <SecureTextarea rows={4} value={String(editFields[key] || '')} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditFields(p => ({ ...p, [key]: e.target.value }))}
          placeholder={key === 'notes' ? '**bold**, *italic*, `code`, - lists' : ''}
          secureLabel={label}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none font-mono" />
      ) : (
        <input type={type} value={String(editFields[key] || '')} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditFields(p => ({ ...p, [key]: e.target.value }))}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
      )}
    </div>
  );

  const editBalanceInput = () => (
    <div>
      <label className="block text-xs text-surface-400 uppercase tracking-wider mb-1">{t('createWallet.balance')}</label>
      <div className="flex items-center overflow-hidden rounded-lg border border-surface-700 bg-surface-800 focus-within:border-brand-500">
        <span className="flex-shrink-0 pl-3 pr-2 text-sm font-semibold text-surface-400">{assetUnit || '$'}</span>
        <input
          type="text"
          inputMode="decimal"
          value={formatAmountInput(editFields.balance || '')}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditFields(p => ({ ...p, balance: normalizeAmountInput(e.target.value) }))}
          className="min-w-0 flex-1 appearance-none rounded-r-lg bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-surface-600"
        />
      </div>
    </div>
  );

  const { lang } = useLanguage();
  const formattedBalance = compactBalance ? formatCompactAmount(wallet.balance, assetUnit, lang) : formatAssetValue(wallet.balance, assetUnit);
  const displayAddressText = privacyMode ? '••••••••••••••••' : displayAddress;
  const balanceParts = formattedBalance.match(/^(.*?)([.,]\d+)?$/);
  const balanceMain = balanceParts?.[1] || formattedBalance;
  const balanceFraction = balanceParts?.[2] || '';
  const showPkValue = showPk || holdReveal === 'pk';
  const showSeedValue = showSeed || holdReveal === 'seed';
  const handleHoldRevealStart = (field: 'pk' | 'seed') => {
    hapticTap();
    setHoldReveal(field);
  };
  const handleHoldRevealEnd = () => setHoldReveal(null);
  const runMoreAction = (action: () => void) => {
    setMoreMenuOpen(false);
    hapticTap();
    action();
  };
  const handleSwipePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (selectionMode || expanded || editMode || renaming || event.pointerType === 'mouse') return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, active: true };
  };
  const handleSwipePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start?.active) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeStartRef.current = null;
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }
    if (Math.abs(dx) > 8) {
      setIsSwiping(true);
      setSwipeOffset(Math.max(-96, Math.min(96, dx)));
    }
  };
  const finishSwipe = () => {
    const offset = swipeOffset;
    swipeStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
    if (Math.abs(offset) > 8) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => { suppressNextClickRef.current = false; }, 180);
    }
    if (offset > 64 && onPin) {
      hapticTap();
      onPin();
    } else if (offset < -64) {
      hapticWarning();
      onDelete();
    }
  };

  return (
    <div
      className={`wallet-swipe-shell ${isSwiping ? 'is-swiping' : ''} glass-card isolate overflow-hidden border transition-colors duration-150 relative ${cardMinHeight} ${isNewWallet ? 'wallet-new-card' : ''} ${
      isSelected
        ? 'border-brand-500 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-brand-500/5'
        : isNewWallet
          ? 'border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_0_28px_rgba(52,211,153,0.22)] bg-emerald-500/5'
          : 'border-surface-700 hover:border-brand-500/30'
    }`}
      style={{ transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined }}
      onPointerDown={handleSwipePointerDown}
      onPointerMove={handleSwipePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      <div className="wallet-swipe-actions" aria-hidden="true">
        <span className="wallet-swipe-action wallet-swipe-action-pin">
          {wallet.pinned ? <PinOff size={14} /> : <Pin size={14} />} {wallet.pinned ? t('walletCard.unpin') : t('walletCard.pin')}
        </span>
        <span className="wallet-swipe-action wallet-swipe-action-delete">
          <Trash2 size={14} /> {t('walletCard.delete')}
        </span>
      </div>
      <div className={`${cardPadding} flex items-center justify-between cursor-pointer bg-surface-800/30 hover:bg-surface-800/50`}
        onClick={() => {
          if (suppressNextClickRef.current) return;
          if (selectionMode) {
              onToggleSelect?.();
          } else {
            setExpanded(!expanded);
          }
        }}>
        <div className={`flex min-w-0 flex-1 items-center ${rowGap} overflow-hidden`}>
          <div
            className={`${iconBox} rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              selectionMode
                ? isSelected
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-700 text-surface-400'
                : 'bg-brand-500/10 text-brand-400'
            }`}
          >
            {selectionMode ? (
              isSelected ? <CheckSquare size={iconSize} /> : <Square size={iconSize} />
            ) : (
              <WalletIcon size={iconSize} />
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            {renaming ? (
              <input className="bg-transparent border-b border-brand-500 text-white text-sm outline-none w-full" value={editName}
                onClick={(e) => e.stopPropagation()} onChange={(e) => setEditName(e.target.value)}
                onBlur={() => { onRename(editName); setRenaming(false); }} onKeyDown={(e) => { if (e.key === 'Enter') { onRename(editName); setRenaming(false); } }} />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className={`min-w-0 text-white font-medium truncate ${titleClass} ${privacyMode ? 'privacy-mask-text' : ''}`}>{privacyMode ? '••••••' : (wallet.name || t('walletCard.unnamed'))}</h3>
                {wallet.pinned && <Pin size={12} className="text-amber-400 flex-shrink-0" />}
                {wallet.network && NETWORK_COLORS[wallet.network] && (
                  <button
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      hapticTap();
                      const idx = NETWORK_KEYS.indexOf(wallet.network || '');
                      const next = NETWORK_KEYS[(idx + 1) % NETWORK_KEYS.length];
                      if (onEdit) onEdit({ network: next });
                    }}
                    className={`${isUltraCompact ? 'text-[0.55rem] px-1.5 py-px' : 'text-[0.625rem] px-[0.375rem] py-[0.125rem]'} rounded-full font-medium flex-shrink-0 transition-all hover:scale-110 ${NETWORK_COLORS[wallet.network].bg} ${NETWORK_COLORS[wallet.network].text}`}
                    title={t('walletCard.changeNetwork')}
                  >
                    {NETWORK_COLORS[wallet.network].label}
                  </button>
                )}
                {!selectionMode && showWalletScores && (
                  showVanityScore ? (
                    <span className="flex-shrink-0">
                      <VanityScoreBadge wallet={wallet} compact={scoreBadgeCompact} />
                    </span>
                  ) : (
                    <span className={standardBadgeClass} title={t('walletCard.standardBadge')} aria-label={t('walletCard.standardBadge')}>
                      <Sparkles size={scoreBadgeCompact ? 8 : 9} className="opacity-70" />
                      {t('walletCard.standardBadge')}
                    </span>
                  )
                )}
                {isNewWallet && (
                  <span className={`${isUltraCompact ? 'text-[0.5rem] px-1.5 py-px' : 'text-[0.55rem] px-1.5 py-[0.0625rem]'} rounded-full border border-emerald-400/60 bg-emerald-500/12 font-black uppercase leading-none tracking-wide text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.18)]`}>
                    {t('walletCard.new')}
                  </span>
                )}
                {wallet.pqPrepared && (
                  <span className={`${isUltraCompact ? 'text-[0.5rem] px-1.5 py-px' : 'text-[0.55rem] px-1.5 py-[0.0625rem]'} inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 font-black uppercase leading-none text-emerald-300`}>
                    <ShieldCheck size={10} /> PQ
                  </span>
                )}
                {parseAmount(wallet.balance) > 0 && (
                  <span className="wallet-balance-pill ml-auto shrink-0 rounded-full border border-brand-400/20 bg-surface-950/45 px-2.5 py-1 text-white shadow-inner shadow-black/10">
                    <span className="wallet-balance-main">{privacyMode ? '••••••' : balanceMain}</span>
                    {!privacyMode && balanceFraction && <span className="wallet-balance-fraction">{balanceFraction}</span>}
                  </span>
                )}
              </div>
            )}
            <p className={`max-w-full min-w-0 text-surface-400 font-mono ${privacyMode ? 'privacy-mask-text' : ''} ${showFullAddress ? 'text-[clamp(0.5rem,1.9vw,0.875rem)] leading-tight' : addressClass}`}>
              {wallet.address ? (
                showFullAddress || privacyMode || !vanityAddressNode ? (
                  <MiddleEllipsisAddress
                    address={displayAddressText}
                    head={showFullAddress ? 22 : isUltraCompact ? 12 : 16}
                    tail={showFullAddress ? 18 : isUltraCompact ? 10 : 14}
                    minHead={isUltraCompact ? 5 : 6}
                    minTail={isUltraCompact ? 5 : 6}
                  />
                ) : vanityAddressNode
              ) : displayAddressText}
            </p>
            <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
              {wallet.createdAt && (
                <span className={`inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap text-scale-3xs leading-none ${keyHealth.level === 'due' ? 'text-red-300' : keyHealth.level === 'soon' ? 'text-amber-300' : 'text-surface-500'}`}>
                  <span className="shrink-0 opacity-75">{t('keyHealth.age')}:</span>
                  <span className="min-w-0 truncate font-medium">{formatKeyAge(wallet.createdAt, nowTick)}</span>
                </span>
              )}
            </div>
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {visibleTags.slice(0, 3).map(tag => (
                  <TagBadge key={tag} tag={tag} small />
                ))}
                {visibleTags.length > 3 && <span className="text-scale-3xs text-surface-500">+{visibleTags.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
        <div className={`flex flex-shrink-0 items-center ${isUltraCompact ? 'gap-1.5' : 'gap-2'}`}>
          {!selectionMode && wallet.address && (
            <div className="flex items-center gap-1 pr-1.5 sm:pr-2 border-r border-surface-700/70">
              <button
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onShowQR(wallet.address || '', t('walletCard.address'), wallet.name || '');
                }}
                className={`${actionButtonClass} bg-surface-800 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors`}
                aria-label={t('walletCard.showAddressQR')}
                title={t('walletCard.showAddressQR')}
              >
                <QrCode size={actionIconSize} />
              </button>
              <button
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleCopy(wallet.address, 'address-card', t('walletCard.address'), { revealAddress: true });
                }}
                className={`${actionButtonClass} bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg transition-colors`}
                aria-label={t('walletCard.copyAddress')}
                title={t('walletCard.copyAddress')}
              >
                {copiedField === 'address-card' ? <Check size={actionIconSize} className="text-green-400" /> : <Copy size={actionIconSize} />}
              </button>
            </div>
          )}
          {expanded ? <ChevronUp size={iconSize} className="text-surface-500" /> : <ChevronDown size={iconSize} className="text-surface-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-surface-700 bg-surface-900/50 space-y-4">

          {/* ═══ EDIT MODE ═══ */}
          {editMode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 size={14} className="text-brand-400" />
                <span className="text-sm font-medium text-white">{t('walletCard.editWallet')}</span>
              </div>
              {editInput('name', t('createWallet.walletName'))}
              {editInput('address', t('walletCard.address'))}
              {editInput('privateKey', t('walletCard.privateKey'))}
              {editInput('seedPhrase', t('walletCard.seedPhrase'), 'text', true)}
              {editBalanceInput()}
              {editInput('notes', t('walletCard.notes'), 'text', true)}
              {getSecretPlacementWarning(editFields.notes || '', 'notes') && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100">
                  <p>{getSecretPlacementWarning(editFields.notes || '', 'notes')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={moveMisplacedSecretFromNotes}
                      className="rounded bg-yellow-400/20 px-2.5 py-1 font-semibold text-yellow-100 hover:bg-yellow-400/30"
                    >
                      {t('walletCard.moveToSecretField')}
                    </button>
                    <button
                      type="button"
                      onClick={moveNotesToSensitiveNotes}
                      className="rounded bg-red-400/20 px-2.5 py-1 font-semibold text-red-100 hover:bg-red-400/30"
                    >
                      {t('walletCard.moveToSensitiveNote')}
                    </button>
                  </div>
                </div>
              )}
              {editInput('sensitiveNotes', t('walletCard.sensitiveNote'), 'text', true)}
              <TagEditor
                tags={editFields.tags || []}
                onChange={(newTags: string[]) => setEditFields(p => ({ ...p, tags: newTags }))}
              />
              {/* Network Selector */}
              <div>
                <label className="block text-xs text-surface-400 uppercase tracking-wider mb-1">{t('walletCard.network')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {NETWORK_KEYS.map(net => {
                    const nc = NETWORK_COLORS[net];
                    const active = editFields.network === net;
                    return (
                      <button key={net} type="button"
                        onClick={() => setEditFields(p => ({ ...p, network: net }))}
                        className={`min-h-[1.75rem] rounded-full px-2.5 py-1 text-[0.625rem] font-semibold leading-none transition-all border
                          ${active ? `${nc.bg} ${nc.text} border-current scale-105` : 'bg-surface-800 text-surface-500 border-surface-700 hover:border-surface-500'}`}
                      >
                        {nc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {onMove && (
                    <button onClick={() => { hapticTap(); onMove(wallet); }}
                    className="btn-icon-glow flex-1 flex flex-col items-center justify-center gap-1.5 p-3 hover:bg-surface-700/50 rounded-xl transition-colors text-surface-400 hover:text-brand-400">
                    <FolderPlus size={18} />
                    <span className="text-xs font-medium">{t('walletCard.moveBtn')}</span>
                    </button>
                )}
                <button onClick={cancelEdit}
                  className="btn-glow flex-1 flex items-center justify-center gap-1.5 border border-surface-700 bg-surface-800 hover:bg-surface-700 text-surface-100 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  <X size={14} /> {t('walletCard.cancelEdit')}
                </button>
                <button onClick={saveEdit}
                  className="btn-glow btn-glow-success flex-1 flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  <Save size={14} /> {t('walletCard.saveChanges')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => { hapticTap(); onPin && onPin(); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-amber-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors">{wallet.pinned ? <PinOff size={12} /> : <Pin size={12} />} {wallet.pinned ? t('walletCard.unpin') : t('walletCard.pin')}</button>
                <button onClick={() => { hapticTap(); setRenaming(true); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-brand-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><Pencil size={12} /> {t('walletCard.rename')}</button>
                <button onClick={() => { hapticTap(); enterEditMode(); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-emerald-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><Coins size={12} /> {t('walletCard.editBalance')}</button>
                <div className="relative">
                  <button type="button" onClick={() => { hapticTap(); setMoreMenuOpen(v => !v); }} className="btn-icon-glow flex items-center justify-center text-surface-300 hover:text-white bg-surface-800 px-2.5 py-1.5 rounded-lg transition-colors" aria-label="More wallet actions" title="More wallet actions"><MoreHorizontal size={16} /></button>
                  {moreMenuOpen && (
                    <div className="wallet-more-menu absolute left-0 top-full z-20 mt-2 min-w-48 overflow-hidden rounded-xl border border-surface-700 bg-surface-900 p-1.5 shadow-2xl shadow-black/40">
                      <button type="button" onClick={() => runMoreAction(enterEditMode)} className="wallet-more-item text-surface-200 hover:bg-surface-800"><Settings2 size={14} /> {t('walletCard.edit')}</button>
                      {onMove && <button type="button" onClick={() => runMoreAction(() => onMove(wallet))} className="wallet-more-item text-surface-200 hover:bg-surface-800"><FolderInput size={14} /> {t('walletCard.moveBtn')}</button>}
                      <button type="button" onClick={() => { setMoreMenuOpen(false); hapticWarning(); onDelete(); }} className="wallet-more-item text-red-300 hover:bg-red-500/10"><Trash2 size={14} /> {t('walletCard.delete')}</button>
                    </div>
                  )}
                </div>
              </div>

              {wallet.createdAt && <div className="text-xs text-surface-500">{t('walletCard.added')}: {formatDate(wallet.createdAt)}</div>}

              {wallet.address && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 block">{t('walletCard.address')}</label>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 whitespace-nowrap rounded bg-surface-800 p-2 font-mono text-[clamp(0.68rem,2vw,0.875rem)] leading-tight text-brand-300">
                      <MiddleEllipsisAddress address={wallet.address} head={18} tail={16} minHead={6} minTail={6} />
                    </code>
                    <button onClick={() => onShowQR(wallet.address || '', t('walletCard.address'), wallet.name || '')} className="p-2 bg-surface-800 hover:bg-brand-500/20 text-brand-400 rounded transition-colors"><QrCode size={18} /></button>
                    <button
                      onClick={() => handleCopy(wallet.address, 'address', t('walletCard.address'), { revealAddress: true })}
                      className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors"
                      aria-label={t('walletCard.copyAddress')}
                      title={t('walletCard.copyAddress')}
                    >
                      {copiedField === 'address' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {wallet.privateKey && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    {t('walletCard.privateKey')}
                    {showPk && <span className="text-yellow-500/70 text-scale-2xs normal-case">{t('walletCard.autoHide')}</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {showPkValue && secureDisplay.enabled ? (
                      <SecureGlyphText value={wallet.privateKey} className="flex-1 text-sm" />
                    ) : (
                      <code className="flex-1 bg-surface-800 text-surface-200 p-2 rounded text-sm break-all font-mono">
                        {showPkValue ? wallet.privateKey : '•'.repeat(Math.min(wallet.privateKey.length, 64))}
                      </code>
                    )}
                    <button onClick={() => handleShowSensitive('pk')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">{showPk ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    {!showPk && (
                      <button
                        type="button"
                        onPointerDown={() => handleHoldRevealStart('pk')}
                        onPointerUp={handleHoldRevealEnd}
                        onPointerLeave={handleHoldRevealEnd}
                        onPointerCancel={handleHoldRevealEnd}
                        className="hold-reveal-btn px-2.5 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 rounded text-scale-2xs font-bold uppercase tracking-wide transition-colors"
                      >
                        Hold
                      </button>
                    )}
                    <button onClick={() => handleShowSensitive('qr_pk')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"><QrCode size={18} /></button>
                    <button onClick={() => handleShowSensitive('copy_pk')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">
                      {copiedField === 'pk' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-scale-2xs text-red-400/60 mt-1">{t('walletCard.pkWarning')}</p>
                </div>
              )}

              {wallet.seedPhrase && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    {t('walletCard.seedPhrase')}
                    {showSeed && <span className="text-yellow-500/70 text-scale-2xs normal-case">{t('walletCard.autoHide')}</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {showSeedValue && secureDisplay.enabled ? (
                      <SecureGlyphText value={wallet.seedPhrase} className="flex-1 text-sm" multiline />
                    ) : (
                      <code className="flex-1 bg-surface-800 text-surface-200 p-2 rounded text-sm break-words leading-relaxed">
                        {showSeedValue ? wallet.seedPhrase : '• '.repeat(wallet.seedPhrase.split(' ').length)}
                      </code>
                    )}
                    <button onClick={() => handleShowSensitive('seed')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors h-fit self-start">{showSeed ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    {!showSeed && (
                      <button
                        type="button"
                        onPointerDown={() => handleHoldRevealStart('seed')}
                        onPointerUp={handleHoldRevealEnd}
                        onPointerLeave={handleHoldRevealEnd}
                        onPointerCancel={handleHoldRevealEnd}
                        className="hold-reveal-btn h-fit self-start px-2.5 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 rounded text-scale-2xs font-bold uppercase tracking-wide transition-colors"
                      >
                        Hold
                      </button>
                    )}
                    <button onClick={() => handleShowSensitive('copy_seed')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors h-fit self-start">
                      {copiedField === 'seed' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {wallet.notes && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 block">{t('walletCard.notes')}</label>
                  <div className="bg-surface-800 p-3 rounded-lg border border-surface-700/50">
                    <MarkdownRenderer text={wallet.notes} />
                  </div>
                </div>
              )}

              {wallet.sensitiveNotes && (
                <div>
                  <label className="text-xs text-red-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                    {t('walletCard.sensitiveNote')}
                    {showSensitiveNotes && <span className="text-yellow-500/70 text-scale-2xs normal-case">{t('walletCard.autoHide')}</span>}
                  </label>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 bg-surface-800 p-3 rounded-lg border border-red-500/20 text-sm text-surface-200">
                      {showSensitiveNotes ? <MarkdownRenderer text={wallet.sensitiveNotes} /> : <span className="font-mono text-surface-500">{'•'.repeat(Math.min(wallet.sensitiveNotes.length, 96))}</span>}
                    </div>
                    <button onClick={() => handleShowSensitive('sensitive_note')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">{showSensitiveNotes ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    <button onClick={() => handleShowSensitive('copy_sensitive_note')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">
                      {copiedField === 'sensitive-note' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showMPPrompt && (
        <div className="absolute inset-0 z-10 bg-surface-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-xl">
          <p className="text-sm font-medium text-white mb-3">{t('walletCard.masterPasswordRequired')}</p>
          <div className="flex gap-2 w-full max-w-[280px]">
            <PasswordInput value={mpInput} onChange={(e: ChangeEvent<HTMLInputElement>)=>setMpInput(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>)=>e.key==='Enter'&&submitMP()} 
              placeholder={t('settings.currentHiddenPassword')} wrapperClassName="flex-1"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
            <button onClick={submitMP} className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">{t('common.confirm')}</button>
            <button onClick={()=>{setShowMPPrompt(null); setMpInput('');}} className="bg-surface-700 hover:bg-surface-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"><X size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
