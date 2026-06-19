import assert from 'node:assert/strict';
import {
  assembleShamirShareFromPages,
  combineShamirShares,
  createShamirSharePages,
} from '../src/utils/shamir.js';

const secret = `xkey-backup:${'abcdef0123456789'.repeat(500)}`;
const pages = await createShamirSharePages(secret);

assert.equal(new Set(pages.map(page => page.part)).size, 3);
assert.ok(pages.length > 3, 'large backup should be split into multiple QR pages');

const pagesByPart = [1, 2, 3].map(part => pages.filter(page => page.part === part));
const shares = [];
for (const partPages of pagesByPart) {
  shares.push(await assembleShamirShareFromPages(partPages));
}

for (const pair of [[0, 1], [0, 2], [1, 2]]) {
  const restored = combineShamirShares(pair.map(index => shares[index]));
  assert.equal(restored, secret, `pair ${pair.join(',')} should restore`);
}

assert.throws(() => combineShamirShares([shares[0]]), /At least 2 shares/);
assert.throws(() => combineShamirShares([shares[0], shares[0]]), /Duplicate/);

const corruptedPage = { ...pagesByPart[0][0], data: `${pagesByPart[0][0].data.slice(0, -1)}A` };
await assert.rejects(() => assembleShamirShareFromPages([corruptedPage, ...pagesByPart[0].slice(1)]), /checksum/i);

const largeSecret = `xkey-large-backup:${'abcdef0123456789'.repeat(7000)}`;
const largePages = await createShamirSharePages(largeSecret);
const largeShares = [];
for (const part of [1, 2]) {
  largeShares.push(await assembleShamirShareFromPages(largePages.filter(page => page.part === part)));
}
assert.equal(combineShamirShares(largeShares), largeSecret, 'large backup should not exceed getRandomValues limits');

console.log('Shamir tests passed');
