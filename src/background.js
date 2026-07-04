/* eslint-disable import/no-extraneous-dependencies */
import {
    app, protocol, BrowserWindow, Menu,
} from 'electron';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';

import { windowManager } from '@/desktop/window';
import { menuTemplate } from '@/desktop/menu';
import '@/desktop/ipc';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } },
]);

// Handle file opening. Need to be done before app is ready.
if (app.isPackaged) {
    // workaround for missing executable argument)
    process.argv.unshift(null);
}
// parameters is now an array containing any files/folders
// that your OS will pass to your application
const filesToOpen = [];
const urlsToOpen = [];

function isOpenUrlArgument(value) {
    return typeof value === 'string'
        && (/^intrigue:\/\//.test(value) || /^https?:\/\//.test(value));
}

function collectLaunchArguments(args) {
    args.forEach((arg) => {
        if (isOpenUrlArgument(arg)) urlsToOpen.push(arg);
        else filesToOpen.push(arg);
    });
}

collectLaunchArguments(process.argv.slice(2));

if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('intrigue', process.execPath, [process.argv[1]]);
} else {
    app.setAsDefaultProtocolClient('intrigue');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
}

app.on('second-instance', (_, commandLine) => {
    const incomingUrls = commandLine.filter(isOpenUrlArgument);
    if (incomingUrls.length === 0) return;
    incomingUrls.forEach((url) => {
        if (app.isReady()) windowManager.openUrl(url);
        else urlsToOpen.push(url);
    });
});

app.on('open-file', (event, filePath) => {
    if (app.isReady()) {
        windowManager.createWindow(filePath);
    } else {
        filesToOpen.push(filePath);
    }
    event.preventDefault();
});

app.on('open-url', (event, url) => {
    if (app.isReady()) {
        windowManager.openUrl(url);
    } else {
        urlsToOpen.push(url);
    }
    event.preventDefault();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    windowManager.beginQuit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) windowManager.createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS);
        } catch (e) {
            console.error('Vue Devtools failed to install:', e.toString());
        }
    }

    // Build menu.
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // If there are files or URLs to open, create windows for them.
    // Otherwise, just create a new empty window.
    if (filesToOpen.length > 0 || urlsToOpen.length > 0) {
        filesToOpen.forEach((filePath) => {
            windowManager.createWindow(filePath);
        });
        await Promise.all(urlsToOpen.map((url) => windowManager.openUrl(url)));
    } else {
        windowManager.createWindow();
    }
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit();
            }
        });
    } else {
        process.on('SIGTERM', () => {
            app.quit();
        });
    }
}
