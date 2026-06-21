import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const LITE_MODE_KEY = 'xkey_lite_mode';

export default function useLiteMode(): { isLiteMode: boolean; toggleLiteMode: () => Promise<void> } {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    const loadLiteMode = async () => {
      const { value } = await Preferences.get({ key: LITE_MODE_KEY });
      const active = value === 'true';
      setIsLiteMode(active);
      if (active) {
        document.documentElement.classList.add('lite-mode');
      } else {
        document.documentElement.classList.remove('lite-mode');
      }
    };
    loadLiteMode();
  }, []);

  const toggleLiteMode = async (): Promise<void> => {
    const nextState = !isLiteMode;
    setIsLiteMode(nextState);
    await Preferences.set({ key: LITE_MODE_KEY, value: nextState.toString() });
    if (nextState) {
      document.documentElement.classList.add('lite-mode');
    } else {
      document.documentElement.classList.remove('lite-mode');
    }
  };

  return { isLiteMode, toggleLiteMode };
}
