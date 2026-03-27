const fs = require('fs');
const appConfig = require('../config/appConfig.cjs');

/**
 * Service to manage application settings and persistent state.
 */
class SettingsService {
    constructor() {
        this.settingsFile = appConfig.paths.settingsFile;
    }

    getSettings() {
        if (fs.existsSync(this.settingsFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8'));
            } catch (e) {
                console.error('[Settings] Error reading settings file:', e.message);
                return { authMethod: 'client_credentials' };
            }
        }
        return { authMethod: 'client_credentials' };
    }

    saveSettings(data) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...data };
            fs.writeFileSync(this.settingsFile, JSON.stringify(updated, null, 2));
            return updated;
        } catch (e) {
            console.error('[Settings] Error saving settings file:', e.message);
            throw e;
        }
    }

    /**
     * Cleans legacy tokens from the userTokens storage.
     * E.g. 'default', 'unknown' or invalid UUIDs not using email.
     */
    cleanLegacyTokens() {
        const settings = this.getSettings();
        const tokens = settings.userTokens || {};
        let changed = false;

        Object.keys(tokens).forEach(key => {
            if (key === 'default' || key === 'unknown' || !key.includes('@')) {
                delete tokens[key];
                changed = true;
                console.log(`[Settings] Cleaned legacy token: "${key}"`);
            }
        });

        if (changed) {
            this.saveSettings({ userTokens: tokens });
        }
    }
}

module.exports = new SettingsService();
