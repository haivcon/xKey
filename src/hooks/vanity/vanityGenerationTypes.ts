import type React from 'react';
import type { GeneratedWallet } from '../../components/create-wallet/types';

export type VanityConfirmOptions = {
  danger?: boolean;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
};

export interface UseVanityGenerationParams {
  activeFolder: string;
  folders: string[];
  aesKey: string;
  onSave: (
    wallet: GeneratedWallet | GeneratedWallet[]
  ) => Promise<GeneratedWallet | GeneratedWallet[] | void> | GeneratedWallet | GeneratedWallet[] | void;
  onClose: () => void;
  showToast: (message: unknown, type?: string) => void;
  showConfirm: (message: string, options?: VanityConfirmOptions) => Promise<boolean>;
  t: (key: string, vars?: unknown) => string;
  registerCloseHandler?: ((handler: (() => void | Promise<void>) | null) => void) | undefined;
  generatedWallets: GeneratedWallet[];
  setGeneratedWallets: React.Dispatch<React.SetStateAction<GeneratedWallet[]>>;
  setWalletName: React.Dispatch<React.SetStateAction<string>>;
}