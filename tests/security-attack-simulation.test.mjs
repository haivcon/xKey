import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  createPortableBackupText,
  inspectBackupFile,
  parseEncryptedBackupText,
} from '../src/utils/backup/backupUtils.ts';
import { analyzeBackupVaultDiff } from '../src/features/backup/backupVaultDiff.ts';
import { runRestoreSandbox } from '../src/features/backup/restoreSandbox.ts';
import {
  buildCsvImportPreview,
  buildWalletCsv,
  detectImportFormat,
  sanitizeCsvCell,
} from '../src/features/import/fileImportParsers.ts';
import {
  CLIPBOARD_POLICIES,
  getClipboardPolicy,
  isSecretKind,
} from '../src/utils/dataSensitivity.ts';
import { detectSecretInText, getSecretPlacementWarning } from '../src/utils/secretDetection.ts';
import {
  AUTOLOCK_OPTIONS,
  isSixDigitPin,
  sanitizePinInput,
} from '../src/components/settings/securityTabUtils.ts';

const rootDir = process.cwd();
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const backupMarkers = {
  headerStart: '-----BEGIN XKEY HEADER-----',
  payloadStart: '-----BEGIN XKEY PAYLOAD-----',
  payloadEnd: '-----END XKEY PAYLOAD-----',
  footerStart: '-----BEGIN XKEY RECOVERY FOOTER-----',
  backupEnd: '-----END XKEY BACKUP V4-----',
};

const attackResults = [];

const recordAttack = async (name, run) => {
  await run();
  attackResults.push(name);
};

const getBlockRange = (backupText, startMarker, endMarker) => {
  const markerStart = backupText.indexOf(startMarker);
  assert.notEqual(markerStart, -1, `Missing marker ${startMarker}`);

  const contentStart = backupText.indexOf('\n', markerStart + startMarker.length) + 1;
  const contentEnd = backupText.indexOf(endMarker, contentStart);
  assert.notEqual(contentEnd, -1, `Missing marker ${endMarker}`);

  return {
    contentStart,
    contentEnd,
    content: backupText.slice(contentStart, contentEnd).trim(),
  };
};

const encodeJsonBlock = (value) => {
  const bytes = textEncoder.encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const decodeJsonBlock = (value) => {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return JSON.parse(textDecoder.decode(bytes));
};

const mutateDescriptor = (backupText, mutate) => {
  const header = getBlockRange(backupText, backupMarkers.headerStart, backupMarkers.payloadStart);
  const footer = getBlockRange(backupText, backupMarkers.footerStart, backupMarkers.backupEnd);
  const descriptor = mutate(decodeJsonBlock(footer.content));
  const encoded = encodeJsonBlock(descriptor);

  return [
    backupText.slice(0, header.contentStart),
    encoded,
    '\n',
    backupText.slice(header.contentEnd, footer.contentStart),
    encoded,
    '\n',
    backupText.slice(footer.contentEnd),
  ].join('');
};

const mutatePayload = (backupText, mutate) => {
  const payload = getBlockRange(backupText, backupMarkers.payloadStart, backupMarkers.payloadEnd);
  return `${backupText.slice(0, payload.contentStart)}${mutate(payload.content)}\n${backupText.slice(payload.contentEnd)}`;
};

const flipChar = (value, index) => {
  const current = value[index] || 'A';
  const replacement = current === 'A' ? 'B' : 'A';
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;
};

const corruptPayloadBeyondRecovery = (backupText) => {
  const footer = getBlockRange(backupText, backupMarkers.footerStart, backupMarkers.backupEnd);
  const descriptor = decodeJsonBlock(footer.content);
  const shardSize = descriptor.recovery.shardSize;
  const shardsToCorrupt = descriptor.recovery.parityShards + 1;

  return mutatePayload(backupText, (payload) => {
    let corrupted = payload;
    for (let shardIndex = 0; shardIndex < shardsToCorrupt; shardIndex += 1) {
      corrupted = flipChar(corrupted, shardIndex * shardSize);
    }
    return corrupted;
  });
};

const walkSourceFiles = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', 'build', 'android'].includes(entry.name)) return [];
      return walkSourceFiles(fullPath);
    }

    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) return [];
    return [fullPath];
  });
};

