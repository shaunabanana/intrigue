/* eslint-disable import/no-extraneous-dependencies */
import {
    BrowserWindow, ipcMain, app,
} from 'electron';
import { access, readFile, writeFile } from 'fs/promises';

ipcMain.on('set-edited', (_, value) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(value);
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('get-packaged', () => app.isPackaged);

ipcMain.handle('file:access', async (_, filePath) => {
    await access(filePath);
    return true;
});

ipcMain.handle('file:read', async (_, filePath) => readFile(filePath));

ipcMain.handle('file:write', async (_, filePath, data) => {
    await writeFile(filePath, Buffer.from(data));
    return true;
});
