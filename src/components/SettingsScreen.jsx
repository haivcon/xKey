import { useState, useEffect } from 'react';
import { ArrowLeft, Database, Palette, ShieldCheck } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { hapticTap } from '../utils/haptics';
import GeneralTab from './settings/GeneralTab';
import SecurityTab from './settings/SecurityTab';
import DataTab from './settings/DataTab';

export default function SettingsScreen({ aesKey, onBack, onWipe, onImport }) {
    const [activeTab, setActiveTab] = useState('general');
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const t = useT();
    const tabs = [
        { key: 'general', label: t('settings.tabGeneral') || 'Chung', icon: Palette },
        { key: 'security', label: t('settings.tabSecurity') || 'Bảo mật', icon: ShieldCheck },
        { key: 'data', label: t('settings.tabData') || 'Dữ liệu', icon: Database },
    ];

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

    return (
        <div className={`min-h-screen bg-surface-900 text-surface-50 p-4 transition-all duration-300 ${isKeyboardVisible ? 'pb-96' : 'pb-10'}`}>
            <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 sticky top-0 bg-surface-900/80 backdrop-blur-md py-4 z-10">
                <button onClick={onBack} className="btn-icon-glow p-2 rounded-full hover:bg-surface-800 transition-colors">
                    <ArrowLeft size={24} className="text-surface-300" />
                </button>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 pr-1">
                    {t('settings.title')}
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-xl mx-auto mb-6 lg:hidden">
                <div className="flex bg-surface-800/50 p-1 rounded-xl">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => { hapticTap(); setActiveTab(tab.key); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.key ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/80'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
                <aside className="hidden lg:block">
                    <div className="sticky top-28 glass-card p-3">
                        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                            {t('settings.title')}
                        </div>
                        <div className="space-y-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => { hapticTap(); setActiveTab(tab.key); }}
                                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-brand-500 text-white' : 'text-surface-400 hover:bg-surface-800 hover:text-white'}`}
                                    >
                                        <Icon size={16} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <div className="min-w-0 space-y-6 lg:[&>.glass-card]:max-w-none">
                    {activeTab === 'general' && <GeneralTab />}
                    {activeTab === 'security' && <SecurityTab onWipe={onWipe} />}
                    {activeTab === 'data' && <DataTab aesKey={aesKey} onImport={onImport} />}
                </div>
            </div>
        </div>
    );
}
