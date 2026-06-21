import { registerPlugin } from '@capacitor/core';

const XKeyFileOpen = registerPlugin('XKeyFileOpen');

export const getPendingXKeyFile = async () => {
  if (!XKeyFileOpen?.getPendingFile) return { available: false };
  return XKeyFileOpen.getPendingFile();
};

export const addXKeyFileOpenListener = async (callback) => {
  if (!XKeyFileOpen?.addListener) return { remove: async () => {} };
  return XKeyFileOpen.addListener('xkeyFileOpened', callback);
};
