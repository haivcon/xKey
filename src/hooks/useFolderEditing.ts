import { useCallback, useState } from 'react';

type CreateFolderHandler = (name: string) => Promise<unknown>;

export default function useFolderEditing(handleCreateFolder: CreateFolderHandler) {
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const startCreateFolder = useCallback(() => {
    setEditingFolder(null);
    setNewFolderName('');
    setCreatingFolder(true);
  }, []);

  const finishCreateFolder = useCallback(async (name: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setCreatingFolder(false);
      setNewFolderName('');
      return;
    }

    const created = await handleCreateFolder(trimmed);
    if (created) {
      setCreatingFolder(false);
      setNewFolderName('');
    }
  }, [handleCreateFolder]);

  const startEditFolder = useCallback((folderName: string) => {
    setEditingFolder(folderName);
    setEditFolderName(folderName);
  }, []);

  const finishEditFolder = useCallback((oldName: string, newName: string, renameFolder: (oldName: string, newName: string) => void | Promise<void>) => {
    renameFolder(oldName, newName);
    setEditingFolder(null);
  }, []);

  return {
    editingFolder,
    setEditingFolder,
    editFolderName,
    setEditFolderName,
    creatingFolder,
    setCreatingFolder,
    newFolderName,
    setNewFolderName,
    startCreateFolder,
    finishCreateFolder,
    startEditFolder,
    finishEditFolder,
  };
}