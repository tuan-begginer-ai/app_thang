const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Modern structured JSON logger for app_doctor.
 * Logs to file in %APPDATA%/app-doctor/logs/ app.log
 */
class Logger {
    constructor() {
        this.logDir = path.join(app.getPath('userData'), 'logs');
        this.logFile = path.join(this.logDir, 'app.log');
        this._initSync();
    }

    _initSync() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Internal: Write to JSON stream
     */
    _write(level, msg, data = {}) {
        const timestamp = new Date().toISOString();
        const entry = {
            ts: timestamp,
            lv: level,
            msg,
            ...data
        };

        const jsonStr = JSON.stringify(entry);
        
        // Print to stdout in dev for better UX
        if (!app.isPackaged) {
            const colorMap = { INFO: '\x1b[36m', WARN: '\x1b[33m', ERROR: '\x1b[31m', DEBUG: '\x1b[90m' };
            console.log(`${colorMap[level] || ''}[${level}]\x1b[0m ${msg}`, Object.keys(data).length ? data : '');
        }

        try {
            fs.appendFileSync(this.logFile, jsonStr + '\n');
        } catch (e) {
            // Silently fail if file system is locked/full
        }
    }

    info(msg, data) { this._write('INFO', msg, data); }
    warn(msg, data) { this._write('WARN', msg, data); }
    error(msg, data) { this._write('ERROR', msg, data); }
}

module.exports = new Logger();
