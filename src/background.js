import { app, protocol, BrowserWindow } from 'electron';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';

import createWindow from '@/background/window';

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
const filesToOpen = process.argv.slice(2);

app.on('open-file', (event, filePath) => {
    if (app.isReady()) {
        createWindow(filePath);
    } else {
        filesToOpen.push(filePath);
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

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
    if (filesToOpen.length > 0) {
        filesToOpen.forEach((filePath) => {
            createWindow(filePath);
        });
    } else {
        createWindow();
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
