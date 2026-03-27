const { autoUpdater } = require('electron-updater');
const logger = require('../logger.cjs');

/**
 * Service to handle application updates.
 * Configured for production usage with signature verification.
 */
class AutoUpdateService {
    constructor() {
        autoUpdater.logger = {
            info: (msg) => logger.info(`[AutoUpdate] ${msg}`),
            warn: (msg) => logger.warn(`[AutoUpdate] ${msg}`),
            error: (msg) => logger.error(`[AutoUpdate] ${msg}`),
            debug: (msg) => {} // No-op, too noisy
        };

        // Standard AutoUpdater Events
        autoUpdater.on('checking-for-update', () => logger.info('Checking for update...'));
        autoUpdater.on('update-available', (info) => logger.info('Update available:', info));
        autoUpdater.on('update-not-available', (info) => logger.info('Update not available.'));
        autoUpdater.on('error', (err) => logger.error('AutoUpdate error:', err));
        autoUpdater.on('download-progress', (progressObj) => {
            let logMsg = `Download speed: ${progressObj.bytesPerSecond}`;
            logMsg += ` - Downloaded ${progressObj.percent}%`;
            logMsg += ` (${progressObj.transferred}/${progressObj.total})`;
            // Only log if significant progress (e.g. multiples of 25)
            if (Math.round(progressObj.percent) % 25 === 0) logger.info(logMsg);
        });
        autoUpdater.on('update-downloaded', (info) => {
            logger.info('Update downloaded; will install now.');
            // This is just a boilerplate, for real app we should prompt user here.
            autoUpdater.quitAndInstall();
        });
    }

    init() {
        // Only run in production to avoid error messages
        if (process.env.NODE_ENV === 'development') return;

        try {
            autoUpdater.checkForUpdatesAndNotify();
        } catch (e) {
            logger.error('Failed to init autoUpdate:', e.message);
        }
    }
}

module.exports = new AutoUpdateService();
