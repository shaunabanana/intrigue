/* eslint-disable import/no-extraneous-dependencies */
import {
    app, BrowserWindow, shell, dialog,
} from 'electron';
import { basename, join } from 'path';
import is from 'electron-is';

const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'zotero:']);

function openExternal(url) {
    try {
        const parsedUrl = new URL(url);
        if (allowedExternalProtocols.has(parsedUrl.protocol)) {
            shell.openExternal(url);
        }
    } catch (error) {
        console.error('[Window][openExternal] Invalid URL.', error);
    }
}

function chooseSavePath(window) {
    return dialog.showSaveDialogSync(window, {
        filters: [
            { name: 'Intrigue Files', extensions: ['intrigue'] },
        ],
        properties: [
            'showOverwriteConfirmation', 'createDirectory',
        ],
    });
}

export class EditorWindowManager {
    constructor() {
        this.windows = [];
        this.allowCloseWindows = new WeakSet();
    }

    promptToClose(window) {
        const hasFilePath = Boolean(this.getFilePath(window));
        const result = dialog.showMessageBoxSync(window, {
            type: 'warning',
            buttons: hasFilePath ? ['Save', "Don't Save", 'Cancel'] : ['Save...', 'Delete', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
            noLink: true,
            message: hasFilePath
                ? 'Do you want to save changes to this document?'
                : 'Do you want to save this new document?',
            detail: hasFilePath
                ? 'Your changes will be lost if you close without saving.'
                : 'This document will be deleted if you close without saving.',
        });

        return result;
    }

    closeAfterSave(window) {
        let attempts = 0;
        const checkSaved = () => {
            if (window.isDestroyed()) return;
            if (window.documentEdited) {
                attempts += 1;
                if (attempts > 300) return;
                setTimeout(checkSaved, 100);
            } else {
                this.allowCloseWindows.add(window);
                window.close();
            }
        };

        checkSaved();
    }

    async createWindow(filePath) {
        // Create the browser window.
        const window = new BrowserWindow({
            width: 960,
            height: 720,
            titleBarStyle: is.macOS() ? 'hidden' : undefined,
            webPreferences: {
                preload: join(__dirname, '../preload/preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                // Existing literature URL metadata fetching depends on cross-origin requests.
                webSecurity: false,
            },
        });

        // Open links in native browser, instead of creating another Electron window.
        window.webContents.setWindowOpenHandler((event) => {
            openExternal(event.url);
            return { action: 'deny' };
        });

        window.on('maximize', () => {
            window.webContents.send('maximize');
        });

        window.on('unmaximize', () => {
            window.webContents.send('unmaximize');
        });

        window.on('close', (e) => {
            if (this.allowCloseWindows.has(window)) {
                this.allowCloseWindows.delete(window);
                return;
            }
            if (!window.documentEdited) return;

            e.preventDefault();
            const closeChoice = this.promptToClose(window);
            if (closeChoice === 2) return;

            if (closeChoice === 1) {
                this.allowCloseWindows.add(window);
                window.close();
                return;
            }

            const savePath = this.getFilePath(window);
            if (savePath) {
                window.webContents.send('save-file');
            } else {
                const newSavePath = chooseSavePath(window);
                if (!newSavePath) return;
                this.setFilePath(window, newSavePath, true);
            }

            this.closeAfterSave(window);
        });

        window.once('ready-to-show', () => {
            if (filePath) {
                app.addRecentDocument(filePath);
                window.setRepresentedFilename(filePath);
                window.setDocumentEdited(false);
                window.setTitle(`${basename(filePath)} - Intrigue`);
                window.webContents.send('set-filepath', filePath);
            } else {
                window.setDocumentEdited(false);
                window.setTitle('Untitled - Intrigue');
                window.webContents.send('new-file');
            }
        });

        if (process.env.ELECTRON_RENDERER_URL) {
            // Load the url of the dev server if in development mode
            await window.loadURL(process.env.ELECTRON_RENDERER_URL);
            if (!process.env.IS_TEST) window.webContents.openDevTools();
        } else {
            // Load the index.html when not in development
            await window.loadFile(join(__dirname, '../renderer/index.html'));
        }

        this.windows.push({
            window,
            filePath,
        });
        return window;
    }

    getFilePath(window) {
        let result = null;
        this.windows.forEach((record) => {
            if (record.window === window) {
                result = record.filePath;
            }
        });
        return result;
    }

    setFilePath(window, filePath, overwrite) {
        this.windows.forEach((record) => {
            if (record.window === window) {
                // eslint-disable-next-line no-param-reassign
                record.filePath = filePath;
                app.addRecentDocument(filePath);
                window.setRepresentedFilename(filePath);
                window.setTitle(`${basename(filePath)} - Intrigue`);
                window.webContents.send('set-filepath', filePath, overwrite);
            }
        });
    }
}

export const windowManager = new EditorWindowManager();
