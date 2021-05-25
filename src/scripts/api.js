const { app, dialog, BrowserWindow, Menu, ipcMain } = require('electron');
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
const fs = require('fs');
const path = require('path');

const isMac = process.platform === 'darwin'

const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
        label: app.name,
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    }] : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            {
                label: 'New...',
                click: createWindow,
                accelerator: 'CommandOrControl+N'
            },
            { 
                label: 'Open...',
                click: openFile,
                accelerator: 'CommandOrControl+O'
            },
            { role: 'recentDocuments' },
            { type: 'separator' },
            { 
                label: 'Save',
                click: saveFile,
                accelerator: 'CommandOrControl+S'
            },
            { 
                label: 'Save As...',
                click: () => {console.log('save as')},
                accelerator: 'CommandOrControl+Shift+S'
            },
            // { type: 'separator' },
            // { label: 'Print...' },
            // isMac ? { role: 'close' } : { role: 'quit' }
        ]
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { 
                label: 'Cut',
                click: Cut,
                accelerator: 'CommandOrControl+X'
            },
            { 
                label: 'Copy',
                click: Copy,
                accelerator: 'CommandOrControl+C'
            },
            { 
                label: 'Paste',
                click: Paste,
                accelerator: 'CommandOrControl+V'
            },
            ...(isMac ? [
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                    label: 'Speech',
                    submenu: [
                        { role: 'startSpeaking' },
                        { role: 'stopSpeaking' }
                    ]
                }
            ] : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ])
        ]
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
            { role: 'togglefullscreen' }
        ]
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
                { role: 'window' }
            ] : [
                { role: 'close' }
            ])
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                }
            }
        ]
    }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


ipcMain.on('set-edited', () => {
    let window = BrowserWindow.getFocusedWindow();
    if (window) window.setDocumentEdited(true);
});


export async function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
            // preload: path.join(__dirname, 'preload.js')
        }
    });

    win.on('close', (e) => {
        if (win.documentEdited) {
            e.preventDefault();
            saveFile(null, win, null, () => {
                console.log('Saved!');
                win.close();
            });
        }
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
}


export function openFile(item, window, event, callback) {
    let openPath = dialog.showOpenDialogSync(window, {
        defaultPath: app.getPath('home'),
        filters: [
            { name: 'Intrigue Files', extensions: ['intrigue'] }
        ],
        properties: [
            'openFile', 'createDirectory'
        ]
    })
    if (!openPath) return;
    openPath = openPath[0];

    fs.readFile(openPath, 'utf8', (err, data) => {
        if (err) throw err;
        window.webContents.send('set-filepath', openPath);
        window.webContents.send('set-data', data);
        window.setRepresentedFilename(openPath);
        window.setDocumentEdited(false);
        window.setTitle(path.parse(openPath).name + ' - Intrigue')
        if (callback) callback();
    })
}


export function saveFile(item, window, event, callback) {
    window.webContents.send('get-data');
    ipcMain.on('send-data', (event, edited, filePath, data) => {
        if (!edited) {
            if (callback) callback();
            return;
        }
        let savePath = null;
        if (filePath) {
            savePath = filePath;
        } else {
            savePath = dialog.showSaveDialogSync(window, {
                defaultPath: app.getPath('home'),
                filters: [
                    { name: 'Intrigue Files', extensions: ['intrigue'] }
                ],
                properties: [
                    'showOverwriteConfirmation', 'createDirectory'
                ]
            })
            if (!savePath) {
                if (callback) callback();
                return;
            }
        }

        const bytes = new Uint8Array(Buffer.from(data));
        fs.writeFile(savePath, bytes, (err) => {
            if (err) throw err;
            window.webContents.send('set-filepath', savePath);
            window.webContents.send('save-finish');
            window.setRepresentedFilename(savePath);
            window.setDocumentEdited(false);

            window.setTitle(path.parse(savePath).name + ' - Intrigue')

            if (callback) callback();
        })
    });
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