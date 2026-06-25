import { useCallback, useEffect, useMemo, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { saveWallets } from '../utils/storage';
import { hapticSuccess } from '../utils/haptics';
import { formatAssetValue } from '../utils/amountFormat';
import { ASSET_UNIT_KEY } from '../app/constants';
import type { AssetBalanceChange, AssetBalanceOptions } from '../app/types';
import type { TranslationFn } from '../contexts/LanguageContext';
import type { Wallet } from '../types';

type UseAssetBalanceSettingsOptions = {
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  totalBalance: number;
  aesKey: string | null;
  isDecoyMode: boolean;
  showToast?: (message: unknown, type?: string) => void;
  t: TranslationFn;
};

export default function useAssetBalanceSettings({
  wallets,
  setWallets,
  totalBalance,
  aesKey,
  isDecoyMode,
  showToast,
  t,
}: UseAssetBalanceSettingsOptions) {
  const [assetUnit, setAssetUnit] = useState('$');

  useEffect(() => {
    Preferences.get({ key: ASSET_UNIT_KEY }).then(({ value }) => {
      if (value) setAssetUnit(value);
    }).catch(() => {});
  }, []);

  const totalBalanceText = useMemo(() => formatAssetValue(totalBalance, assetUnit), [assetUnit, totalBalance]);

  const updateAssetUnit = useCallback((unit: string) => {
    const nextUnit = unit || '$';
    setAssetUnit(nextUnit);
    Preferences.set({ key: ASSET_UNIT_KEY, value: nextUnit }).catch(() => {});
  }, []);

  const handleSaveAssetBalances = useCallback(async (changes: AssetBalanceChange[], options: AssetBalanceOptions = {}) => {
    const changeMap = new Map(changes.map(change => [change.wallet, change.balance]));
    const idMap = new Map(changes.filter(change => change.wallet._id).map(change => [change.wallet._id, change.balance]));
    const updated = wallets.map(wallet => {
      if (idMap.has(wallet._id)) return { ...wallet, balance: idMap.get(wallet._id) };
      if (changeMap.has(wallet)) return { ...wallet, balance: changeMap.get(wallet) };
      return wallet;
    });

    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);

    if (!options.silent) {
      hapticSuccess();
      showToast?.(t('assetBalance.saved'), 'success');
    }
  }, [wallets, setWallets, aesKey, isDecoyMode, showToast, t]);

  return {
    assetUnit,
    totalBalanceText,
    updateAssetUnit,
    handleSaveAssetBalances,
  };
}