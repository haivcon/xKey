import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const packageName = process.env.XKEY_ANDROID_PACKAGE || 'com.haivcon.xkey';
const remotePath = '/sdcard/Download/xkey_adb_intent_test.xkey';

const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8',
  stdio: options.stdio || 'pipe',
});

const adb = (...args) => run('adb', args);

let devices;
try {
  devices = adb('devices');
} catch {
  console.log('adb is not available; skipping Android file-open intent test.');
  process.exit(0);
}

const hasDevice = devices.split('\n').slice(1).some(line => /\tdevice$/.test(line.trim()));
if (!hasDevice) {
  console.log('No adb device is connected; skipping Android file-open intent test.');
  process.exit(0);
}

try {
  adb('shell', 'pm', 'path', packageName);
} catch {
  console.log(`${packageName} is not installed on the connected device; skipping Android file-open intent test.`);
  process.exit(0);
}

const localDir = join(tmpdir(), 'xkey-adb-intent-test');
mkdirSync(localDir, { recursive: true });
const localPath = join(localDir, 'xkey_adb_intent_test.xkey');
writeFileSync(localPath, JSON.stringify({
  format: 'xkey-backup-v3',
  app: 'xKey',
  source: 'adb-intent-test',
  payload: 'intent-test',
  integrity: { algorithm: 'SHA-256', payloadHash: '0'.repeat(64) },
}, null, 2));

adb('push', localPath, remotePath);
const result = adb(
  'shell',
  'am',
  'start',
  '-W',
  '-a',
  'android.intent.action.VIEW',
  '-d',
  `file://${remotePath}`,
  '-t',
  'application/octet-stream',
  packageName,
);

if (!/Status:\s+ok/i.test(result) && !/Complete/i.test(result)) {
  throw new Error(`Android VIEW intent did not start cleanly:\n${result}`);
}

console.log('Android .xkey ACTION_VIEW intent test started xKey successfully.');
