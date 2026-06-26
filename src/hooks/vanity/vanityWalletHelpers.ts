import {
  VANITY_DEFAULT_FOLDER,
  VANITY_EXTRA_DEFAULT_FOLDER,
} from '../../components/create-wallet/constants';
import type { GeneratedWallet } from '../../components/create-wallet/types';

export const createVanityWallet = ({
  wallet,
  index,
  targetCount,
  network,
  folder,
  tags,
  vanityWalletName,
}: {
  wallet: GeneratedWallet;
  index: number;
  targetCount: number;
  network: string;
  folder: string;
  tags: string[];
  vanityWalletName: string;
}): GeneratedWallet => ({
  ...wallet,
  name: targetCount === 1 ? vanityWalletName : `${vanityWalletName} ${index + 1}`,
  network,
  groupId: folder || VANITY_DEFAULT_FOLDER,
  tags,
  balance: '0.00',
  createdAt: Date.now() + index,
});

export const createVanityExtraWallet = ({
  wallet,
  index,
  network,
  folder,
  tags,
  vanityExtraWalletName,
}: {
  wallet: GeneratedWallet;
  index: number;
  network: string;
  folder: string;
  tags: string[];
  vanityExtraWalletName: string;
}): GeneratedWallet => ({
  ...wallet,
  name: `${vanityExtraWalletName} ${index + 1}`,
  network,
  groupId: folder || VANITY_EXTRA_DEFAULT_FOLDER,
  tags: [...new Set([...tags, 'extra-vanity'])],
  balance: '0.00',
  createdAt: Date.now() + index + 100000,
  seedPhrase: wallet.seedPhrase || wallet.mnemonic || '',
  mnemonic: wallet.mnemonic || wallet.seedPhrase || '',
});

export const getVanityScoreTone = (score = 0): string => {
  if (score >= 80)
    return 'border-emerald-400/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
  if (score >= 50)
    return 'border-amber-400/35 bg-amber-500/15 text-amber-700 dark:text-amber-200';
  if (score >= 30)
    return 'border-orange-400/35 bg-orange-500/15 text-orange-700 dark:text-orange-200';
  return 'border-rose-400/35 bg-rose-500/15 text-rose-700 dark:text-rose-200';
};

export const rankVanityExtraWallets = (
  wallets: GeneratedWallet[],
  limit: number
): GeneratedWallet[] =>
  wallets
    .filter(w => !!w.address)
    .filter(
      (wallet, index, list) =>
        list.findIndex(
          other => other.address?.toLowerCase() === wallet.address?.toLowerCase()
        ) === index
    )
    .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0))
    .slice(0, limit);

export const buildVanitySelectedWallets = ({
  wallets,
  selectedAddresses,
  savedAddresses,
  extraWalletName,
}: {
  wallets: GeneratedWallet[];
  selectedAddresses: Set<string>;
  savedAddresses: Set<string>;
  extraWalletName: string;
}): GeneratedWallet[] => {
  const extraRanks = new Map(
    wallets
      .filter(wallet => wallet.vanityMatchType === 'extra' && !!wallet.address)
      .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0))
      .map((wallet, index) => [wallet.address!.toLowerCase(), index + 1])
  );

  return wallets
    .filter(
      wallet =>
        !!wallet.address &&
        selectedAddresses.has(wallet.address) &&
        !savedAddresses.has(wallet.address)
    )
    .map(wallet => {
      const rank = wallet.address ? extraRanks.get(wallet.address.toLowerCase()) : undefined;
      return rank ? { ...wallet, name: `${extraWalletName} ${rank}` } : wallet;
    });
};

export const mergeVanityExtraWallets = ({
  previousExtras,
  incomingExtras,
  limit,
  buildWallet,
  extraWalletName,
}: {
  previousExtras: GeneratedWallet[];
  incomingExtras: GeneratedWallet[];
  limit: number;
  buildWallet: (wallet: GeneratedWallet, index: number) => GeneratedWallet;
  extraWalletName: string;
}): GeneratedWallet[] => {
  const byAddress = new Map(previousExtras.map(wallet => [wallet.address?.toLowerCase(), wallet]));
  const mergedExtras = [...previousExtras, ...incomingExtras]
    .filter(wallet => !!wallet.address)
    .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0));

  return mergedExtras
    .filter(
      (wallet, index, list) =>
        list.findIndex(
          other => other.address?.toLowerCase() === wallet.address?.toLowerCase()
        ) === index
    )
    .slice(0, limit)
    .map((wallet, index) => {
      const existing = byAddress.get(wallet.address?.toLowerCase() || '');
      const base = existing || buildWallet(wallet, index);
      return {
        ...base,
        ...wallet,
        privateKey: wallet.privateKey || base.privateKey,
        seedPhrase: wallet.seedPhrase || wallet.mnemonic || base.seedPhrase || base.mnemonic || '',
        mnemonic: wallet.mnemonic || wallet.seedPhrase || base.mnemonic || base.seedPhrase || '',
        name: `${extraWalletName} ${index + 1}`,
      };
    });
};

export const getLowercaseWalletAddressSet = (wallets: GeneratedWallet[]): Set<string> =>
  new Set(wallets.map(wallet => wallet.address?.toLowerCase()).filter(Boolean) as string[]);

export const syncVanityExtraSelection = ({
  previousExtras,
  nextExtras,
  selectedAddresses,
}: {
  previousExtras: GeneratedWallet[];
  nextExtras: GeneratedWallet[];
  selectedAddresses: Set<string>;
}): void => {
  const nextAddresses = getLowercaseWalletAddressSet(nextExtras);
  const previousAddresses = getLowercaseWalletAddressSet(previousExtras);

  previousExtras.forEach(wallet => {
    const address = wallet.address?.toLowerCase();
    if (address && !nextAddresses.has(address)) selectedAddresses.delete(wallet.address || '');
  });

  nextExtras.forEach(wallet => {
    const address = wallet.address?.toLowerCase();
    if (address && !previousAddresses.has(address)) selectedAddresses.add(wallet.address || '');
  });
};
