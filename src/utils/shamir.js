const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const FIELD_POLY = 0x11b;
const PAGE_DATA_SIZE = 700;

const bytesToBase64 = (bytes) => {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const getWebCrypto = () => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('WebCrypto is not available.');
  }
  return webCrypto;
};

const fillRandomBytes = (bytes) => {
  const webCrypto = getWebCrypto();
  const maxChunkSize = 65536;
  for (let offset = 0; offset < bytes.length; offset += maxChunkSize) {
    webCrypto.getRandomValues(bytes.subarray(offset, offset + maxChunkSize));
  }
  return bytes;
};

const gfMul = (a, b) => {
  let x = a;
  let y = b;
  let result = 0;
  while (y > 0) {
    if (y & 1) result ^= x;
    y >>= 1;
    x <<= 1;
    if (x & 0x100) x ^= FIELD_POLY;
  }
  return result & 0xff;
};

const gfPow = (a, power) => {
  let result = 1;
  for (let i = 0; i < power; i += 1) result = gfMul(result, a);
  return result;
};

const gfInv = (a) => {
  if (a === 0) throw new Error('Cannot invert zero in GF(256).');
  return gfPow(a, 254);
};

const gfDiv = (a, b) => gfMul(a, gfInv(b));

const randomId = () => {
  const bytes = fillRandomBytes(new Uint8Array(8));
  return bytesToBase64(bytes).replace(/[+/=]/g, '').slice(0, 10);
};

const sha256Base64 = async (text) => {
  const digest = await getWebCrypto().subtle.digest('SHA-256', TEXT_ENCODER.encode(text));
  return bytesToBase64(new Uint8Array(digest));
};

export const createShamirShares = async (secretText, { total = 3, threshold = 2 } = {}) => {
  if (total !== 3 || threshold !== 2) {
    throw new Error('xKey currently supports 2-of-3 Shamir backups.');
  }

  const secret = TEXT_ENCODER.encode(secretText);
  const slopes = fillRandomBytes(new Uint8Array(secret.length));
  const id = randomId();

  return [1, 2, 3].map((x, index) => {
    const data = new Uint8Array(secret.length);
    for (let i = 0; i < secret.length; i += 1) {
      data[i] = secret[i] ^ gfMul(slopes[i], x);
    }
    return {
      _xkey: 'shamir-backup',
      version: 1,
      id,
      threshold,
      total,
      part: index + 1,
      x,
      length: secret.length,
      data: bytesToBase64(data),
    };
  });
};

export const parseShamirShare = (value) => {
  const share = typeof value === 'string' ? JSON.parse(value) : value;
  if (share?._xkey !== 'shamir-backup' || share.version !== 1) {
    throw new Error('Not an xKey Shamir backup QR.');
  }
  if (
    share.threshold !== 2 ||
    share.total !== 3 ||
    !Number.isInteger(share.part) ||
    !Number.isInteger(share.x) ||
    share.part < 1 ||
    share.part > 3 ||
    share.x < 1 ||
    share.x > 3 ||
    typeof share.data !== 'string' ||
    typeof share.id !== 'string' ||
    !Number.isInteger(share.length) ||
    share.length < 0
  ) {
    throw new Error('Invalid Shamir backup share.');
  }
  const bytes = base64ToBytes(share.data);
  if (bytes.length !== share.length) throw new Error('Invalid Shamir backup share length.');
  return share;
};

export const createShamirSharePages = async (secretText, options = {}) => {
  const shares = await createShamirShares(secretText, options);
  const pages = [];

  for (const share of shares) {
    const shareData = share.data;
    const shareChecksum = await sha256Base64(shareData);
    const totalPages = Math.ceil(shareData.length / PAGE_DATA_SIZE);

    for (let page = 1; page <= totalPages; page += 1) {
      const data = shareData.slice((page - 1) * PAGE_DATA_SIZE, page * PAGE_DATA_SIZE);
      pages.push({
        _xkey: 'shamir-backup-page',
        version: 1,
        id: share.id,
        threshold: share.threshold,
        total: share.total,
        part: share.part,
        x: share.x,
        length: share.length,
        page,
        totalPages,
        shareChecksum,
        data,
        pageChecksum: await sha256Base64(`${share.id}:${share.part}:${page}:${data}`),
      });
    }
  }

  return pages;
};

