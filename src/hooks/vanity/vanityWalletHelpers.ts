import {
  VANITY_DEFAULT_FOLDER,
  VANITY_EXTRA_DEFAULT_FOLDER,
} from '../../components/create-wallet/constants';
import type { GeneratedWallet } from '../../components/create-wallet/types';
import {
  detectExtraVanityMatch,
  normalizeVanityAddress,
  sortAndDedupeVanityAddresses,
  type VanityExtraFilterConfig,
} from '../../utils/vanity/vanityMatch';
import { toVanityScoreMetadata } from '../../utils/vanity/vanityScoreGrade';

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

export { getVanityScoreTone } from '../../utils/vanity/vanityScoreGrade';

export const revalidateVanityExtraWallet = (
  wallet: GeneratedWallet,
  filters: VanityExtraFilterConfig
): GeneratedWallet | null => {
  if (!wallet.address) return null;
  const match = detectExtraVanityMatch(wallet.address, filters);
  if (!match) return null;
  return { ...wallet, ...toVanityScoreMetadata(match, 'extra') };
};

export const revalidateVanityExtraWallets = (
  wallets: GeneratedWallet[],
  filters: VanityExtraFilterConfig
): GeneratedWallet[] => wallets
  .map(wallet => revalidateVanityExtraWallet(wallet, filters))
  .filter((wallet): wallet is GeneratedWallet => wallet !== null);

export const rankVanityExtraWallets = (
  wallets: GeneratedWallet[],
  limit: number
): GeneratedWallet[] => sortAndDedupeVanityAddresses(
  wallets,
  (left, right) => (right.vanityScore || 0) - (left.vanityScore || 0),
  limit,
);

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
        selectedAddresses.has(normalizeVanityAddress(wallet.address)) &&
        !savedAddresses.has(normalizeVanityAddress(wallet.address))
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
  const mergedExtras = rankVanityExtraWallets([...previousExtras, ...incomingExtras], limit);

  return mergedExtras
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
  new Set(wallets.map(wallet => normalizeVanityAddress(wallet.address)).filter(Boolean));

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
    const address = normalizeVanityAddress(wallet.address);
    if (address && !nextAddresses.has(address)) selectedAddresses.delete(address);
  });

  nextExtras.forEach(wallet => {
    const address = normalizeVanityAddress(wallet.address);
    if (address && !previousAddresses.has(address)) selectedAddresses.add(address);
  });
};
