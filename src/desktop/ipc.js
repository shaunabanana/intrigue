/* eslint-disable import/no-extraneous-dependencies */
import {
    BrowserWindow, ipcMain, app,
} from 'electron';

ipcMain.on('set-edited', (_, value) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(value);
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('get-packaged', () => app.isPackaged);
