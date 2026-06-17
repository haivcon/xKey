import { ethers } from 'ethers';

let running = false;

self.onmessage = (event) => {
  const { type, prefix = '', suffix = '', batchSize = 120, targetCount = 1 } = event.data || {};

  if (type === 'stop') {
    running = false;
    return;
  }

  if (type !== 'start') return;

  running = true;
  const startTime = Date.now();
  let scanned = 0;
  let found = 0;
  let lastReport = Date.now();
  const safeTargetCount = Math.max(1, Math.min(100, Number(targetCount) || 1));

  const runBatch = () => {
    if (!running) return;

    for (let i = 0; i < batchSize; i += 1) {
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address.toLowerCase();
      scanned += 1;

      if ((!prefix || address.startsWith(`0x${prefix}`)) && (!suffix || address.endsWith(suffix))) {
        found += 1;
        self.postMessage({
          type: 'found',
          scanned,
          found,
          elapsed: (Date.now() - startTime) / 1000,
          wallet: {
            name: 'Vanity Wallet',
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase || '',
            seedPhrase: wallet.mnemonic?.phrase || '',
            balance: '0.00',
            network: 'XLAYER'
          }
        });

        if (found >= safeTargetCount) {
          running = false;
          self.postMessage({
            type: 'complete',
            scanned,
            found,
            elapsed: (Date.now() - startTime) / 1000
          });
          return;
        }
      }
    }

    const now = Date.now();
    if (now - lastReport >= 250) {
      lastReport = now;
      self.postMessage({
        type: 'progress',
        scanned,
        found,
        elapsed: (now - startTime) / 1000
      });
    }

    setTimeout(runBatch, 0);
  };

  runBatch();
};
