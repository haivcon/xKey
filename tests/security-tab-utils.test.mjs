import assert from 'node:assert/strict';

import {
  isSixDigitPin,
  parseStoredInt,
  sanitizePinInput,
} from '../src/components/settings/securityTabUtils.ts';

assert.equal(sanitizePinInput('123456'), '123456');
assert.equal(sanitizePinInput('12 34-56abc789'), '123456');
assert.equal(sanitizePinInput('000001'), '000001');
assert.equal(sanitizePinInput('123456789', 4), '1234');

assert.equal(isSixDigitPin('123456'), true);
assert.equal(isSixDigitPin('000001'), true);
assert.equal(isSixDigitPin('12345'), false);
assert.equal(isSixDigitPin('1234567'), false);
assert.equal(isSixDigitPin('12345a'), false);

assert.equal(parseStoredInt('42', 7), 42);
assert.equal(parseStoredInt('not-a-number', 7), 7);
assert.equal(parseStoredInt(null, 7), 7);

console.log('Security tab utility tests passed');