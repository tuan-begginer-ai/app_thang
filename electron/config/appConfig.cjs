const path = require('path');
const { app } = require('electron');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Centered configuration for the Electron backend.
 * Avoids direct process.env usage in other layers.
 */
const appConfig = {
    env: !app.isPackaged ? 'development' : 'production',
    paths: {
        userData: app.getPath('userData'),
        desktop: app.getPath('desktop'),
        settingsFile: path.join(app.getPath('userData'), 'boldsign-settings.json'),
    },
    boldSign: {
        clientId: process.env.BOLDSIGN_CLIENT_ID,
        clientSecret: process.env.BOLDSIGN_CLIENT_SECRET,
        authClientId: process.env.BOLDSIGN_AUTH_CLIENT_ID || process.env.BOLDSIGN_CLIENT_ID,
        authClientSecret: process.env.BOLDSIGN_AUTH_CLIENT_SECRET || process.env.BOLDSIGN_CLIENT_SECRET,
        redirectUri: 'http://localhost:5173',
        tokenUrl: 'https://account.boldsign.com/connect/token',
        apiBaseUrl: 'https://api.boldsign.com/v1',
    }
};

module.exports = appConfig;
