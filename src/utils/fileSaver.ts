import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

type SaveResult = { uri: string; fileName: string; size: number; sha256?: string };
type VerifySavedResult = { uri: string; size: number; sha256: string; verified: boolean };
type FileSaverPlugin = {
  saveFile(options: { fileName: string; mimeType: string; sourcePath: string }): Promise<SaveResult>;
  verifySavedFile(options: { uri: string; expectedSha256?: string }): Promise<VerifySavedResult>;
};
const XKeyFileSaver = registerPlugin<FileSaverPlugin>('XKeyFileSaver');

const toBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

export const saveTextFile = async (fileName: string, mimeType: string, text: string): Promise<SaveResult> => {
  if (Capacitor.isNativePlatform()) {
    const sourcePath = `xkey-export-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    await Filesystem.writeFile({ path: sourcePath, data: toBase64(text), directory: Directory.Cache });
    try {
      return await XKeyFileSaver.saveFile({ fileName, mimeType, sourcePath });
    } finally {
      await Filesystem.deleteFile({ path: sourcePath, directory: Directory.Cache }).catch(() => {});
    }
  }
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { uri: '', fileName, size: blob.size };
};

export const verifySavedTextFile = async (uri: string, expectedSha256?: string): Promise<VerifySavedResult> => {
  if (!Capacitor.isNativePlatform()) {
    return { uri, size: -1, sha256: expectedSha256 || '', verified: Boolean(expectedSha256) };
  }
  return XKeyFileSaver.verifySavedFile({ uri, expectedSha256 });
};
