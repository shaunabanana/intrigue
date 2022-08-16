/* eslint-disable import/no-extraneous-dependencies */
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import {
    app, BrowserWindow, shell,
} from 'electron';
import { basename } from 'path';

export class EditorWindowManager {
    constructor() {
        this.windows = [];
    }

    async createWindow(filePath) {
        // Create the browser window.
        const window = new BrowserWindow({
            width: 960,
            height: 720,
            titleBarStyle: 'hidden',
            webPreferences: {
                nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
                contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
                webSecurity: false, // Allow CORS.
                // preload: path.join(__dirname, 'preload.js')
            },
        });

        // Open links in native browser, instead of creating another Electron window.
        window.webContents.setWindowOpenHandler((event) => {
            shell.openExternal(event.url);
        });

        window.once('close', (e) => {
            if (window.documentEdited) {
                e.preventDefault();
                // saveFile(null, window, null, () => {
                //     console.log('Saved!');
                //     window.setDocumentEdited(false);
                //     window.close();
                // });
            }
        });

        window.once('ready-to-show', () => {
            if (filePath) {
                app.addRecentDocument(filePath);
                window.setRepresentedFilename(filePath);
                window.setDocumentEdited(false);
                window.setTitle(`${basename(filePath)} - Intrigue`);
                window.webContents.send('set-filepath', filePath);
            } else {
                window.setDocumentEdited(true);
                window.setTitle('Untitled - Intrigue');
                window.webContents.send('new-file');
            }
        });

        if (process.env.WEBPACK_DEV_SERVER_URL) {
            // Load the url of the dev server if in development mode
            await window.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
            if (!process.env.IS_TEST) window.webContents.openDevTools();
        } else {
            createProtocol('app');
            // Load the index.html when not in development
            window.loadURL('app://./index.html');
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
