/* eslint-disable import/no-extraneous-dependencies */
import {
    BrowserWindow, ipcMain,
} from 'electron';

ipcMain.on('set-edited', (_, value) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(value);
});
