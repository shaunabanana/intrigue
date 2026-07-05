const path = require('node:path');
const { notarize } = require('@electron/notarize');

module.exports = async function notarizeMacApp(context) {
    if (context.electronPlatformName !== 'darwin') return;

    const appleId = process.env.APPLE_ID;
    const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_ID_PASSWORD;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!appleId || !appleIdPassword || !teamId) {
        console.log('Skipping notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID are required.');
        return;
    }

    const appPath = path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
    );

    await notarize({
        appPath,
        appleId,
        appleIdPassword,
        teamId,
    });
};
