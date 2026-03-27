const apiService = require('../services/boldSignApiService.cjs');
const authService = require('../services/boldSignAuthService.cjs');
const settingsService = require('../services/settingsService.cjs');

/**
 * Registers IPC handlers for BoldSign API operations.
 */
/**
 * Registers IPC handlers for BoldSign API operations.
 */
function registerBoldSignHandlers(ipcMain) {
    // Helper: Validates basic payload structure
    const validate = (payload, requiredFields = []) => {
        if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
        for (const field of requiredFields) {
            if (!payload[field]) throw new Error(`Missing field: ${field}`);
        }
    };

    // 1. Connection check
    ipcMain.handle('boldsign:test-connection', (event, payload) => {
        validate(payload, ['userEmail']);
        return apiService.testConnection(payload.userEmail);
    });

    // 2. Send for signature
    ipcMain.handle('boldsign:send-for-signature', (event, payload) => {
        validate(payload, ['doctorEmail', 'patientName']);
        return apiService.sendForSignature(payload);
    });

    // 3. Create embedded request
    ipcMain.handle('boldsign:create-embedded-request', (event, payload) => {
        validate(payload, ['doctorEmail', 'patientName']);
        return apiService.createEmbeddedRequest(payload);
    });

    // 4. Check status
    ipcMain.handle('boldsign:check-status', (event, { documentId, doctorEmail }) => {
        if (!documentId || !doctorEmail) throw new Error('Document ID and Doctor Email are required');
        return apiService.checkStatus(documentId, doctorEmail);
    });

    // 5. Download signed
    ipcMain.handle('boldsign:download-signed', (event, { documentId, doctorEmail }) => {
        if (!documentId || !doctorEmail) throw new Error('Document ID and Doctor Email are required');
        return apiService.downloadSigned(documentId, doctorEmail);
    });

    // 6. Auth - Start login
    ipcMain.handle('boldsign:start-login', (event, payload) => {
        validate(payload, ['userEmail']);
        return authService.startLogin(payload);
    });

    // 7. Auth - Exchange code
    ipcMain.handle('boldsign:exchange-code', (event, code) => {
        if (typeof code !== 'string') throw new Error('Auth code must be a string');
        return authService.exchangeCode(code);
    });

    // 8. Auth - Get logged in users
    ipcMain.handle('boldsign:get-logged-in-users', () => {
        const settings = settingsService.getSettings();
        return Object.keys(settings.userTokens || {});
    });

    // 9. Auth - Logout
    ipcMain.handle('boldsign:logout-user', (event, email) => {
        if (!email) throw new Error('Email is required for logout');
        const settings = settingsService.getSettings();
        const tokens = settings.userTokens || {};
        if (tokens[email]) {
            delete tokens[email];
            settingsService.saveSettings({ userTokens: tokens });
            return { success: true };
        }
        return { success: false };
    });
}

module.exports = { registerBoldSignHandlers };
