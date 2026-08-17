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

ipcMain.handle('settings:set', (event, key, value) => {
    settingsStore.set(key, value);
    // Keep every other window in sync. Each BrowserWindow is its own renderer
    // process (and thus its own useSettings singleton), so a change made in one
    // window — e.g. the color scheme in the preferences window — must be pushed
    // to the rest, such as the open document windows, so their themes update.
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    BrowserWindow.getAllWindows().forEach((win) => {
        if (win && !win.isDestroyed() && win !== senderWindow) {
            win.webContents.send('settings:changed', key, value);
        }
    });
    return true;
});

ipcMain.handle('settings:delete', (_, key) => {
    settingsStore.delete(key);
    return true;
});
