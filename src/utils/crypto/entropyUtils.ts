import { ethers } from 'ethers';

/**
 * Accumulates entropy from various sources (finger movements, dice rolls, sensors)
 * with explicit framing so adjacent events cannot be concatenated ambiguously.
 */
export class EntropyAccumulator {
  private chunks: Uint8Array[] = [];
  private eventCount = 0;

  constructor() {
    const initialNoise = new Uint8Array(32);
    crypto.getRandomValues(initialNoise);
    this.addChunk('init', initialNoise);
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