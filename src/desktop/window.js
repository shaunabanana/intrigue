/* eslint-disable import/no-extraneous-dependencies */
import {
    app, BrowserWindow, shell, dialog,
} from 'electron';
import { basename, join } from 'path';
import is from 'electron-is';

const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'zotero:']);

function parseIntrigueUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        return { valid: false, error: 'Invalid URL.' };
    }

    const isAppUrl = url.protocol === 'intrigue:';
    const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
    if (!isAppUrl && !isWebUrl) {
        return { valid: false, error: 'URL must be an Intrigue web link or intrigue:// link.' };
    }

    const documentId = url.searchParams.get('document');
    if (!documentId) {
        return { valid: false, error: 'Missing document parameter.' };
    }

    const selection = url.searchParams.get('selection');
    return {
        valid: true,
        documentId,
        shareId: url.searchParams.get('share') || undefined,
        selectionIds: selection
            ? selection.split(',').map((id) => id.trim()).filter(Boolean)
            : [],
    };
}

function normalizeLaunchOptions(launchOptions) {
    if (!launchOptions) return { kind: 'new' };
    if (typeof launchOptions === 'string') {
        return { kind: 'file', filePath: launchOptions };
    }
    return launchOptions;
}

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

function isUsableWindow(window) {
    return window && !window.isDestroyed();
}

function focusWindow(window) {
    if (!isUsableWindow(window)) return false;
    if (window.isMinimized()) window.restore();
    window.focus();
    return true;
}

function sendOpenSelection(window, target) {
    if (!isUsableWindow(window)) return;
    const hasTarget = target.shareId || target.selectionIds?.length > 0;
    if (hasTarget) {
        window.webContents.send('open-selection', {
            shareId: target.shareId,
            selectionIds: target.selectionIds || [],
        });
    }
}

export class EditorWindowManager {
    constructor() {
        this.windows = [];
        this.allowCloseWindows = new WeakSet();
        this.isQuitting = false;
        this.docIdToWindow = new Map();
        this.pendingDocIdToWindow = new Map();
        this.filePathToWindow = new Map();
        this.windowToIdentity = new WeakMap();
    }

    beginQuit() {
        this.isQuitting = true;
    }

    getRegisteredDocWindow(documentId) {
        const activeWindow = this.docIdToWindow.get(documentId);
        if (isUsableWindow(activeWindow)) return activeWindow;
        this.docIdToWindow.delete(documentId);

        const pendingWindow = this.pendingDocIdToWindow.get(documentId);
        if (isUsableWindow(pendingWindow)) return pendingWindow;
        this.pendingDocIdToWindow.delete(documentId);

        return null;
    }

    cleanupWindow(window) {
        const identity = this.windowToIdentity.get(window);
        if (identity?.documentId && this.docIdToWindow.get(identity.documentId) === window) {
            this.docIdToWindow.delete(identity.documentId);
        }
        if (identity?.filePath && this.filePathToWindow.get(identity.filePath) === window) {
            this.filePathToWindow.delete(identity.filePath);
        }
        this.pendingDocIdToWindow.forEach((pendingWindow, documentId) => {
            if (pendingWindow === window) this.pendingDocIdToWindow.delete(documentId);
        });
        this.windows = this.windows.filter((record) => record.window !== window);
    }

    setDocumentIdentity(window, identity = {}) {
        if (!isUsableWindow(window)) return;
        const previousIdentity = this.windowToIdentity.get(window) || {};

        if (
            previousIdentity.documentId
            && this.docIdToWindow.get(previousIdentity.documentId) === window
        ) {
            this.docIdToWindow.delete(previousIdentity.documentId);
        }
        if (
            previousIdentity.filePath
            && this.filePathToWindow.get(previousIdentity.filePath) === window
        ) {
            this.filePathToWindow.delete(previousIdentity.filePath);
        }

        const nextIdentity = {
            documentId: identity.documentId || previousIdentity.documentId,
            filePath: identity.filePath || previousIdentity.filePath,
        };
        this.windowToIdentity.set(window, nextIdentity);

        if (nextIdentity.documentId) {
            if (this.pendingDocIdToWindow.get(nextIdentity.documentId) === window) {
                this.pendingDocIdToWindow.delete(nextIdentity.documentId);
            }
            this.docIdToWindow.set(nextIdentity.documentId, window);
        }
        if (nextIdentity.filePath) {
            this.filePathToWindow.set(nextIdentity.filePath, window);
        }
    }

    async openRemoteDocument(target) {
        const existingWindow = this.getRegisteredDocWindow(target.documentId);
        if (existingWindow) {
            focusWindow(existingWindow);
            sendOpenSelection(existingWindow, target);
            return true;
        }

        await this.createWindow({
            kind: 'remote-document',
            documentId: target.documentId,
            shareId: target.shareId,
            selectionIds: target.selectionIds || [],
        });
        return true;
    }

    async openUrl(url) {
        const parsedUrl = parseIntrigueUrl(url);
        if (!parsedUrl.valid) throw new Error(parsedUrl.error);
        return this.openRemoteDocument(parsedUrl);
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

    closeAfterSave(window, afterClose) {
        let attempts = 0;
        const checkSaved = () => {
            if (window.isDestroyed()) return;
            if (window.documentEdited) {
                attempts += 1;
                if (attempts > 300) return;
                setTimeout(checkSaved, 100);
            } else {
                this.allowCloseWindows.add(window);
                if (afterClose) window.once('closed', afterClose);
                window.close();
            }
        };

        checkSaved();
    }

    async createWindow(launchOptions) {
        const launch = normalizeLaunchOptions(launchOptions);
        const filePath = launch.kind === 'file' ? launch.filePath : null;

        if (filePath) {
            const existingWindow = this.filePathToWindow.get(filePath);
            if (focusWindow(existingWindow)) return existingWindow;
            this.filePathToWindow.delete(filePath);
        }

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

        if (launch.kind === 'remote-document') {
            this.pendingDocIdToWindow.set(launch.documentId, window);
        }

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
            const wasQuitting = this.isQuitting;
            const resumeQuitAfterClose = wasQuitting ? () => app.quit() : null;
            const closeChoice = this.promptToClose(window);
            if (closeChoice === 2) {
                if (wasQuitting) this.isQuitting = false;
                return;
            }

            if (closeChoice === 1) {
                this.allowCloseWindows.add(window);
                if (resumeQuitAfterClose) window.once('closed', resumeQuitAfterClose);
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

            this.closeAfterSave(window, resumeQuitAfterClose);
        });

        window.on('closed', () => {
            this.cleanupWindow(window);
        });

        window.once('ready-to-show', () => {
            if (launch.kind === 'file') {
                app.addRecentDocument(filePath);
                window.setRepresentedFilename(filePath);
                window.setDocumentEdited(false);
                window.setTitle(`${basename(filePath)} - Intrigue`);
                window.webContents.send('set-filepath', filePath);
                this.setDocumentIdentity(window, { filePath });
            } else if (launch.kind === 'remote-document') {
                window.setDocumentEdited(false);
                window.setTitle('Synced Document - Intrigue');
                window.webContents.send('open-remote-document', {
                    documentId: launch.documentId,
                    shareId: launch.shareId,
                    selectionIds: launch.selectionIds || [],
                });
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
                this.setDocumentIdentity(window, { filePath });
                window.webContents.send('set-filepath', filePath, overwrite);
            }
        });
    }
}

export const windowManager = new EditorWindowManager();
