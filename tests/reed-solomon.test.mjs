import assert from 'node:assert/strict';
import { decodeReedSolomon, encodeReedSolomon, reedSolomonDefaults } from '../src/utils/reedSolomon.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const source = encoder.encode('xKey Reed-Solomon recovery test payload '.repeat(64));

const encoded = encodeReedSolomon(source, reedSolomonDefaults);
const shards = [...encoded.data, ...encoded.parity];
const present = shards.map(() => true);

present[1] = false;
present[3] = false;
present[5] = false;
present[8] = false;
present[9] = false;
shards[1] = new Uint8Array(encoded.shardSize);
shards[3] = new Uint8Array(encoded.shardSize);
shards[5] = new Uint8Array(encoded.shardSize);
shards[8] = new Uint8Array(encoded.shardSize);
shards[9] = new Uint8Array(encoded.shardSize);

const repaired = decodeReedSolomon({
  shards,
  present,
  dataShards: encoded.dataShards,
  parityShards: encoded.parityShards,
  originalLength: encoded.originalLength,
});

assert.equal(decoder.decode(repaired), decoder.decode(source));

present[0] = false;
assert.throws(() => decodeReedSolomon({
  shards,
  present,
  dataShards: encoded.dataShards,
  parityShards: encoded.parityShards,
  originalLength: encoded.originalLength,
}), /needs at least 10 healthy shards/);

console.log('Reed-Solomon recovery test passed.');
