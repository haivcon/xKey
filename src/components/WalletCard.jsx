import { useState, useEffect, useRef } from 'react';
import { Wallet, Check, Copy, Eye, EyeOff, ChevronDown, ChevronUp, QrCode, Pencil, Trash2, Save, X, Settings2, Pin, PinOff, FolderInput, FolderPlus } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { hapticTap, hapticSuccess, hapticWarning } from '../utils/haptics';
import { secureCopy } from '../utils/clipboard';
import { useToast } from '../contexts/ToastContext';
import { useMasterPassword } from '../contexts/MasterPasswordContext';
import PasswordInput from './PasswordInput';

const AUTO_HIDE_MS = 30000;

const NETWORK_COLORS = {
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

export { NETWORK_COLORS, NETWORK_KEYS };

export default function WalletCard({ wallet, onShowQR, onDelete, onRename, onEdit, onPin, onMove }) {
  const [expanded, setExpanded] = useState(false);
  const [showPk, setShowPk] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(wallet.name || '');
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [longPressActive, setLongPressActive] = useState(false);
  const pressTimerRef = useRef(null);
  const t = useT();
  const { showToast } = useToast();
  const { hasMasterPassword, verifyMasterPassword } = useMasterPassword();
  const [showMPPrompt, setShowMPPrompt] = useState(null);
  const [mpInput, setMpInput] = useState('');

  // Long-press quick copy address
  const handleTouchStart = () => {
    pressTimerRef.current = setTimeout(() => {
      if (wallet.address) {
        secureCopy(wallet.address);
        hapticSuccess();
        showToast(t('walletCard.addressCopied', { address: wallet.address.substring(0, 10) }), 'success');
        setLongPressActive(true);
      }
    }, 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(pressTimerRef.current);
    if (longPressActive) {
      setLongPressActive(false);
    }
  };

  useEffect(() => { if (!showPk) return; const tm = setTimeout(() => setShowPk(false), AUTO_HIDE_MS); return () => clearTimeout(tm); }, [showPk]);
  useEffect(() => { if (!showSeed) return; const tm = setTimeout(() => setShowSeed(false), AUTO_HIDE_MS); return () => clearTimeout(tm); }, [showSeed]);

  const handleCopy = (text, field) => { secureCopy(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 2000); };
  const formatDate = (ts) => { if (!ts) return null; const d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

  const executeSensitiveAction = (actionType) => {
    if (actionType === 'pk') setShowPk(!showPk);
    else if (actionType === 'seed') setShowSeed(!showSeed);
    else if (actionType === 'qr_pk') onShowQR(wallet.privateKey, t('walletCard.privateKey'), 'WARNING');
    else if (actionType === 'copy_pk') handleCopy(wallet.privateKey, 'pk');
    else if (actionType === 'copy_seed') handleCopy(wallet.seedPhrase, 'seed');
  };

  const handleShowSensitive = async (actionType) => {
    if (actionType === 'pk' && showPk) { setShowPk(false); return; }
    if (actionType === 'seed' && showSeed) { setShowSeed(false); return; }
    
    if (hasMasterPassword) {
      setShowMPPrompt(actionType);
    } else {
      executeSensitiveAction(actionType);
    }
  };

  const submitMP = async () => {
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
      network: wallet.network || 'ETH',
    });
    setEditMode(true);
  };

  const saveEdit = () => {
    hapticSuccess();
    if (onEdit) onEdit(editFields);
    setEditMode(false);
  };

  const cancelEdit = () => { setEditMode(false); };

  const editInput = (key, label, type = 'text', multiline = false) => (
    <div>
      <label className="block text-xs text-surface-400 uppercase tracking-wider mb-1">{label}</label>
      {multiline ? (
        <textarea rows={2} value={editFields[key] || ''} onChange={(e) => setEditFields(p => ({ ...p, [key]: e.target.value }))}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
      ) : (
        <input type={type} value={editFields[key] || ''} onChange={(e) => setEditFields(p => ({ ...p, [key]: e.target.value }))}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
      )}
    </div>
  );

  return (
    <div className="glass-card overflow-hidden border border-surface-700 hover:border-brand-500/30 transition-colors relative">
      <div className="p-4 flex items-center justify-between cursor-pointer bg-surface-800/30 hover:bg-surface-800/50"
        onClick={() => { if (!longPressActive) setExpanded(!expanded); }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
        onMouseDown={handleTouchStart} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0"><Wallet size={20} className="text-brand-400" /></div>
          <div className="min-w-0">
            {renaming ? (
              <input autoFocus className="bg-transparent border-b border-brand-500 text-white text-sm outline-none w-full" value={editName}
                onClick={(e) => e.stopPropagation()} onChange={(e) => setEditName(e.target.value)}
                onBlur={() => { onRename(editName); setRenaming(false); }} onKeyDown={(e) => { if (e.key === 'Enter') { onRename(editName); setRenaming(false); } }} />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium truncate">{wallet.name || t('walletCard.unnamed')}</h3>
                {wallet.pinned && <Pin size={12} className="text-amber-400 flex-shrink-0" />}
                {wallet.network && NETWORK_COLORS[wallet.network] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticTap();
                      const idx = NETWORK_KEYS.indexOf(wallet.network);
                      const next = NETWORK_KEYS[(idx + 1) % NETWORK_KEYS.length];
                      if (onEdit) onEdit({ network: next });
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 transition-all hover:scale-110 ${NETWORK_COLORS[wallet.network].bg} ${NETWORK_COLORS[wallet.network].text}`}
                    title={t('walletCard.changeNetwork')}
                  >
                    {NETWORK_COLORS[wallet.network].label}
                  </button>
                )}
              </div>
            )}
            <p className="text-surface-400 text-sm font-mono truncate">
              {wallet.address ? `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}` : t('walletCard.noAddress')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wallet.balance && parseFloat(wallet.balance) > 0 && (
            <div className="text-right"><p className="text-white font-semibold">${wallet.balance}</p><p className="text-xs text-surface-400">{t('walletCard.balanceLabel')}</p></div>
          )}
          {expanded ? <ChevronUp size={20} className="text-surface-500" /> : <ChevronDown size={20} className="text-surface-500" />}
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
              {editInput('privateKey', t('walletCard.privateKey'), 'password')}
              {editInput('seedPhrase', t('walletCard.seedPhrase'), 'text', true)}
              {editInput('balance', t('createWallet.balance'), 'number')}
              {editInput('notes', t('walletCard.notes'), 'text', true)}
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
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border
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
                <button onClick={saveEdit}
                  className="btn-glow btn-glow-success flex-1 flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  <Save size={14} /> {t('walletCard.saveChanges')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { hapticTap(); onPin && onPin(); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-amber-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors">{wallet.pinned ? <PinOff size={12} /> : <Pin size={12} />} {wallet.pinned ? t('walletCard.unpin') : t('walletCard.pin')}</button>
                <button onClick={() => { hapticTap(); setRenaming(true); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-brand-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><Pencil size={12} /> {t('walletCard.rename')}</button>
                <button onClick={() => { hapticTap(); enterEditMode(); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-cyan-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><Settings2 size={12} /> {t('walletCard.edit')}</button>
                {onMove && <button onClick={() => { hapticTap(); onMove(wallet); }} className="btn-glow flex items-center gap-1 text-xs text-surface-400 hover:text-emerald-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><FolderInput size={12} /> Move</button>}
                <button onClick={() => { hapticWarning(); onDelete(); }} className="btn-glow btn-glow-danger flex items-center gap-1 text-xs text-surface-400 hover:text-red-400 bg-surface-800 px-3 py-1.5 rounded-lg transition-colors"><Trash2 size={12} /> {t('walletCard.delete')}</button>
              </div>

              {wallet.createdAt && <div className="text-xs text-surface-500">{t('walletCard.added')}: {formatDate(wallet.createdAt)}</div>}

              {wallet.address && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 block">{t('walletCard.address')}</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-surface-800 text-brand-300 p-2 rounded text-sm break-all">{wallet.address}</code>
                    <button onClick={() => onShowQR(wallet.address, t('walletCard.address'), wallet.name)} className="p-2 bg-surface-800 hover:bg-brand-500/20 text-brand-400 rounded transition-colors"><QrCode size={18} /></button>
                    <button onClick={() => handleCopy(wallet.address, 'address')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">
                      {copiedField === 'address' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {wallet.privateKey && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    {t('walletCard.privateKey')}
                    {showPk && <span className="text-yellow-500/70 text-[10px] normal-case">{t('walletCard.autoHide')}</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-surface-800 text-surface-200 p-2 rounded text-sm break-all font-mono">
                      {showPk ? wallet.privateKey : '•'.repeat(Math.min(wallet.privateKey.length, 64))}
                    </code>
                    <button onClick={() => handleShowSensitive('pk')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">{showPk ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    <button onClick={() => handleShowSensitive('qr_pk')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"><QrCode size={18} /></button>
                    <button onClick={() => handleShowSensitive('copy_pk')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors">
                      {copiedField === 'pk' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-red-400/60 mt-1">{t('walletCard.pkWarning')}</p>
                </div>
              )}

              {wallet.seedPhrase && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    {t('walletCard.seedPhrase')}
                    {showSeed && <span className="text-yellow-500/70 text-[10px] normal-case">{t('walletCard.autoHide')}</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-surface-800 text-surface-200 p-2 rounded text-sm break-words leading-relaxed">
                      {showSeed ? wallet.seedPhrase : '• '.repeat(wallet.seedPhrase.split(' ').length)}
                    </code>
                    <button onClick={() => handleShowSensitive('seed')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors h-fit self-start">{showSeed ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    <button onClick={() => handleShowSensitive('copy_seed')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded transition-colors h-fit self-start">
                      {copiedField === 'seed' ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {wallet.notes && (
                <div>
                  <label className="text-xs text-surface-400 uppercase tracking-wider mb-1 block">{t('walletCard.notes')}</label>
                  <p className="text-sm text-surface-300 bg-surface-800 p-2 rounded">{wallet.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showMPPrompt && (
        <div className="absolute inset-0 z-10 bg-surface-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-xl">
          <p className="text-sm font-medium text-white mb-3">{t('walletCard.masterPasswordRequired') || 'Master Password Required'}</p>
          <div className="flex gap-2 w-full max-w-[280px]">
            <PasswordInput autoFocus value={mpInput} onChange={e=>setMpInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitMP()} 
              placeholder="Password" wrapperClassName="flex-1"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
            <button onClick={submitMP} className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">OK</button>
            <button onClick={()=>{setShowMPPrompt(null); setMpInput('');}} className="bg-surface-700 hover:bg-surface-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"><X size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
