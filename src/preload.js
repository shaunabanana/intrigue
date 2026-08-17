/* eslint-disable import/no-extraneous-dependencies */
import { contextBridge, ipcRenderer } from 'electron';

function on(channel, callback) {
    const listener = (_, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('intrigue', {
    isElectron: true,
    platform: process.platform,
    isMacOS: process.platform === 'darwin',
    basename(filePath) {
        return filePath.split(/[\\/]/).pop();
    },
    setEdited(value) {
        ipcRenderer.send('set-edited', value);
    },
    setDocumentIdentity(identity) {
        ipcRenderer.send('document-identity', identity);
    },
    openUrl(url) {
        return ipcRenderer.invoke('open-url', url);
    },
    getVersion() {
        return ipcRenderer.invoke('get-version');
    },
    getPackaged() {
        return ipcRenderer.invoke('get-packaged');
    },
    onNewFile(callback) {
        return on('new-file', callback);
    },
    onSetFilePath(callback) {
        return on('set-filepath', callback);
    },
    onSaveFile(callback) {
        return on('save-file', callback);
    },
    onOpenRemoteDocument(callback) {
        return on('open-remote-document', callback);
    },
    onOpenSelection(callback) {
        return on('open-selection', callback);
    },
    onOpenPreferences(callback) {
        return on('open-preferences', callback);
    },
    onSettingsChanged(callback) {
        return on('settings:changed', callback);
    },
    settings: {
        get(key) {
            return ipcRenderer.invoke('settings:get', key);
        },
        set(key, value) {
            return ipcRenderer.invoke('settings:set', key, value);
        },
        delete(key) {
            return ipcRenderer.invoke('settings:delete', key);
        },
    },
    files: {
        access(filePath) {
            return ipcRenderer.invoke('file:access', filePath);
        },
        readFile(filePath) {
            return ipcRenderer.invoke('file:read', filePath).then((data) => Uint8Array.from(data));
        },
        writeFile(filePath, data) {
            return ipcRenderer.invoke('file:write', filePath, data);
        },
    },
});
