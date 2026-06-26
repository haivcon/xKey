import QRScannerModal from '../QRScannerModal';

type QRScannerResultType = 'address' | 'privateKey' | 'seedPhrase' | string;

type CreateWalletQRScannerProps = {
  show: boolean;
  setManualAddress: (value: string) => void;
  setManualPK: (value: string) => void;
  setManualSeed: (value: string) => void;
  checkDuplicate: (address: string) => void;
  onClose: () => void;
};

export function CreateWalletQRScanner({
  show,
  setManualAddress,
  setManualPK,
  setManualSeed,
  checkDuplicate,
  onClose,
}: CreateWalletQRScannerProps) {
  if (!show) return null;

  const handleResult = ({ text, type }: { text: string; type: QRScannerResultType }) => {
    if (type === 'address') {
      setManualAddress(text);
      checkDuplicate(text);
      return;
    }

    if (type === 'privateKey') {
      setManualPK(text);
      return;
    }

    if (type === 'seedPhrase') {
      setManualSeed(text);
      return;
    }

    setManualAddress(text);
  };

  return <QRScannerModal onResult={handleResult} onClose={onClose} />;
}