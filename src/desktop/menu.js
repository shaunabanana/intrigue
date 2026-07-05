/* eslint-disable import/no-extraneous-dependencies */
import {
    app, dialog, BrowserWindow, shell, clipboard,
} from 'electron';
import { join } from 'path';

import { windowManager } from './window';

const isMac = process.platform === 'darwin';
let openUrlWindow = null;

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function looksLikeIntrigueUrl(value) {
    return typeof value === 'string'
        && (/^intrigue:\/\/open\?/.test(value) || /^https?:\/\/.*[?&]document=/.test(value));
}

function createOpenUrlPromptHtml(prefillValue) {
    const prefill = escapeHtml(prefillValue);
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Open URL</title>
    <style>
        :root { color-scheme: light dark; }
        body {
            margin: 0;
            padding: 1rem;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: Canvas;
            color: CanvasText;
        }
        label {
            display: block;
            margin-bottom: 0.4rem;
            font-size: 0.86rem;
            font-weight: 600;
        }
        input {
            box-sizing: border-box;
            width: 100%;
            padding: 0.45rem 0.55rem;
            color: CanvasText;
            font: inherit;
            background: Field;
            border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
            border-radius: 0.35rem;
        }
        .error {
            min-height: 1.2rem;
            margin-top: 0.45rem;
            color: #c0392b;
            font-size: 0.8rem;
        }
        .actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 0.65rem;
        }
        button {
            padding: 0.35rem 0.7rem;
            font: inherit;
        }
    </style>
</head>
<body>
    <form id="form">
        <label for="url">Intrigue URL</label>
        <input id="url" value="${prefill}" placeholder="https://.../?document=..." autofocus>
        <div id="error" class="error"></div>
        <div class="actions">
            <button id="cancel" type="button">Cancel</button>
            <button id="open" type="submit">Open</button>
        </div>
    </form>
    <script>
        const form = document.getElementById('form');
        const input = document.getElementById('url');
        const error = document.getElementById('error');
        document.getElementById('cancel').addEventListener('click', () => window.close());
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') window.close();
        });
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            error.textContent = '';
            const url = input.value.trim();
            if (!url) {
                error.textContent = 'Enter an Intrigue URL.';
                return;
            }
            try {
                await window.intrigue.openUrl(url);
                window.close();
            } catch (openError) {
                error.textContent = openError.message || 'Failed to open URL.';
            }
        });
        input.select();
    </script>
</body>
</html>`;
}

export function saveFile(item, window) {
    const targetWindow = window || BrowserWindow.getFocusedWindow();
    if (!targetWindow) return;

    const filePath = windowManager.getFilePath(targetWindow);
    if (filePath) {
        // Manually save file here.
        targetWindow.webContents.send('save-file');
    } else {
        const savePath = dialog.showSaveDialogSync(targetWindow, {
            filters: [
                { name: 'Intrigue Files', extensions: ['intrigue'] },
            ],
            properties: [
                'showOverwriteConfirmation', 'createDirectory',
            ],
        });
        if (!savePath) return;
        windowManager.setFilePath(targetWindow, savePath, true);
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

export function openFile() {
    openInNewWindow();
}

function openUrlDialog() {
    if (openUrlWindow && !openUrlWindow.isDestroyed()) {
        openUrlWindow.focus();
        return;
    }

    const clipboardText = clipboard.readText().trim();
    const prefillValue = looksLikeIntrigueUrl(clipboardText) ? clipboardText : '';
    const parentWindow = BrowserWindow.getFocusedWindow();
    openUrlWindow = new BrowserWindow({
        width: 520,
        height: 180,
        title: 'Open URL',
        parent: parentWindow || undefined,
        modal: Boolean(parentWindow),
        resizable: false,
        minimizable: false,
        maximizable: false,
        webPreferences: {
            preload: join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    openUrlWindow.on('closed', () => {
        openUrlWindow = null;
    });
    openUrlWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createOpenUrlPromptHtml(prefillValue))}`);
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
                label: 'Open URL...',
                click: openUrlDialog,
                accelerator: 'CommandOrControl+Shift+O',
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
            // {
            //     label: 'Save As...',
            //     click: () => { console.log('save as'); },
            //     accelerator: 'CommandOrControl+Shift+S',
            // },
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
