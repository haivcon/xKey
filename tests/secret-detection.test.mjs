import assert from 'node:assert/strict';

import { CLIPBOARD_POLICIES, getClipboardPolicy, isSecretKind } from '../src/utils/dataSensitivity.ts';
import { detectSecretInText, getSecretPlacementWarning } from '../src/utils/secretDetection.ts';

assert.equal(detectSecretInText('0x' + 'a'.repeat(64)), 'privateKey');

const phrase = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';
assert.equal(detectSecretInText(phrase), 'mnemonic');

assert.equal(detectSecretInText('backup reminder: move funds after tax review'), null);

const warning = getSecretPlacementWarning('0x' + 'b'.repeat(64), 'notes');
assert.match(warning || '', /secret field/i);

assert.equal(getClipboardPolicy('privateKey').sensitivity, 'critical_secret');
assert.equal(getClipboardPolicy('mnemonic').sensitivity, 'recovery_material');
assert.equal(getClipboardPolicy('address').sensitivity, 'public');
assert.equal(isSecretKind('privateKey'), true);
assert.equal(isSecretKind('mnemonic'), true);
assert.equal(isSecretKind('sensitiveNote'), true);
assert.equal(isSecretKind('address'), false);
assert.ok(CLIPBOARD_POLICIES.privateKey.defaultClearAfterMs < CLIPBOARD_POLICIES.address.defaultClearAfterMs);

const { resolveCopyFieldKind } = await import('../src/utils/dataSensitivity.ts');
for (const field of ['pk', 'privateKey', 'pk_0', 'pk_123', 'privateKey-abc']) {
  assert.equal(resolveCopyFieldKind(field), 'privateKey');
}
for (const field of ['mn', 'mn_0', 'mnemonic', 'seedPhrase', 'seed_2']) {
  assert.equal(resolveCopyFieldKind(field), 'mnemonic');
}
for (const field of ['address', 'addr_0', 'vanity-extra-2', 'vanity-result-0', 'vanity-found-0', 'vanity-found-12', 'vanity-candidate-3']) {
  assert.equal(resolveCopyFieldKind(field), 'address');
}
assert.equal(resolveCopyFieldKind('unknown'), 'generic');
console.log('Secret detection and clipboard policy tests passed');