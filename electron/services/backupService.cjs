const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('../logger.cjs');

/**
 * Service to handle SQLite database backups.
 * Keeps last 7 days of backups to prevent data loss.
 */
class BackupService {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.dbPath = path.join(this.userDataPath, 'patients.db');
        this.backupDir = path.join(this.userDataPath, 'backups');
    }

    /**
     * Creates a daily backup of the main SQLite database.
     */
    async performBackup() {
        if (!fs.existsSync(this.dbPath)) {
            logger.warn('[Backup] Main database not found, skipping backup.');
            return;
        }

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const backupPath = path.join(this.backupDir, `patients.backup.${dateStr}.db`);

        // Avoid re-backing up if we already did today
        if (fs.existsSync(backupPath)) {
            logger.info(`[Backup] Already have today's backup: ${dateStr}`);
            return;
        }

        try {
            fs.copyFileSync(this.dbPath, backupPath);
            logger.info(`[Backup] Success: ${backupPath}`);
            this._cleanupOldBackups();
        } catch (e) {
            logger.error('[Backup] Failed to create backup:', e.message);
        }
    }

    _cleanupOldBackups() {
        const files = fs.readdirSync(this.backupDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        files.forEach(file => {
            const filePath = path.join(this.backupDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                logger.info(`[Backup] Cleaned old backup: ${file}`);
            }
        });
    }

    /**
     * Sets an interval to backup every 24 hours.
     */
    schedule() {
        // Initial backup after startup
        setTimeout(() => this.performBackup(), 5000);

        setInterval(() => {
            this.performBackup();
        }, 24 * 60 * 60 * 1000);
    }
}

module.exports = new BackupService();
