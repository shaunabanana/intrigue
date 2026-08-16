/* eslint-disable import/no-extraneous-dependencies */
import {
    BrowserWindow, ipcMain, app,
} from 'electron';
import { access, readFile, writeFile } from 'fs/promises';
import { windowManager } from './window';
import settingsStore from './store';

ipcMain.on('set-edited', (_, value) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(value);
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('get-packaged', () => app.isPackaged);

ipcMain.on('document-identity', (event, identity) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) windowManager.setDocumentIdentity(window, identity);
});

ipcMain.handle('open-url', async (_, url) => windowManager.openUrl(url));

ipcMain.handle('file:access', async (_, filePath) => {
    await access(filePath);
    return true;
});

ipcMain.handle('file:read', async (_, filePath) => readFile(filePath));

ipcMain.handle('file:write', async (_, filePath, data) => {
    await writeFile(filePath, Buffer.from(data));
    return true;
});

ipcMain.handle('settings:get', (_, key) => {
    const value = settingsStore.get(key);
    return value === undefined ? null : value;
});

ipcMain.handle('settings:set', (_, key, value) => {
    settingsStore.set(key, value);
    return true;
});

ipcMain.handle('settings:delete', (_, key) => {
    settingsStore.delete(key);
    return true;
});