export const parseShamirQr = (value) => {
  const payload = typeof value === 'string' ? JSON.parse(value) : value;
  if (payload?._xkey === 'shamir-backup') {
    return { type: 'share', share: parseShamirShare(payload) };
  }
  if (payload?._xkey !== 'shamir-backup-page' || payload.version !== 1) {
    throw new Error('Not an xKey Shamir backup QR.');
  }
  if (
    payload.threshold !== 2 ||
    payload.total !== 3 ||
    !Number.isInteger(payload.part) ||
    !Number.isInteger(payload.x) ||
    !Number.isInteger(payload.page) ||
    !Number.isInteger(payload.totalPages) ||
    !Number.isInteger(payload.length) ||
    payload.part < 1 ||
    payload.part > 3 ||
    payload.x < 1 ||
    payload.x > 3 ||
    payload.page < 1 ||
    payload.totalPages < 1 ||
    payload.page > payload.totalPages ||
    payload.length < 0 ||
    typeof payload.id !== 'string' ||
    typeof payload.data !== 'string' ||
    typeof payload.shareChecksum !== 'string' ||
    typeof payload.pageChecksum !== 'string'
  ) {
    throw new Error('Invalid Shamir backup page.');
  }
  return { type: 'page', page: payload };
};

export const verifyShamirPage = async (page) => {
  const checksum = await sha256Base64(`${page.id}:${page.part}:${page.page}:${page.data}`);
  if (checksum !== page.pageChecksum) throw new Error('Shamir backup page checksum failed.');
  return page;
};

export const assembleShamirShareFromPages = async (pages) => {
  if (!Array.isArray(pages) || pages.length === 0) throw new Error('No Shamir pages to assemble.');
  const first = pages[0];
  const byPage = new Map();
  for (const rawPage of pages) {
    const page = await verifyShamirPage(rawPage);
    if (
      page.id !== first.id ||
      page.part !== first.part ||
      page.x !== first.x ||
      page.length !== first.length ||
      page.totalPages !== first.totalPages ||
      page.shareChecksum !== first.shareChecksum
    ) {
      throw new Error('Shamir pages do not belong to the same part.');
    }
    byPage.set(page.page, page);
  }
  if (byPage.size !== first.totalPages) throw new Error('Missing Shamir backup pages.');

  let data = '';
  for (let page = 1; page <= first.totalPages; page += 1) {
    const item = byPage.get(page);
    if (!item) throw new Error('Missing Shamir backup page.');
    data += item.data;
  }
  const checksum = await sha256Base64(data);
  if (checksum !== first.shareChecksum) throw new Error('Shamir share checksum failed.');

  return parseShamirShare({
    _xkey: 'shamir-backup',
    version: 1,
    id: first.id,
    threshold: first.threshold,
    total: first.total,
    part: first.part,
    x: first.x,
    length: first.length,
    data,
  });
};

export const combineShamirShares = (shares) => {
  const parsed = shares.map(parseShamirShare);
  if (parsed.length < 2) throw new Error('At least 2 shares are required.');

  const [a, b] = parsed;
  if (a.id !== b.id) throw new Error('Shares are from different backups.');
  if (a.x === b.x) throw new Error('Duplicate Shamir backup share.');
  if (a.length !== b.length) throw new Error('Share lengths do not match.');

  const ya = base64ToBytes(a.data);
  const yb = base64ToBytes(b.data);
  if (ya.length !== a.length || yb.length !== a.length) {
    throw new Error('Corrupted Shamir backup share.');
  }

  const secret = new Uint8Array(a.length);
  const denomA = a.x ^ b.x;
  const denomB = b.x ^ a.x;
  const coeffA = gfDiv(b.x, denomA);
  const coeffB = gfDiv(a.x, denomB);

  for (let i = 0; i < secret.length; i += 1) {
    secret[i] = gfMul(ya[i], coeffA) ^ gfMul(yb[i], coeffB);
  }

  return TEXT_DECODER.decode(secret);
};
