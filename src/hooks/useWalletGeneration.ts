import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { createPostQuantumEnvelope, DEFAULT_ROTATION_MONTHS } from '../utils/keyHealth';
import { normalizeAmountInput } from '../utils/amountFormat';
import type { BulkResult, CreateWalletModalProps, FloatingEffect, GeneratedWallet } from '../components/create-wallet/types';

type ToastPayload = {
  key: string;
  vars?: Record<string, unknown>;
  category?: string;
};

type UseWalletGenerationParams = {
  aesKey: string;
  existingWallets: NonNullable<CreateWalletModalProps['existingWallets']>;
  onSave: CreateWalletModalProps['onSave'];
  onClose: CreateWalletModalProps['onClose'];
  showToast: (message: ToastPayload, type?: 'success' | 'warning' | 'error' | 'info') => void;
  t: (key: string, vars?: unknown) => string;
  setTab: (tab: 'manual' | 'generate' | 'hdTree' | 'vanity' | 'advancedEntropy') => void;
};

export function useWalletGeneration({
  aesKey,
  existingWallets,
  onSave,
  onClose,
  showToast,
  t,
  setTab,
}: UseWalletGenerationParams) {
  const [generateCount, setGenerateCount] = useState<number | string>(1);
  const [seedWordCount, setSeedWordCount] = useState(12);
  const [generatedWallets, setGeneratedWallets] = useState<GeneratedWallet[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [bulkResult, setBulkResult] = useState<BulkResult>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [postQuantumMode, setPostQuantumMode] = useState(false);
  const [showPostQuantumOptions, setShowPostQuantumOptions] = useState(false);
  const [rotationReminderMonths, setRotationReminderMonths] = useState(DEFAULT_ROTATION_MONTHS);

  const [manualAddress, setManualAddress] = useState('');
  const [manualPK, setManualPK] = useState('');
  const [manualSeed, setManualSeed] = useState('');
  const [manualBalance, setManualBalance] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualNetwork, setManualNetwork] = useState('XLAYER');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [manualDerivationPath, setManualDerivationPath] = useState("m/44'/60'/0'/0/0");

  const randomGeneratedWallets = useMemo(
    () => generatedWallets.filter(wallet => !wallet.vanityMatchType),
    [generatedWallets]
  );

  const handleAdvancedEntropyGenerated = (_entropy: Uint8Array, seedPhrase: string, address: string) => {
    setManualSeed(seedPhrase);
    setManualAddress(address);
    setWalletName(`${t('createWallet.tabAdvancedEntropy')} Wallet`);
    setTab('manual');
  };

  useEffect(() => {
    if (manualPK && !manualAddress) {
      try {
        const w = new ethers.Wallet(manualPK.trim());
        setManualAddress(w.address);
      } catch {
        // Ignore partial private-key input while the user is typing.
      }
    }
  }, [manualPK, manualAddress]);

  useEffect(() => {
    if (manualSeed && !manualAddress) {
      try {
        let hdNode;
        if (ethers.HDNodeWallet) {
          hdNode = ethers.HDNodeWallet.fromPhrase(manualSeed.trim(), undefined, manualDerivationPath || "m/44'/60'/0'/0/0");
        } else {
          hdNode = ethers.Wallet.fromPhrase(manualSeed.trim());
        }
        setManualAddress(hdNode.address);
        if (hdNode.privateKey) setManualPK(hdNode.privateKey);
      } catch {
        // Ignore partial seed phrase/path input while the user is typing.
      }
    }
  }, [manualSeed, manualDerivationPath, manualAddress]);

  const createRandomWalletRecord = async (name: string): Promise<GeneratedWallet> => {
    let w;
    if (Number(seedWordCount) === 24) {
      const mnemonic = ethers.Mnemonic.fromEntropy(ethers.randomBytes(32));
      w = ethers.HDNodeWallet.fromMnemonic(mnemonic, manualDerivationPath || "m/44'/60'/0'/0/0");
    } else {
      w = ethers.Wallet.createRandom();
    }

    const phrase = w.mnemonic?.phrase || '';
    return {
      name,
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: phrase,
      seedPhrase: phrase,
      balance: '0.00',
      network: 'XLAYER',
      rotationReminderMonths,
      ...(postQuantumMode ? await createPostQuantumEnvelope(aesKey) : {})
    };
  };

  const ensureStorageCapacity = async (walletCount: number): Promise<boolean> => {
    try {
      const estimate = await navigator.storage?.estimate?.();
      const available = (estimate?.quota || 0) - (estimate?.usage || 0);
      const required = Math.max(128 * 1024, walletCount * 4096);
      if (estimate?.quota && available < required) {
        showToast({ key: 'createWallet.storageCapacityLow', category: 'warning' }, 'warning');
        return false;
      }
    } catch {
      // Storage estimates are advisory; do not block if unavailable.
    }
    return true;
  };

  const generateWallet = async () => {
    const count = Number.parseInt(String(generateCount), 10) || 1;
    if (count < 1) return;
    if (!await ensureStorageCapacity(count)) return;

    if (count < 10) {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);

      const processSingle = async (i: number, newWallets: GeneratedWallet[]) => {
        if (i < count) {
          const record = await createRandomWalletRecord(count === 1 ? `Wallet ${Date.now().toString(36).slice(-4).toUpperCase()}` : `Wallet ${i + 1}`);
          newWallets.push(record);
          setGenerateProgress(i + 1);
          setFloatingEffects(prev => [...prev.slice(-4), { count: i + 1, address: record.address, key: Math.random() }]);
          setTimeout(() => processSingle(i + 1, newWallets), 150);
        } else {
          setTimeout(() => {
            setGeneratedWallets(newWallets);
            if (count === 1) {
              setWalletName(newWallets[0]?.name || 'New Wallet');
            }
            setGenerating(false);
          }, 800);
        }
      };
      processSingle(0, []);
    } else {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);
      const newWallets: GeneratedWallet[] = [];
      const chunkSize = 20;

      const processChunk = async (i: number) => {
        const limit = Math.min(i + chunkSize, count);
        for (let j = i; j < limit; j++) {
          newWallets.push(await createRandomWalletRecord(`Wallet ${j + 1}`));
        }
        setGenerateProgress(limit);
        const lastW = newWallets[newWallets.length - 1];
        setFloatingEffects(prev => [...prev.slice(-4), { count: limit, address: lastW.address, key: Math.random() }]);

        if (limit < count) {
          setTimeout(() => processChunk(limit), 100);
        } else {
          setTimeout(async () => {
            const sizeBytes = new Blob([JSON.stringify(newWallets)]).size;
            let storageInfo: StorageEstimate | undefined;
            if (navigator.storage && navigator.storage.estimate) {
              try {
                storageInfo = await navigator.storage.estimate();
              } catch {
                storageInfo = undefined;
              }
            }
            onSave(newWallets);
            setBulkResult({ count, sizeBytes, storageInfo });
            setGenerating(false);
          }, 800);
        }
      };
      processChunk(0);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checkDuplicate = (address: string) => {
    if (!address) {
      setDuplicateWarning(false);
      return;
    }
    setDuplicateWarning(existingWallets.some(w => w.address?.toLowerCase() === address.toLowerCase()));
  };

  const handleSaveGenerated = async () => {
    if (randomGeneratedWallets.length === 0) return;

    const toSave = randomGeneratedWallets.map((w, index) => ({
      name: (randomGeneratedWallets.length === 1 ? walletName : w.name) || 'New Wallet',
      address: w.address,
      privateKey: w.privateKey,
      seedPhrase: w.mnemonic || w.seedPhrase,
      balance: '0.00',
      network: w.network || 'XLAYER',
      groupId: w.groupId,
      tags: w.tags || [],
      rotationReminderMonths: w.rotationReminderMonths || rotationReminderMonths,
      ...(w.pqPrepared ? {
        pqPrepared: w.pqPrepared,
        pqScheme: w.pqScheme,
        pqCreatedAt: w.pqCreatedAt,
        pqPublicCommitment: w.pqPublicCommitment,
        pqOneTimeSlots: w.pqOneTimeSlots,
        pqUsedSlots: w.pqUsedSlots,
        pqReserveId: w.pqReserveId,
      } : {}),
      createdAt: Date.now() + index
    }));

    const saved = await onSave(toSave.length === 1 ? toSave[0] : toSave);
    const savedList = (Array.isArray(saved) ? saved : saved ? [saved] : []) as GeneratedWallet[];
    showToast({ key: 'createWallet.walletCreated', vars: { count: savedList.length || toSave.length, folder: savedList[0]?.groupId || toSave[0]?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' }, 'success');
    onClose();
  };

  const handleSaveManual = async () => {
    if (!manualAddress && !manualPK && !manualSeed) {
      showToast({ key: 'createWallet.fillRequired', category: 'warning' }, 'warning');
      return;
    }
    const saved = await onSave({
      name: walletName || 'Manual Wallet',
      address: manualAddress.trim(),
      privateKey: manualPK.trim(),
      seedPhrase: manualSeed.trim(),
      balance: normalizeAmountInput(manualBalance) || '0.00',
      notes: manualNotes.trim(),
      network: manualNetwork,
      rotationReminderMonths,
      ...(postQuantumMode ? await createPostQuantumEnvelope(aesKey) : {}),
      createdAt: Date.now()
    });
    const savedWallet = (Array.isArray(saved) ? saved[0] : saved) as GeneratedWallet | undefined;
    showToast(duplicateWarning
      ? { key: 'createWallet.walletAddedDuplicate', category: 'warning' }
      : { key: 'createWallet.walletAdded', vars: { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' },
    duplicateWarning ? 'warning' : 'success');
    onClose();
  };

  const handleSaveHDWallet = async (wallet: GeneratedWallet) => {
    const path = wallet.derivationPath || wallet.path;
    const saved = await onSave({
      name: wallet.name || t('createWallet.hdTreeWalletName'),
      address: wallet.address,
      privateKey: wallet.privateKey,
      balance: wallet.balance || '0.00',
      notes: wallet.notes || t('createWallet.hdTreeDerivedNote', { path }),
      network: wallet.network || 'XLAYER',
      derivationPath: path,
      hdAccount: wallet.hdAccount,
      hdIndex: wallet.hdIndex,
      hdCoinType: wallet.hdCoinType,
      hdNetwork: wallet.hdNetwork || wallet.network || 'XLAYER',
      hdRootType: wallet.hdRootType,
      createdAt: Date.now(),
    });
    const savedWallet = (Array.isArray(saved) ? saved[0] : saved) as GeneratedWallet | undefined;
    showToast({ key: 'createWallet.walletAdded', vars: { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' }, 'success');
    onClose();
  };

  return {
    generateCount,
    setGenerateCount,
    seedWordCount,
    setSeedWordCount,
    generatedWallets,
    setGeneratedWallets,
    generating,
    setGenerating,
    generateProgress,
    setGenerateProgress,
    floatingEffects,
    setFloatingEffects,
    bulkResult,
    setBulkResult,
    copiedField,
    setCopiedField,
    walletName,
    setWalletName,
    postQuantumMode,
    setPostQuantumMode,
    showPostQuantumOptions,
    setShowPostQuantumOptions,
    rotationReminderMonths,
    setRotationReminderMonths,
    manualAddress,
    setManualAddress,
    manualPK,
    setManualPK,
    manualSeed,
    setManualSeed,
    manualBalance,
    setManualBalance,
    manualNotes,
    setManualNotes,
    manualNetwork,
    setManualNetwork,
    duplicateWarning,
    setDuplicateWarning,
    showQRScanner,
    setShowQRScanner,
    showNetworkDropdown,
    setShowNetworkDropdown,
    expandedStep,
    setExpandedStep,
    manualDerivationPath,
    setManualDerivationPath,
    randomGeneratedWallets,
    handleAdvancedEntropyGenerated,
    createRandomWalletRecord,
    generateWallet,
    handleCopy,
    checkDuplicate,
    handleSaveGenerated,
    ensureStorageCapacity,
    handleSaveManual,
    handleSaveHDWallet,
  };
}