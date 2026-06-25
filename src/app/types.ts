import type { Wallet } from '../types';

export type AssetBalanceChange = {
  wallet: Wallet;
  balance: string;
};

export type AssetBalanceOptions = {
  silent?: boolean;
};

export type PinSuccessOptions = {
  createdPin?: boolean;
};

export type WalletSaveInput = Wallet | Wallet[];