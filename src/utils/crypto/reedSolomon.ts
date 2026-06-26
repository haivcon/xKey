const PRIMITIVE_POLY = 0x11d;
const FIELD_SIZE = 256;
const DATA_SHARDS = 10;
const PARITY_SHARDS = 5;

const expTable = new Uint8Array(FIELD_SIZE * 2);
const logTable = new Uint8Array(FIELD_SIZE);

let x = 1;
for (let i = 0; i < FIELD_SIZE - 1; i += 1) {
  expTable[i] = x;
  logTable[x] = i;
  x <<= 1;
  if (x & FIELD_SIZE) x ^= PRIMITIVE_POLY;
}
for (let i = FIELD_SIZE - 1; i < expTable.length; i += 1) {
  expTable[i] = expTable[i - (FIELD_SIZE - 1)];
}

type ReedSolomonOptions = {
  dataShards?: number;
  parityShards?: number;
};

export type ReedSolomonEncoded = {
  algorithm: 'reed-solomon-gf256-v1';
  dataShards: number;
  parityShards: number;
  overheadPercent: number;
  shardSize: number;
  originalLength: number;
  data: Uint8Array[];
  parity: Uint8Array[];
};

type ReedSolomonDecodeInput = {
  shards: Uint8Array[];
  present: boolean[];
  dataShards: number;
  parityShards: number;
  originalLength: number;
};

const gfMul = (a: number, b: number): number => {
  if (a === 0 || b === 0) return 0;
  return expTable[logTable[a] + logTable[b]];
};

const gfDiv = (a: number, b: number): number => {
  if (b === 0) throw new Error('Reed-Solomon division by zero.');
  if (a === 0) return 0;
  return expTable[logTable[a] + 255 - logTable[b]];
};

const gfPow = (a: number, n: number): number => {
  if (n === 0) return 1;
  if (a === 0) return 0;
  return expTable[(logTable[a] * n) % 255];
};

const buildMatrix = (dataShards: number, parityShards: number): Uint8Array[] => {
  const rows: Uint8Array[] = [];
  for (let row = 0; row < dataShards; row += 1) {
    const identity = new Uint8Array(dataShards);
    identity[row] = 1;
    rows.push(identity);
  }
  for (let row = 0; row < parityShards; row += 1) {
    const parity = new Uint8Array(dataShards);
    const base = row + 1;
    for (let col = 0; col < dataShards; col += 1) {
      parity[col] = gfPow(base, col);
    }
    rows.push(parity);
  }
  return rows;
};

const invertMatrix = (matrix: Uint8Array[]): Uint8Array[] => {
  const n = matrix.length;
  const augmented = matrix.map((row, index) => {
    const next = new Uint8Array(n * 2);
    next.set(row, 0);
    next[n + index] = 1;
    return next;
  });

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    while (pivot < n && augmented[pivot][col] === 0) pivot += 1;
    if (pivot === n) throw new Error('Reed-Solomon matrix is not invertible.');
    if (pivot !== col) {
      const temp = augmented[pivot];
      augmented[pivot] = augmented[col];
      augmented[col] = temp;
    }

    const pivotValue = augmented[col][col];
    if (pivotValue !== 1) {
      for (let j = 0; j < n * 2; j += 1) augmented[col][j] = gfDiv(augmented[col][j], pivotValue);
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      if (factor === 0) continue;
      for (let j = 0; j < n * 2; j += 1) {
        augmented[row][j] ^= gfMul(factor, augmented[col][j]);
      }
    }
  }

  return augmented.map(row => row.slice(n));
};

export const reedSolomonDefaults = {
  dataShards: DATA_SHARDS,
  parityShards: PARITY_SHARDS,
  overheadPercent: Math.round((PARITY_SHARDS / DATA_SHARDS) * 100),
};

export const encodeReedSolomon = (bytes: Uint8Array, options: ReedSolomonOptions = {}): ReedSolomonEncoded => {
  const dataShards = options.dataShards || DATA_SHARDS;
  const parityShards = options.parityShards || PARITY_SHARDS;
  const shardSize = Math.max(1, Math.ceil(bytes.length / dataShards));
  const data = Array.from({ length: dataShards }, (_, index) => {
    const shard = new Uint8Array(shardSize);
    shard.set(bytes.slice(index * shardSize, Math.min((index + 1) * shardSize, bytes.length)));
    return shard;
  });
  const matrix = buildMatrix(dataShards, parityShards);
  const parity: Uint8Array[] = [];
  for (let row = dataShards; row < dataShards + parityShards; row += 1) {
    const shard = new Uint8Array(shardSize);
    for (let col = 0; col < dataShards; col += 1) {
      const coef = matrix[row][col];
      for (let i = 0; i < shardSize; i += 1) shard[i] ^= gfMul(coef, data[col][i]);
    }
    parity.push(shard);
  }
  return {
    algorithm: 'reed-solomon-gf256-v1',
    dataShards,
    parityShards,
    overheadPercent: Math.round((parityShards / dataShards) * 100),
    shardSize,
    originalLength: bytes.length,
    data,
    parity,
  };
};

export const decodeReedSolomon = ({ shards, present, dataShards, parityShards, originalLength }: ReedSolomonDecodeInput): Uint8Array => {
  const availableIndexes = present
    .map((ok, index) => ok ? index : -1)
    .filter(index => index >= 0)
    .slice(0, dataShards);
  if (availableIndexes.length < dataShards) {
    throw new Error(`Reed-Solomon recovery needs at least ${dataShards} healthy shards.`);
  }

  const matrix = buildMatrix(dataShards, parityShards);
  const decodeMatrix = invertMatrix(availableIndexes.map(index => matrix[index]));
  const shardSize = shards[availableIndexes[0]].length;
  const recovered = Array.from({ length: dataShards }, () => new Uint8Array(shardSize));

  for (let row = 0; row < dataShards; row += 1) {
    for (let col = 0; col < dataShards; col += 1) {
      const coef = decodeMatrix[row][col];
      if (coef === 0) continue;
      const input = shards[availableIndexes[col]];
      for (let i = 0; i < shardSize; i += 1) recovered[row][i] ^= gfMul(coef, input[i]);
    }
  }

  const output = new Uint8Array(dataShards * shardSize);
  recovered.forEach((shard, index) => output.set(shard, index * shardSize));
  return output.slice(0, originalLength);
};
