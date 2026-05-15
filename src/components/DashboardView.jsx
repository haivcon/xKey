import { ArrowLeft, Wallet, TrendingUp, AlertCircle, FolderOpen, KeyRound, Link } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

export default function DashboardView({ wallets, onBack }) {
    const t = useT();

    // Folder distribution
    const folderMap = {};
    wallets.forEach(w => {
        const g = w.groupId || 'Imported';
        if (!folderMap[g]) folderMap[g] = { count: 0, total: 0 };
        folderMap[g].count++;
        folderMap[g].total += parseFloat(w.balance || 0) || 0;
    });
    const folderEntries = Object.entries(folderMap).sort((a, b) => b[1].total - a[1].total);

    // Chain distribution
    const chainMap = {};
    wallets.forEach(w => {
        const n = w.network || 'ETH';
        if (!chainMap[n]) chainMap[n] = { count: 0, total: 0 };
        chainMap[n].count++;
        chainMap[n].total += parseFloat(w.balance || 0) || 0;
    });
    const chainEntries = Object.entries(chainMap).sort((a, b) => b[1].count - a[1].count);

    // Import timeline (last 7 days)
    const now = Date.now();
    const dayMs = 86400000;
    const timelineDays = 7;
    const timeline = Array.from({ length: timelineDays }, (_, i) => {
        const dayStart = now - (timelineDays - 1 - i) * dayMs;
        const dayEnd = dayStart + dayMs;
        const count = wallets.filter(w => w.createdAt >= dayStart && w.createdAt < dayEnd).length;
        const label = new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' });
        return { label, count };
    });
    const maxTimeline = Math.max(...timeline.map(d => d.count), 1);

    const totalBalance = wallets.reduce((s, w) => s + (parseFloat(w.balance || 0) || 0), 0);
    const activeWallets = wallets.filter(w => (parseFloat(w.balance || 0) || 0) > 0).length;
    const emptyWallets = wallets.length - activeWallets;
    const walletsWithPK = wallets.filter(w => w.privateKey).length;
    const walletsWithSeed = wallets.filter(w => w.seedPhrase).length;

    // Pie chart colors
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#6366f1', '#14b8a6'];
    const chainColors = ['#3b82f6', '#eab308', '#a855f7', '#38bdf8', '#ef4444', '#22c55e', '#dc2626', '#60a5fa'];

    const buildPie = (entries, total) => {
        let parts = [];
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
        <div className="min-h-screen bg-surface-900 text-surface-50 p-4 pb-10">
            <header className="flex items-center justify-between mb-6 sticky top-0 bg-surface-900/80 backdrop-blur-md py-4 z-10">
                <button onClick={onBack} className="btn-icon-glow p-2 rounded-full hover:bg-surface-800 transition-colors">
                    <ArrowLeft size={24} className="text-surface-300" />
                </button>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400">
                    {t('dashboard.title')}
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-xl mx-auto space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
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
                    <div className="glass-card p-4 border border-surface-700 col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Link size={16} className="text-purple-400" />
                            <span className="text-xs text-surface-400">{t('dashboard.withSeed')}</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-400">{walletsWithSeed}</p>
                    </div>
                </div>

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
                                    <span className="text-white font-medium text-xs flex-shrink-0">${data.total.toFixed(2)}</span>
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
                                    <span className="text-white font-medium text-xs flex-shrink-0">${data.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

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

                {/* Total */}
                <div className="glass-card p-6 border border-brand-500/20 bg-brand-500/5">
                    <p className="text-surface-400 text-xs uppercase tracking-wider mb-1">{t('dashboard.totalValue')}</p>
                    <p className="text-3xl font-bold text-white">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                </div>
            </div>
        </div>
    );
}
