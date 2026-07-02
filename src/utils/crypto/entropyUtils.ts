import { ethers } from 'ethers';
import type { EntropyVerification } from '../../types';

export const ENTROPY_HEALTH_MIN_BYTES = 16;
const ENTROPY_HEALTH_SAMPLE_BYTES = 32;
const ENTROPY_HEALTH_MAX_REPEATED_BYTE_RATIO = 0.5;
const ENTROPY_HEALTH_MIN_UNIQUE_BYTES = 2;

export type EntropySource = Pick<Crypto, 'getRandomValues'> | undefined;

const countUniqueBytes = (bytes: Uint8Array): number => new Set(bytes).size;

const hasSuspiciousRepeatedByte = (bytes: Uint8Array): boolean => {
  const counts = new Map<number, number>();
  let maxCount = 0;

  for (const byte of bytes) {
    const count = (counts.get(byte) || 0) + 1;
    counts.set(byte, count);
    maxCount = Math.max(maxCount, count);
  }

  return maxCount / Math.max(1, bytes.length) > ENTROPY_HEALTH_MAX_REPEATED_BYTE_RATIO;
};

const hasMonotonicSequence = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;

  let increasing = true;
  let decreasing = true;

  for (let index = 1; index < bytes.length; index += 1) {
    increasing &&= bytes[index] === ((bytes[index - 1] + 1) & 0xff);
    decreasing &&= bytes[index] === ((bytes[index - 1] - 1) & 0xff);
  }

  return increasing || decreasing;
};

/**
 * Performs a local runtime sanity check before wallet entropy is used.
 *
 * This is not a statistical proof of randomness. It verifies that a CSPRNG API is
 * available, callable, returns the expected byte length, and does not immediately
 * produce obviously broken output such as all-zero, repeated, or monotonic bytes.
 */
export function assertEntropyQuality(
  source: EntropySource = globalThis.crypto,
  sampleBytes = ENTROPY_HEALTH_SAMPLE_BYTES,
): EntropyVerification {
  const checkedAt = Date.now();
  const safeSampleBytes = Math.max(ENTROPY_HEALTH_MIN_BYTES, Math.floor(sampleBytes));
  const details: string[] = [];

  if (!source || typeof source.getRandomValues !== 'function') {
    return {
      ok: false,
      checkedAt,
      source: 'unavailable',
      sampleBytes: 0,
      uniqueBytes: 0,
      details: ['missing-getRandomValues'],
    };
  }

  try {
    const sample = new Uint8Array(safeSampleBytes);
    const returned = source.getRandomValues(sample);
    const uniqueBytes = countUniqueBytes(sample);

    if (returned !== sample) details.push('unexpected-return-buffer');
    if (sample.length !== safeSampleBytes) details.push('unexpected-sample-size');
    if (uniqueBytes < ENTROPY_HEALTH_MIN_UNIQUE_BYTES) details.push('too-few-unique-bytes');
    if (sample.every(byte => byte === 0)) details.push('all-zero-sample');
    if (hasSuspiciousRepeatedByte(sample)) details.push('repeated-byte-pattern');
    if (hasMonotonicSequence(sample)) details.push('monotonic-byte-pattern');

    sample.fill(0);

    return {
      ok: details.length === 0,
      checkedAt,
      source: 'crypto.getRandomValues',
      sampleBytes: safeSampleBytes,
      uniqueBytes,
      details,
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      source: 'crypto.getRandomValues',
      sampleBytes: safeSampleBytes,
      uniqueBytes: 0,
      details: [error instanceof Error ? error.message : 'getRandomValues-failed'],
    };
  }
}

/**
 * Accumulates entropy from various sources (finger movements, dice rolls, sensors)
 * with explicit framing so adjacent events cannot be concatenated ambiguously.
 */
export class EntropyAccumulator {
  private chunks: Uint8Array[] = [];
  private eventCount = 0;

  constructor() {
    const entropyVerification = assertEntropyQuality();
    if (!entropyVerification.ok) {
      throw new Error(`Entropy source failed verification: ${entropyVerification.details.join(', ') || 'unknown'}`);
    }

    const initialNoise = new Uint8Array(32);
    crypto.getRandomValues(initialNoise);
    this.addChunk('init', initialNoise);
    initialNoise.fill(0);
    this.addString(`${Date.now()}:${performance.now()}:${navigator.userAgent}`);
    this.eventCount = 0;
  }

  private addChunk(type: string, data: Uint8Array) {
    const typeBytes = ethers.toUtf8Bytes(type);
    const frame = new Uint8Array(1 + typeBytes.length + 4 + data.length);
    frame[0] = typeBytes.length;
    frame.set(typeBytes, 1);
    new DataView(frame.buffer).setUint32(1 + typeBytes.length, data.length, false);
    frame.set(data, 1 + typeBytes.length + 4);
    this.chunks.push(frame);
  }

  /**
   * Add string data to the accumulator.
   */
  addString(data: string) {
    this.addChunk('str', ethers.toUtf8Bytes(data));
    this.eventCount++;
  }

  /**
   * Add numeric data (like coordinates, time).
   */
  addNumbers(...numbers: number[]) {
    const bytes = new Uint8Array(numbers.length * 8);
    const view = new DataView(bytes.buffer);
    numbers.forEach((number, index) => {
      view.setFloat64(index * 8, Number.isFinite(number) ? number : 0, false);
    });
    this.addChunk('num', bytes);
    this.eventCount++;
  }

  /**
   * Get the current accumulated seed as a 32-byte hex string (64 chars + 0x).
   */
  getSeedHex(): string {
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const framed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      framed.set(chunk, offset);
      offset += chunk.length;
    }

    return ethers.sha256(framed);
  }

  /**
   * Generate a Mnemonic from the accumulated entropy.
   * @param wordCount 12 or 24 words
   */
  generateMnemonic(wordCount: 12 | 24 = 24): ethers.Mnemonic {
    const seedHex = this.getSeedHex();

    // ethers.Mnemonic.fromEntropy requires exact byte lengths:
    // 16 bytes = 12 words, 32 bytes = 24 words.
    const entropyBytes = wordCount === 12
      ? ethers.getBytes(ethers.dataSlice(seedHex, 0, 16))
      : ethers.getBytes(seedHex);

    return ethers.Mnemonic.fromEntropy(entropyBytes);
  }

  getEventCount() {
    return this.eventCount;
  }
}