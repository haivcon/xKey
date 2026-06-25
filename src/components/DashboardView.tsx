import { ArrowLeft, Wallet, TrendingUp, AlertCircle, KeyRound, Link } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { formatAssetValue, parseAmount } from '../utils/amountFormat';
import type { Wallet as WalletType } from '../types';

type DistributionValue = {
    count: number;
    total: number;
};

type DashboardViewProps = {
    wallets: WalletType[];
    onBack: () => void;
    assetUnit?: string;
};

export default function DashboardView({ wallets, onBack, assetUnit = '$' }: DashboardViewProps) {
    const t = useT();

    // Folder distribution
    const folderMap: Record<string, DistributionValue> = {};
    wallets.forEach(w => {
        const g = w.groupId || 'Imported';
        if (!folderMap[g]) folderMap[g] = { count: 0, total: 0 };
        folderMap[g].count++;
        folderMap[g].total += parseAmount(w.balance);
    });
    const folderEntries = Object.entries(folderMap).sort((a, b) => b[1].total - a[1].total);

    // Chain distribution
    const chainMap: Record<string, DistributionValue> = {};
    wallets.forEach(w => {
        const n = w.network || 'ETH';
        if (!chainMap[n]) chainMap[n] = { count: 0, total: 0 };
        chainMap[n].count++;
        chainMap[n].total += parseAmount(w.balance);
    });
    const chainEntries = Object.entries(chainMap).sort((a, b) => b[1].count - a[1].count);

    // Import timeline (last 7 days)
    const now = Date.now();
    const dayMs = 86400000;
    const timelineDays = 7;
    const timeline = Array.from({ length: timelineDays }, (_, i) => {
        const dayStart = now - (timelineDays - 1 - i) * dayMs;
        const dayEnd = dayStart + dayMs;
        const count = wallets.filter(w => typeof w.createdAt === 'number' && w.createdAt >= dayStart && w.createdAt < dayEnd).length;
        const label = new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' });
        return { label, count };
    });
    const maxTimeline = Math.max(...timeline.map(d => d.count), 1);

    const totalBalance = wallets.reduce((s, w) => s + parseAmount(w.balance), 0);
    const activeWallets = wallets.filter(w => parseAmount(w.balance) > 0).length;
    const emptyWallets = wallets.length - activeWallets;
    const walletsWithPK = wallets.filter(w => w.privateKey).length;
    const walletsWithSeed = wallets.filter(w => w.seedPhrase).length;

    // Pie chart colors
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#6366f1', '#14b8a6'];
    const chainColors = ['#3b82f6', '#eab308', '#a855f7', '#38bdf8', '#ef4444', '#22c55e', '#dc2626', '#60a5fa'];

    const buildPie = (entries: [string, DistributionValue][], total: number) => {
        const parts: string[] = [];
        let offset = 0;
        entries.forEach(([, data], i) => {
            const pct = total > 0 ? (data.total / total) * 100 : (100 / entries.length);
            const color = (entries === folderEntries ? colors : chainColors)[i % 8];
            parts.push(`${color} ${offset}% ${offset + pct}%`);
            offset += pct;
        });
        return parts.length > 0 ? `conic-gradient(${parts.join(', ')})` : 'conic-gradient(#374151 0% 100%)';
    };

    return (
        <div className="app-scaled-icons min-h-screen bg-surface-900 text-surface-50 p-4 pb-10">
            <header className="max-w-[140rem] w-full mx-auto flex items-center justify-between mb-6 sticky top-0 bg-surface-900/80 backdrop-blur-md py-4 z-10">
                <button onClick={onBack} className="btn-icon-glow p-2 rounded-full hover:bg-surface-800 transition-colors">
                    <ArrowLeft size={24} className="text-surface-300" />
                </button>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400">
                    {t('dashboard.title')}
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-[140rem] w-full mx-auto space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="glass-card p-4 border border-surface-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet size={16} className="text-brand-400" />
                            <span className="text-xs text-surface-400">{t('dashboard.totalWallets')}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{wallets.length}</p>
                    </div>
                    <div className="glass-card p-4 border border-surface-700">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-green-400" />
                            <span className="text-xs text-surface-400">{t('dashboard.activeBalance')}</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">{activeWallets}</p>
                    </div>
                    <div className="glass-card p-4 border border-surface-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-surface-500" />
                            <span className="text-xs text-surface-400">{t('dashboard.emptyWallets')}</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-400">{emptyWallets}</p>
                    </div>
                    <div className="glass-card p-4 border border-surface-700">
                        <div className="flex items-center gap-2 mb-2">
                            <KeyRound size={16} className="text-cyan-400" />
                            <span className="text-xs text-surface-400">{t('dashboard.withPK')}</span>
                        </div>
                        <p className="text-2xl font-bold text-cyan-400">{walletsWithPK}</p>
                    </div>
                    <div className="glass-card p-4 border border-surface-700 col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Link size={16} className="text-purple-400" />
                            <span className="text-xs text-surface-400">{t('dashboard.withSeed')}</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-400">{walletsWithSeed}</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                {/* Folder Pie Chart */}
                <div className="glass-card p-6 border border-surface-700">
                    <h3 className="text-white font-semibold mb-4">{t('dashboard.distribution')}</h3>
                    <div className="flex items-center gap-6">
                        <div
                            className="w-28 h-28 rounded-full flex-shrink-0"
                            style={{ background: buildPie(folderEntries, totalBalance) }}
                        >
                            <div className="w-full h-full rounded-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center">
                                    <span className="text-xs text-surface-400 font-medium">{folderEntries.length} {t('dashboard.folders')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 overflow-hidden">
                            {folderEntries.map(([name, data], i) => (
                                <div key={name} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                    <span className="text-surface-300 truncate flex-1">{name}</span>
                                    <span className="text-surface-500 text-xs flex-shrink-0">{data.count}w</span>
                                    <span className="text-white font-medium text-xs flex-shrink-0">{formatAssetValue(data.total, assetUnit)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chain Distribution */}
                <div className="glass-card p-6 border border-surface-700">
                    <h3 className="text-white font-semibold mb-4">{t('dashboard.chainDistribution')}</h3>
                    <div className="flex items-center gap-6">
                        <div
                            className="w-28 h-28 rounded-full flex-shrink-0"
                            style={{ background: buildPie(chainEntries, totalBalance) }}
                        >
                            <div className="w-full h-full rounded-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center">
                                    <span className="text-xs text-surface-400 font-medium">{chainEntries.length} {t('dashboard.networks')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 overflow-hidden">
                            {chainEntries.map(([name, data], i) => (
                                <div key={name} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: chainColors[i % chainColors.length] }}></div>
                                    <span className="text-surface-300 truncate flex-1">{name}</span>
                                    <span className="text-surface-500 text-xs flex-shrink-0">{data.count}w</span>
                                    <span className="text-white font-medium text-xs flex-shrink-0">{formatAssetValue(data.total, assetUnit)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                </div>

                <div className="grid xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6">
                {/* Import Timeline */}
                <div className="glass-card p-6 border border-surface-700">
                    <h3 className="text-white font-semibold mb-4">{t('dashboard.importTimeline')}</h3>
                    <div className="flex items-end gap-2 h-32">
                        {timeline.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-surface-500">{day.count || ''}</span>
                                <div className="w-full rounded-t-md bg-brand-500/20 relative overflow-hidden" style={{ height: `${Math.max((day.count / maxTimeline) * 100, 4)}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-500 to-brand-400 opacity-80 rounded-t-md" />
                                </div>
                                <span className="text-[10px] text-surface-500">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                {/* Tag Distribution */}
                {(() => {
                    const tagMap: Record<string, number> = {};
                    wallets.forEach(w => (w.tags || []).forEach(tag => {
                        if (!tagMap[tag]) tagMap[tag] = 0;
                        tagMap[tag]++;
                    }));
                    const tagEntries = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
                    const maxTag = Math.max(...tagEntries.map(e => e[1]), 1);
                    const tagColors = ['#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899', '#3b82f6', '#ef4444', '#14b8a6'];
                    if (tagEntries.length === 0) return null;
                    return (
                        <div className="glass-card p-6 border border-surface-700">
                            <h3 className="text-white font-semibold mb-4">{t('dashboard.tagDistribution') || 'Tag Distribution'}</h3>
                            <div className="space-y-2.5">
                                {tagEntries.slice(0, 10).map(([tag, count], i) => (
                                    <div key={tag} className="flex items-center gap-3">
                                        <span className="text-xs text-surface-400 w-16 truncate text-right">#{tag}</span>
                                        <div className="flex-1 h-5 bg-surface-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(count / maxTag) * 100}%`,
                                                    background: `linear-gradient(90deg, ${tagColors[i % tagColors.length]}88, ${tagColors[i % tagColors.length]})`
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-white font-medium w-8">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Security Score */}
                {(() => {
                    const total = wallets.length || 1;
                    const pkRate = walletsWithPK / total;
                    const seedRate = walletsWithSeed / total;
                    const taggedRate = wallets.filter(w => (w.tags || []).length > 0).length / total;
                    const score = Math.round((pkRate * 40 + seedRate * 40 + taggedRate * 20) * 100);
                    const getColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
                    return (
                        <div className="glass-card p-6 border border-surface-700">
                            <h3 className="text-white font-semibold mb-4">{t('dashboard.securityScore') || 'Vault Health'}</h3>
                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24">
                                    <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(55,65,81)" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#scoreGrad)" strokeWidth="3"
                                            strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                                        <defs>
                                            <linearGradient id="scoreGrad"><stop stopColor={score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'} /><stop offset="1" stopColor={score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'} /></linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-xl font-bold ${getColor(score)}`}>{score}%</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 text-xs">
                                    <div className="flex justify-between"><span className="text-surface-400">{t('dashboard.withPK')}</span><span className="text-white">{Math.round(pkRate * 100)}%</span></div>
                                    <div className="w-full h-1.5 bg-surface-800 rounded-full"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pkRate * 100}%` }} /></div>
                                    <div className="flex justify-between"><span className="text-surface-400">{t('dashboard.withSeed')}</span><span className="text-white">{Math.round(seedRate * 100)}%</span></div>
                                    <div className="w-full h-1.5 bg-surface-800 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${seedRate * 100}%` }} /></div>
                                    <div className="flex justify-between"><span className="text-surface-400">{t('dashboard.tagged') || 'Tagged'}</span><span className="text-white">{Math.round(taggedRate * 100)}%</span></div>
                                    <div className="w-full h-1.5 bg-surface-800 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${taggedRate * 100}%` }} /></div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                </div>
                </div>

                {/* Total */}
                <div className="glass-card p-6 border border-brand-500/20 bg-brand-500/5">
                    <p className="text-surface-400 text-xs uppercase tracking-wider mb-1">{t('dashboard.totalValue')}</p>
                    <p className="text-3xl font-bold text-white">{formatAssetValue(totalBalance, assetUnit)}</p>
                </div>
            </div>
        </div>
    );
}
