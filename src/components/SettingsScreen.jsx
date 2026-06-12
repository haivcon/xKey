import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { hapticTap } from '../utils/haptics';
import GeneralTab from './settings/GeneralTab';
import SecurityTab from './settings/SecurityTab';
import DataTab from './settings/DataTab';

export default function SettingsScreen({ aesKey, onBack, onWipe, onImport }) {
    const [activeTab, setActiveTab] = useState('general');
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const t = useT();

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
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'security' && <SecurityTab onWipe={onWipe} />}
                {activeTab === 'data' && <DataTab aesKey={aesKey} onImport={onImport} />}
            </div>
        </div>
    );
}