const sourceFiles = walkSourceFiles(join(rootDir, 'src'));
const testFiles = walkSourceFiles(join(rootDir, 'tests'));
const scriptFiles = statSync(join(rootDir, 'scripts')).isDirectory()
  ? walkSourceFiles(join(rootDir, 'scripts'))
  : [];

const allAuditedFiles = [...sourceFiles, ...testFiles, ...scriptFiles];

const fakePrivateKey = `0x${'a'.repeat(64)}`;
const fakeMnemonic = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

const backupWallet = {
  id: 'attack-wallet-1',
  name: 'Attack simulation wallet',
  address: '0x1111111111111111111111111111111111111111',
  privateKey: fakePrivateKey,
  seedPhrase: '',
  network: 'ETH',
  tags: ['attack-simulation'],
};

const backupPassword = 'attack-simulation-password';
const backupText = await createPortableBackupText(
  [backupWallet],
  { scope: 'attack-simulation' },
  backupPassword,
);

await recordAttack('backup payload tampering beyond recovery is detected and rejected', async () => {
  const tampered = corruptPayloadBeyondRecovery(backupText);
  const inspection = await inspectBackupFile(tampered);

  assert.equal(inspection.status, 'tampered');
  assert.equal(inspection.integrity, 'modified');
  await assert.rejects(
    () => parseEncryptedBackupText(tampered, 'wrong-device-key', backupPassword),
    /integrity check failed|modified or corrupted/i,
  );
});

await recordAttack('backup unsupported version downgrade/upgrade tampering is rejected', async () => {
  const unsupportedVersion = mutateDescriptor(backupText, descriptor => ({
    ...descriptor,
    version: 999,
  }));

  await assert.rejects(
    () => parseEncryptedBackupText(unsupportedVersion, 'wrong-device-key', backupPassword),
    /Unsupported backup version: 999/,
  );
});

await recordAttack('backup wrong password attack is rejected', async () => {
  await assert.rejects(
    () => parseEncryptedBackupText(backupText, 'wrong-device-key', 'incorrect-password'),
    /Wrong password|Backup password seal failed/,
  );
});

await recordAttack('backup corrupt payload beyond recovery is rejected', async () => {
  const unrecoverable = corruptPayloadBeyondRecovery(backupText);
  const inspection = await inspectBackupFile(unrecoverable);

  assert.equal(inspection.status, 'tampered');
  assert.equal(inspection.integrity, 'modified');
  assert.equal(inspection.recovered, false);
  await assert.rejects(
    () => parseEncryptedBackupText(unrecoverable, 'wrong-device-key', backupPassword),
    /integrity check failed|modified or corrupted/i,
  );
});

await recordAttack('backup missing metadata does not bypass decrypt/integrity validation', async () => {
  const missingMetadata = mutateDescriptor(backupText, (descriptor) => {
    delete descriptor.summary;
    delete descriptor.configSummary;
    delete descriptor.createdBy;
    delete descriptor.appVersion;
    return descriptor;
  });

  const inspection = await inspectBackupFile(missingMetadata);
  assert.equal(inspection.status, 'ok');
  assert.equal(inspection.integrity, 'verified');

  const parsed = await parseEncryptedBackupText(missingMetadata, 'wrong-device-key', backupPassword);
  assert.equal(parsed.wallets?.[0]?.address, backupWallet.address);
});

