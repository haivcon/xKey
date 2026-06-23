import { Directory, Filesystem } from '@capacitor/filesystem';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (value: string): string => {
  const bytes = textEncoder.encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const fromBase64 = (value: string): string => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return textDecoder.decode(bytes);
};

const sanitizeName = (name: string) => name.replace(/[^a-z0-9._-]/gi, '-');

export type InternalTextRef = {
  kind: 'internal-text-ref';
  path: string;
  createdAt: string;
  bytes: number;
};

export const writeInternalText = async (prefix: string, value: string): Promise<InternalTextRef> => {
  const safePrefix = sanitizeName(prefix || 'xkey');
  const path = `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  await Filesystem.writeFile({
    path,
    data: toBase64(value),
    directory: Directory.Data,
    recursive: true,
  });
  return {
    kind: 'internal-text-ref',
    path,
    createdAt: new Date().toISOString(),
    bytes: textEncoder.encode(value).byteLength,
  };
};

export const readInternalText = async (ref: InternalTextRef): Promise<string> => {
  const result = await Filesystem.readFile({
    path: ref.path,
    directory: Directory.Data,
  });
  return fromBase64(String(result.data || ''));
};

export const deleteInternalText = async (ref: InternalTextRef): Promise<void> => {
  await Filesystem.deleteFile({
    path: ref.path,
    directory: Directory.Data,
  }).catch(() => {});
};

export const parseInternalTextRef = (value: string | null | undefined): InternalTextRef | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<InternalTextRef>;
    if (parsed?.kind === 'internal-text-ref' && typeof parsed.path === 'string') {
      return {
        kind: 'internal-text-ref',
        path: parsed.path,
        createdAt: String(parsed.createdAt || ''),
        bytes: Number(parsed.bytes) || 0,
      };
    }
  } catch {
    return null;
  }
  return null;
};

export const serializeInternalTextRef = (ref: InternalTextRef): string => JSON.stringify(ref);

const getTimestampFromPath = (path: string): number => {
  const match = path.match(/-(\d{12,})-/);
  return match ? Number(match[1]) || 0 : 0;
};

export const cleanupInternalTextFiles = async (prefixes: string[], maxAgeMs: number): Promise<number> => {
  const now = Date.now();
  let deleted = 0;
  try {
    const result = await Filesystem.readdir({ path: '', directory: Directory.Data });
    const files = result.files.map(file => typeof file === 'string' ? file : file.name);
    await Promise.all(files.map(async fileName => {
      if (!prefixes.some(prefix => fileName.startsWith(prefix))) return;
      const createdAt = getTimestampFromPath(fileName);
      if (!createdAt || now - createdAt < maxAgeMs) return;
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Data }).then(() => {
        deleted += 1;
      }).catch(() => {});
    }));
  } catch {
    return deleted;
  }
  return deleted;
};
