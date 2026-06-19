import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import CryptoJS from 'crypto-js';
import { decryptEnvelope, encryptEnvelope, isCryptoEnvelope } from './cryptoEnvelope';

const encryptBackup = async (data, key) => {
    return encryptEnvelope(data, key);
};

const decryptBackup = async (cipherText, key) => {
    if (isCryptoEnvelope(cipherText)) {
        return decryptEnvelope(cipherText, key);
    }
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) throw new Error("Invalid Key");
    return JSON.parse(decryptedStr);
};

export const createPortableBackupText = async (wallets, config, userPassword) => {
    const backupPayload = {
        version: 2,
        portable: true,
        timestamp: new Date().toISOString(),
        wallets,
        config
    };

    return encryptBackup(backupPayload, userPassword);
};

// #14: Portable backup (uses user-chosen password)
export const exportPortableBackup = async (wallets, config, userPassword) => {
    try {
        const encryptedData = await createPortableBackupText(wallets, config, userPassword);
        const fileName = `xkey_portable_${new Date().getTime()}.xkey`;

        if (!Capacitor.isNativePlatform()) {
            const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            return true;
        }

        // Write to app cache (no permissions needed on any Android version)
        const fileResult = await Filesystem.writeFile({
            path: fileName,
            data: encryptedData,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // Open share sheet so user can save to Downloads, Drive, etc.
        await Share.share({
            title: 'xKey Portable Backup',
            text: 'Password-protected xKey vault backup.',
            url: fileResult.uri,
            dialogTitle: 'Save Portable Backup'
        });

        return true;
    } catch (e) {
        console.error("Portable backup export failed", e);
        return false;
    }
};

export const parseEncryptedBackupText = async (encryptedText, aesKey, userPassword = null) => {
    let decrypted = null;

    if (userPassword) {
        try {
            decrypted = await decryptBackup(encryptedText, userPassword);
        } catch {
            // Password failed
        }
    }

    if (!decrypted) {
        try {
            decrypted = await decryptBackup(encryptedText, aesKey);
        } catch {
            // Device key also failed
        }
    }

    if (!decrypted) {
        throw new Error("Wrong password or corrupted backup file.");
    }

    if (!decrypted.wallets || !Array.isArray(decrypted.wallets)) {
        throw new Error("Invalid backup format");
    }

    return decrypted;
};

// Parse backup file — auto-detect format
export const parseVaultBackupFile = async (base64Data, aesKey, userPassword = null) => {
    try {
        // Try base64 decode first, fallback to raw text (some Capacitor versions return raw data)
        let encryptedText;
        try {
            const binString = atob(base64Data);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i);
            }
            encryptedText = new TextDecoder().decode(bytes);
        } catch {
            // base64 decode failed — treat file.data as raw text
            encryptedText = base64Data;
        }

        return parseEncryptedBackupText(encryptedText, aesKey, userPassword);
    } catch (e) {
        console.error("Backup import failed", e);
        throw new Error(e.message || "Failed to decrypt backup. Check your password and try again.");
    }
};