await recordAttack('restore sandbox warns about destructive replace and duplicate secret attacks', () => {
  const currentWallets = [
    {
      id: 'current-1',
      name: 'Current wallet',
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      network: 'ETH',
      privateKey: fakePrivateKey,
    },
    {
      id: 'current-2',
      name: 'Would be removed by replace',
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      network: 'ETH',
    },
  ];

  const backupWallets = [
    {
      id: 'backup-1',
      name: 'Duplicate secret copy',
      address: '0xcccccccccccccccccccccccccccccccccccccccc',
      network: 'ETH',
      privateKey: fakePrivateKey,
    },
    {
      id: 'backup-2',
      name: 'New wallet',
      address: '0xdddddddddddddddddddddddddddddddddddddddd',
      network: 'ETH',
      privateKey: `0x${'b'.repeat(64)}`,
    },
  ];

  const diff = analyzeBackupVaultDiff(currentWallets, backupWallets);
  assert.equal(diff.summary.duplicateSecrets, 1);
  assert.equal(diff.summary.missingFromBackup, 2);

  const sandbox = runRestoreSandbox({
    currentWallets,
    backupWallets,
    inspection: {
      legacy: false,
      status: 'verified',
      integrity: 'verified',
      format: 'xkey-backup-v4',
      metadata: {
        createdAt: '2026-07-01T00:00:00.000Z',
        backupId: 'attack-simulation-backup',
        containerHash: 'attack-simulation-hash',
        appVersion: '6.0.16',
        platform: 'web',
        source: 'github.com/haivcon/xKey',
        scope: 'vault',
        walletCount: backupWallets.length,
        portable: true,
      },
    },
    now: new Date('2026-07-01T00:00:00.000Z'),
  });

  assert.equal(sandbox.canRestore, true);
  assert.equal(sandbox.recommendedMode, 'merge');
  assert.ok(sandbox.warnings.some(warning => warning.code === 'duplicate_secrets'));
  assert.ok(sandbox.warnings.some(warning => warning.code === 'replace_would_delete_wallets'));
});

await recordAttack('secret placement attack is detected before storing private material in weak fields', () => {
  assert.equal(detectSecretInText(fakePrivateKey), 'privateKey');
  assert.equal(detectSecretInText(fakeMnemonic), 'mnemonic');
  assert.equal(detectSecretInText('backup reminder: rotate cold wallet after review'), null);

  assert.match(
    getSecretPlacementWarning(fakePrivateKey, 'notes') || '',
    /secret field/i,
  );
  assert.match(
    getSecretPlacementWarning(fakeMnemonic, 'name') || '',
    /secret field/i,
  );
});

await recordAttack('clipboard policies keep critical secrets on short critical cleanup paths', () => {
  for (const kind of ['privateKey', 'mnemonic', 'sensitiveNote']) {
    const policy = getClipboardPolicy(kind);
    assert.equal(isSecretKind(kind), true);
    assert.equal(policy.warningLevel, 'critical');
    assert.ok(policy.defaultClearAfterMs > 0);
    assert.ok(policy.defaultClearAfterMs <= 30000);
  }

  assert.equal(CLIPBOARD_POLICIES.address.sensitivity, 'public');
  assert.ok(CLIPBOARD_POLICIES.address.defaultClearAfterMs > CLIPBOARD_POLICIES.privateKey.defaultClearAfterMs);
});

