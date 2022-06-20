import { BrowserWindow, shell } from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';

export default async function createWindow(filePath) {
    console.log(shell);
    // Create the browser window.
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
            webSecurity: false, // Allow CORS.
        },
    });

    // Open links in native browser, instead of creating another Electron window.
    win.webContents.setWindowOpenHandler((event) => {
        shell.openExternal(event.url);
    });

    win.once('close', (e) => {
        if (win.documentEdited) {
            e.preventDefault();
            saveFile(null, win, null, () => {
                console.log('Saved!');
                win.setDocumentEdited(false);
                win.close();
            });
        }
    });

    if (filePath) {
        win.once('ready-to-show', () => {
            loadFile(filePath, win);
        });
    }

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
        if (!process.env.IS_TEST) win.webContents.openDevTools();
    } else {
        createProtocol('app');
        // Load the index.html when not in development
        win.loadURL('app://./index.html');
    }
}
