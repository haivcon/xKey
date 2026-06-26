import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../contexts/LanguageContext';
import type { Wallet as WalletModel } from '../../../types';
import { Check, ChevronDown, Copy, Info, Plus, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import HDWalletTreeVisualizer from '../../HDWalletTreeVisualizer';
import AdvancedEntropyPanel from '../../entropy/AdvancedEntropyPanel';
import { MATH_THEMES } from '../constants';
import type { BulkResult, FloatingEffect, GeneratedWallet, MathStep } from '../types';

export type GenerateTabProps = {
  t: TranslationFn;
  generating: boolean;
  floatingEffects: FloatingEffect[];
  generateCount: number | string;
  generateProgress: number;
  bulkResult: BulkResult;
  onClose: () => void;
  randomGeneratedWallets: GeneratedWallet[];
  setGenerateCount: Dispatch<SetStateAction<number | string>>;
  seedWordCount: number;
  setSeedWordCount: Dispatch<SetStateAction<number>>;
  mathStepItems: MathStep[];
  expandedStep: number | null;
  setExpandedStep: Dispatch<SetStateAction<number | null>>;
  generateWallet: () => void | Promise<void>;
  walletName: string;
  setWalletName: Dispatch<SetStateAction<string>>;
  handleCopy: (text: string, field: string) => void | Promise<void>;
  copiedField: string | null;
  setGeneratedWallets: Dispatch<SetStateAction<GeneratedWallet[]>>;
};

export type GenerateUtilityTabsProps = {
  tab: string;
  handleSaveHDWallet: (wallet: GeneratedWallet) => void | Promise<void>;
  existingWallets?: WalletModel[];
  t: TranslationFn;
  handleAdvancedEntropyGenerated: (entropy: Uint8Array, seedPhrase: string, address: string) => void;
};

export function GenerateTab(props: GenerateTabProps) {
  const {
    t,
    generating,
    floatingEffects,
    generateCount,
    generateProgress,
    bulkResult,
    onClose,
    randomGeneratedWallets,
    setGenerateCount,
    seedWordCount,
    setSeedWordCount,
    mathStepItems,
    expandedStep,
    setExpandedStep,
    generateWallet,
    walletName,
    setWalletName,
    handleCopy,
    copiedField,
    setGeneratedWallets,
  } = props;

  return (
            <div className="flex flex-col space-y-4">
              {generating ? (
                <div className="text-center py-10 relative">
                  <style>{`
                    @keyframes floatUpFade {
                      0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                      20% { opacity: 1; transform: translateY(0px) scale(1.1); }
                      100% { opacity: 0; transform: translateY(-50px) scale(1); }
                    }
                    .animate-float-up-fade {
                      animation: floatUpFade 1.2s ease-out forwards;
                    }
                  `}</style>

                  <div className="relative h-24 flex items-end justify-center overflow-hidden mb-4">
                    {floatingEffects.map(effect => (
                      <div key={effect.key} className="absolute bottom-0 text-center animate-float-up-fade pointer-events-none">
                        <span className="text-brand-400 font-black text-3xl drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">+{effect.count}</span>
                        <p className="text-[10px] text-brand-300/80 font-mono mt-1 bg-surface-900/80 px-2 py-0.5 rounded-full border border-surface-700/50 shadow-lg">{(effect.address || '').substring(0,8)}...{(effect.address || '').substring(34)}</p>
                      </div>
                    ))}
                    {floatingEffects.length === 0 && (
                      <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center">
                        <RefreshCw size={32} className="text-brand-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkGenerating', { count: generateCount }) || 'Generating Wallets...'}</h3>
                  <div className="w-full bg-surface-800 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: `${(generateProgress / (Number.parseInt(String(generateCount), 10)||1)) * 100}%` }}>
                       <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-surface-400 font-medium">{generateProgress} / {generateCount}</p>
                </div>
              ) : bulkResult ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkSuccess', { count: bulkResult.count }) || `Successfully generated and saved ${bulkResult.count} wallets.`}</h3>
                  <div className="bg-surface-800 rounded-lg p-4 text-left space-y-3 mb-6">
                    <div className="flex justify-between items-center border-b border-surface-700 pb-2">
                      <span className="text-surface-400 text-sm">{t('createWallet.bulkSize') || 'Estimated Data Size'}</span>
                      <span className="text-white font-mono text-sm">{((bulkResult.sizeBytes || 0) / 1024).toFixed(2)} KB</span>
                    </div>
                    {bulkResult.storageInfo && (
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400 text-sm">{t('createWallet.bulkStorage') || 'Available Storage'}</span>
                        <span className="text-white font-mono text-sm">{(((bulkResult.storageInfo.quota || 0) - (bulkResult.storageInfo.usage || 0)) / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>
                  <button onClick={onClose} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg w-full transition-colors">
                    {t('common.close')}
                  </button>
                </div>
              ) : randomGeneratedWallets.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={32} className="text-brand-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{t('createWallet.bulkTitle') || 'Bulk Generate Wallets'}</h3>
                  <p className="text-surface-400 text-sm mb-6">{t('createWallet.generateInfo')}</p>

                  <div className="mb-6 text-left">
                    <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.bulkQuantity') || 'Number of wallets to generate'}</label>
                    <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg overflow-hidden mb-3 focus-within:border-brand-500 transition-colors">
                      <button onClick={() => setGenerateCount(Math.max(1, (Number.parseInt(String(generateCount), 10) || 1) - 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-r border-surface-700 active:bg-surface-600">-</button>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-3 text-white text-center font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => setGenerateCount(Math.min(10000, (Number.parseInt(String(generateCount), 10) || 1) + 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-l border-surface-700 active:bg-surface-600">+</button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[1, 5, 10, 50, 100, 200].map(num => (
                        <button key={num} onClick={() => setGenerateCount(num)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${Number.parseInt(String(generateCount), 10) === num ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 text-left">
                    <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.seedLength')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[12, 24].map(words => (
                        <button
                          key={words}
                          type="button"
                          onClick={() => setSeedWordCount(words)}
                          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                            seedWordCount === words
                              ? 'border-brand-500/50 bg-brand-500/15 text-white'
                              : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600 hover:text-white'
                          }`}
                        >
                          {t(words === 24 ? 'createWallet.mnemonic24' : 'createWallet.mnemonic12')}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-surface-500">{t('createWallet.seedLengthHint')}</p>
                  </div>

                  <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-3 mb-6 text-left">
                    <p className="text-[11px] text-surface-300 leading-relaxed flex items-start gap-1.5 mb-3">
                      <Info size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      {t('createWallet.generateExplain')}
                    </p>

                    {t('createWallet.mathSteps') && Array.isArray(mathStepItems) && (
                      <div className="space-y-2 mt-2">
                        {mathStepItems.map((step, idx) => {
                          const theme = MATH_THEMES[idx % MATH_THEMES.length];
                          const isExpanded = expandedStep === idx;
                          return (
                            <div key={idx} className={`border ${theme.border} ${theme.bg} rounded-lg overflow-hidden transition-all duration-300`}>
                              <button onClick={() => setExpandedStep(isExpanded ? null : idx)} className="w-full px-3 py-2 flex items-center justify-between text-left focus:outline-none">
                                <span className={`text-[11px] font-semibold ${theme.text}`}>{step.title}</span>
                                <ChevronDown size={14} className={`${theme.text} transition-transform ${isExpanded ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
                              </button>
                              {isExpanded && (
                                <div className={`px-3 pb-3 text-[10px] text-surface-300 space-y-2 border-t ${theme.contentBorder} pt-2`}>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{t('createWallet.mathSteps.task')}: </span>
                                    <span className="opacity-90">{step.task}</span>
                                  </div>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{step.type === 'meaning' ? t('createWallet.mathSteps.meaning') : t('createWallet.mathSteps.result')}: </span>
                                    <span className="opacity-90">{step.result}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={generateWallet} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 w-full">
                    <Plus size={18} /> {t('createWallet.bulkGenerateBtn') || 'Generate & Save'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {randomGeneratedWallets.map((w, index) => (
                    <div key={index} className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm shadow-surface-900/5 space-y-4 dark:border-surface-700 dark:bg-surface-800/50 dark:shadow-none">
                      {randomGeneratedWallets.length === 1 ? (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-400">{t('createWallet.walletName')}</label>
                          <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)}
                            className="w-full rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-surface-950 focus:outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white" />
                        </div>
                      ) : (
                        <h4 className="text-sm font-semibold text-surface-950 dark:text-white">{w.name}</h4>
                      )}

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-400">{t('createWallet.address')}</label>
                        <div className="mt-1 flex items-start gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-lg border border-brand-500/15 bg-brand-500/10 px-3 py-2 font-mono text-[12px] font-semibold leading-relaxed text-surface-900 dark:bg-brand-500/15 dark:text-brand-100 sm:text-[13px]">
                            {w.address}
                          </code>
                          <button type="button" onClick={() => handleCopy(w.address || '', `addr_${index}`)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-950 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-white" aria-label={t('common.copy')}>
                            {copiedField === `addr_${index}` ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                        {(w as GeneratedWallet).vanityScore !== undefined && (
                          <span className="mt-1.5 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-200">
                            {t('createWallet.vanityExtraScore', { score: (w as GeneratedWallet).vanityScore })}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-400">{t('createWallet.privateKey')}</label>
                        <div className="flex items-start gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-lg border border-red-500/15 bg-red-500/5 p-3 font-mono text-[12px] leading-relaxed text-red-600 dark:bg-surface-800 dark:text-red-300 sm:text-xs">{w.privateKey}</code>
                          <button onClick={() => handleCopy(w.privateKey || '', `pk_${index}`)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-950 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-white">
                            {copiedField === `pk_${index}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      {w.mnemonic && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-400">
                            {w.mnemonic.split(' ').length >= 24 ? t('createWallet.mnemonic24') : t('createWallet.mnemonic12')}
                          </label>
                          <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {w.mnemonic.split(' ').map((word, i) => (
                                <span key={i} className="rounded border border-surface-200 bg-white px-1 py-1 text-center font-mono text-[10px] text-surface-800 dark:border-surface-700 dark:bg-surface-700 dark:text-surface-200">
                                  <span className="mr-1 text-surface-500">{i + 1}.</span>{word}
                                </span>
                              ))}
                            </div>
                            <button onClick={() => handleCopy(w.mnemonic || '', `mn_${index}`)} className="flex items-center gap-1 text-xs font-semibold text-surface-500 hover:text-brand-500 dark:text-surface-400 dark:hover:text-brand-400">
                              {copiedField === `mn_${index}` ? <><Check size={12} className="text-green-400" /> {t('common.copied')}</> : <><Copy size={12} /> {t('createWallet.copyMnemonic')}</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                    ⚠️ <strong>{t('createWallet.backupWarning')}</strong>
                  </div>

                  <button onClick={() => { setGeneratedWallets([]); setGenerateCount(1); }} className="text-xs text-surface-500 hover:text-brand-400 flex items-center gap-1 mx-auto pb-4">
                    <RefreshCw size={12} /> {t('createWallet.generateAnother')}
                  </button>
                </div>
              )}
            </div>
  );
}

export function GenerateUtilityTabs(props: GenerateUtilityTabsProps) {
  const { tab, handleSaveHDWallet, existingWallets, t, handleAdvancedEntropyGenerated } = props;

  return (
    <>
          {/* ── HD Wallet Explorer Tab ── */}
          {tab === 'hdTree' && (
            <HDWalletTreeVisualizer onSaveWallet={handleSaveHDWallet} existingWallets={existingWallets} />
          )}

          {/* ── Advanced Entropy Tab ── */}
          {tab === 'advancedEntropy' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles size={16} className="text-brand-400" />
                  {t('createWallet.advancedEntropyTitle')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                  {t('createWallet.advancedEntropyInfo')}
                </p>
              </div>
              <AdvancedEntropyPanel onGenerated={handleAdvancedEntropyGenerated} />
            </section>
          )}


    </>
  );
}