await recordAttack('CSV formula injection is neutralized on export', () => {
  const dangerousValues = [
    '=IMPORTXML("https://attacker.invalid","//x")',
    '+SUM(1,2)',
    '-10+20',
    '@HYPERLINK("https://attacker.invalid")',
    '\t=cmd',
    '\r=cmd',
  ];

  for (const value of dangerousValues) {
    assert.equal(sanitizeCsvCell(value).startsWith("'"), true, `Expected formula prefix for ${JSON.stringify(value)}`);
  }

  const csv = buildWalletCsv(
    [
      {
        name: '=IMPORTXML("https://attacker.invalid","//x")',
        address: '0x1111111111111111111111111111111111111111',
        balance: '+999',
        groupId: '@group',
        network: 'ETH',
        privateKey: fakePrivateKey,
        seedPhrase: fakeMnemonic,
      },
    ],
    [
      { key: 'name', label: 'Name' },
      { key: 'address', label: 'Address' },
      { key: 'balance', label: 'Balance' },
      { key: 'groupId', label: 'Folder' },
      { key: 'network', label: 'Network' },
    ],
  );

  assert.match(csv, /"'=IMPORTXML/);
  assert.match(csv, /"'\+999"/);
  assert.match(csv, /"'@group"/);
});

await recordAttack('CSV import preview flags sensitive and malformed wallet rows', async () => {
  const csv = [
    'Tên ví,Địa chỉ,Mạng,Khóa riêng,Cụm từ seed',
    `Injected name,not-an-address,ETH,${fakePrivateKey},`,
    `Mnemonic row,0x2222222222222222222222222222222222222222,ETH,,${fakeMnemonic}`,
    `Duplicate row,0x2222222222222222222222222222222222222222,ETH,,`,
  ].join('\n');

  const preview = await buildCsvImportPreview(csv, 'attack.csv', 'Imported', []);

  assert.equal(preview.includesSensitive, true);
  assert.equal(preview.sensitiveCount, 2);
  assert.equal(preview.invalidAddress, 1);
  assert.equal(preview.skippedDuplicates, 1);
  assert.ok(preview.issues.some(issue => issue.field === 'address'));
  assert.ok(preview.issues.some(issue => issue.field === 'duplicate'));
});

await recordAttack('file format confusion does not coerce obvious JSON/text into CSV unexpectedly', () => {
  assert.equal(detectImportFormat('wallets.json', '[{"address":"0x1"}]'), 'json');
  assert.equal(detectImportFormat('wallets.txt', '0x1\n0x2'), 'text');
  assert.equal(detectImportFormat('wallets.csv', 'address,network\n0x1,ETH'), 'csv');
  assert.equal(detectImportFormat('wallets.json', '{"not":"array"}'), 'csv');
});

await recordAttack('PIN sanitization blocks non-digit and overlong input attacks', () => {
  assert.equal(sanitizePinInput('12ab34 56<script>789'), '123456');
  assert.equal(sanitizePinInput('１２３４５６'), '');
  assert.equal(isSixDigitPin('123456'), true);
  assert.equal(isSixDigitPin('12345'), false);
  assert.equal(isSixDigitPin('1234567'), false);
  assert.equal(isSixDigitPin('12345a'), false);
});

await recordAttack('auto-lock options never include disabled or zero values', () => {
  assert.ok(AUTOLOCK_OPTIONS.length > 0);
  assert.ok(AUTOLOCK_OPTIONS.every(option => option.value > 0));
  assert.ok(AUTOLOCK_OPTIONS.every(option => option.value >= 60000));
});

await recordAttack('static guardrails reject obvious security setting bypasses', () => {
  const forbiddenPatterns = [
    {
      name: 'setAutoLockMinutes(0)',
      regex: /setAutoLockMinutes\s*\(\s*0\s*\)/,
    },
    {
      name: 'autoLockMinutes assigned zero',
      regex: /autoLockMinutes\s*[:=]\s*0\b/,
    },
    {
      name: 'disable screenshot protection flag',
      regex: /screenshotProtection\s*[:=]\s*false\b/,
    },
    {
      name: 'disable clipboard cleanup flag',
      regex: /clipboardCleanup\s*[:=]\s*false\b/,
    },
  ];

  const violations = [];
  for (const filePath of sourceFiles) {
    const content = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(content)) {
        violations.push(`${relative(rootDir, filePath)}: ${pattern.name}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

await recordAttack('static guardrails keep fake test secrets out of console output', () => {
  const sensitiveConsoleViolations = [];

  for (const filePath of allAuditedFiles) {
    const relativePath = relative(rootDir, filePath);
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!/console\.(log|warn|error|info|debug)\s*\(/.test(line)) return;
      if (/(privateKey|seedPhrase|mnemonic|fakePrivateKey|fakeMnemonic|backupText)/i.test(line)) {
        sensitiveConsoleViolations.push(`${relativePath}:${index + 1}`);
      }
    });
  }

  assert.deepEqual(sensitiveConsoleViolations, []);
});

console.log(`Security attack simulation tests passed (${attackResults.length} scenarios)`);