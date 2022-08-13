/* eslint-disable import/no-extraneous-dependencies */
import {
    app, dialog, BrowserWindow, ipcMain, shell,
} from 'electron';

import { windowManager } from './window';

const isMac = process.platform === 'darwin';

ipcMain.on('set-edited', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(true);
});

export function saveFile(item, window) {
    const filePath = windowManager.getFilePath(window);
    if (filePath) {
        // Manually save file here.
    } else {
        const savePath = dialog.showSaveDialogSync(window, {
            filters: [
                { name: 'Intrigue Files', extensions: ['intrigue'] },
            ],
            properties: [
                'showOverwriteConfirmation', 'createDirectory',
            ],
        });
        windowManager.setFilePath(window, savePath);
    }
}

function openInNewWindow() {
    let openPath = dialog.showOpenDialogSync({
        filters: [
            { name: 'Intrigue Files', extensions: ['intrigue'] },
        ],
        properties: [
            'openFile', 'createDirectory',
        ],
    });
    if (!openPath) return;
    // eslint-disable-next-line prefer-destructuring
    openPath = openPath[0];

    // loadFile(openPath, window, callback);
    windowManager.createWindow(openPath);
}

export function openFile(item, window) {
    if (window && !window.documentEdited) {
        saveFile(null, window, null, () => {
            window.close();
            openInNewWindow();
        });
    } else {
        openInNewWindow();
    }
}

function newFile() {
    windowManager.createWindow();
}

export function Undo(item, window) {
    window.webContents.send('undo');
}

export function Redo(item, window) {
    window.webContents.send('redo');
}

export function Cut(item, window) {
    window.webContents.send('cut');
}

export function Copy(item, window) {
    window.webContents.send('copy');
}

export function Paste(item, window) {
    window.webContents.send('paste');
}

export function SelectAll(item, window) {
    window.webContents.send('selectall');
}

export const menuTemplate = [
    // { role: 'appMenu' }
    ...(isMac ? [{
        label: app.name,
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            {
                label: 'Preferences...',
                accelerator: 'CommandOrControl+,',
            },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
        ],
    }] : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            {
                label: 'New...',
                click: newFile,
                accelerator: 'CommandOrControl+N',
            },
            {
                label: 'Open...',
                click: openFile,
                accelerator: 'CommandOrControl+O',
            },
            {
                role: 'recentdocuments',
                submenu: [
                    {
                        label: 'Clear Recent',
                        role: 'clearrecentdocuments',
                    },
                ],
            },
            { type: 'separator' },
            {
                label: 'Save',
                click: saveFile,
                accelerator: 'CommandOrControl+S',
            },
            {
                label: 'Save As...',
                click: () => { console.log('save as'); },
                accelerator: 'CommandOrControl+Shift+S',
            },
            // { type: 'separator' },
            // { label: 'Print...' },
            // isMac ? { role: 'close' } : { role: 'quit' }
        ],
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            // {
            //     label: 'Undo',
            //     click: Undo,
            //     accelerator: 'CommandOrControl+Z'
            // },
            // {
            //     label: 'Redo',
            //     click: Redo,
            //     accelerator: 'Shift+CommandOrControl+X'
            // },
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            // {
            //     label: 'Cut',
            //     click: Cut,
            //     accelerator: 'CommandOrControl+X',
            // },
            // {
            //     label: 'Copy',
            //     click: Copy,
            //     accelerator: 'CommandOrControl+C',
            // },
            // {
            //     label: 'Paste',
            //     click: Paste,
            //     accelerator: 'CommandOrControl+V',
            // },
            ...(isMac ? [
                { role: 'delete' },
                {
                    label: 'Select All',
                    click: SelectAll,
                    accelerator: 'CommandOrControl+A',
                },
            ] : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' },
            ]),
        ],
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    },
    // { role: 'windowMenu' }
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'close' },
            ] : [
                { role: 'close' },
            ]),
        ],
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click: async () => {
                    await shell.openExternal('https://github.com/shaunabanana/intrigue');
                },
            },
        ],
    },
];
