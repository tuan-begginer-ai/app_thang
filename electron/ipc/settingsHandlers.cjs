const settingsService = require('../services/settingsService.cjs');
const { validateSettings } = require('./validators.cjs');

/**
 * Registers IPC handlers for Application Settings.
 */
function registerSettingsHandlers(ipcMain) {
    // 1. Get settings
    ipcMain.handle('settings:get', () => {
        try { return settingsService.getSettings(); }
        catch (e) {
            console.error('[Settings IPC] Error in settings:get:', e.message);
            throw new Error('Không thể tải cài đặt.');
        }
    });

    // 2. Save settings
    ipcMain.handle('settings:save', (event, data) => {
        try {
            validateSettings(data);
            return settingsService.saveSettings(data);
        }
        catch (e) {
            console.error('[Settings IPC] Error in settings:save:', e.message);
            throw new Error(e.message);
        }
    });
}

module.exports = { registerSettingsHandlers };
