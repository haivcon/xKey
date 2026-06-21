import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface XKeyFileOpenResult {
  available: boolean;
  name?: string;
  mimeType?: string;
  size?: number;
  base64?: string;
}

type XKeyFileOpenPlugin = {
  getPendingFile?: () => Promise<XKeyFileOpenResult>;
  addListener?: (
    eventName: 'xkeyFileOpened',
    callback: (file: XKeyFileOpenResult) => void,
  ) => Promise<PluginListenerHandle>;
};

const XKeyFileOpen = registerPlugin<XKeyFileOpenPlugin>('XKeyFileOpen');

export const getPendingXKeyFile = async (): Promise<XKeyFileOpenResult> => {
  if (!XKeyFileOpen?.getPendingFile) return { available: false };
  return XKeyFileOpen.getPendingFile();
};

export const addXKeyFileOpenListener = async (
  callback: (file: XKeyFileOpenResult) => void,
): Promise<PluginListenerHandle | { remove: () => Promise<void> }> => {
  if (!XKeyFileOpen?.addListener) return { remove: async () => {} };
  return XKeyFileOpen.addListener('xkeyFileOpened', callback);
};
