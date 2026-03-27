const axios = require('axios');
const crypto = require('crypto');
const { BrowserWindow, session } = require('electron');
const appConfig = require('../config/appConfig.cjs');
const settingsService = require('./settingsService.cjs');

/**
 * Service for handling BoldSign OAuth2 + PKCE Authentication.
 * Encapsulates token management and login window coordination.
 */
class BoldSignAuthService {
    constructor() {
        this.currentSession = {
            verifier: null,
            email: null,
            window: null,
        };
    }

    /**
     * Internal: PKCE Helpers
     */
    generateCodeVerifier() { return crypto.randomBytes(32).toString('base64url'); }
    generateCodeChallenge(verifier) { return crypto.createHash('sha256').update(verifier).digest('base64url'); }

    /**
     * Resolves the current access token based on the selected auth method.
     */
    async getAccessToken(userEmail) {
        const settings = settingsService.getSettings();
        console.log(`[BoldSign Auth] Mode: "${settings.authMethod}", Email: "${userEmail}"`);
        if (settings.authMethod === 'authorization_code') {
            if (!userEmail) throw new Error('DOCTOR_EMAIL_REQUIRED');
            return await this.getAuthCodeAccessToken(userEmail);
        }
        return await this.getClientCredentialsAccessToken();
    }

    async getClientCredentialsAccessToken() {
        try {
            const authHeader = Buffer.from(`${appConfig.boldSign.clientId}:${appConfig.boldSign.clientSecret}`).toString('base64');
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('scope', 'BoldSign.Documents.All');

            const response = await axios.post(appConfig.boldSign.tokenUrl, params, {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('[BoldSign Auth] Client Credentials token acquisition failed:', error.response?.data || error.message);
            throw new Error(`Token Error: ${error.response?.data?.error_description || error.response?.data?.error || error.message}`);
        }
    }

    async getAuthCodeAccessToken(userEmail) {
        const settings = settingsService.getSettings();
        const tokens = settings.userTokens || {};
        const userTokenData = tokens[userEmail];

        if (!userTokenData) throw new Error('USER_NOT_LOGGED_IN');

        // Check cache
        if (userTokenData.expiresAt > Date.now()) {
            return userTokenData.access_token;
        }

        // Try refresh
        if (userTokenData.refresh_token) {
            try { return await this.refreshAuthToken(userEmail, userTokenData.refresh_token); }
            catch (e) { console.warn(`[BoldSign] Refresh failed for ${userEmail}`); }
        }

        throw new Error('AUTH_CODE_LOGIN_REQUIRED');
    }

    async refreshAuthToken(userEmail, refreshToken) {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', appConfig.boldSign.authClientId);
        if (appConfig.boldSign.authClientSecret) {
            params.append('client_secret', appConfig.boldSign.authClientSecret);
        }
        params.append('refresh_token', refreshToken);

        const response = await axios.post(appConfig.boldSign.tokenUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokenData = {
            ...response.data,
            expiresAt: Date.now() + (response.data.expires_in * 1000)
        };

        const settings = settingsService.getSettings();
        const userTokens = settings.userTokens || {};
        userTokens[userEmail] = tokenData;

        settingsService.saveSettings({ userTokens });
        return tokenData.access_token;
    }

    /**
     * Initiates the Login flow by opening a dedicated BrowserWindow.
     */
    async startLogin(payload) {
        const userEmail = payload?.userEmail?.trim();
        if (!userEmail) throw new Error('DOCTOR_EMAIL_REQUIRED');

        // Store session context
        this.currentSession.verifier = this.generateCodeVerifier();
        this.currentSession.email = userEmail;
        const codeChallenge = this.generateCodeChallenge(this.currentSession.verifier);

        const authUrl = `${appConfig.boldSign.tokenUrl.replace('/token', '/authorize')}?` +
            `response_type=code&` +
            `client_id=${appConfig.boldSign.authClientId}&` +
            `scope=${encodeURIComponent('BoldSign.Documents.All offline_access openid profile email')}&` +
            `redirect_uri=${encodeURIComponent(appConfig.boldSign.redirectUri)}&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256&` +
            `state=electron_login&prompt=login&` +
            `login_hint=${encodeURIComponent(userEmail)}`;

        if (this.currentSession.window) {
            this.currentSession.window.close();
            this.currentSession.window = null;
        }

        return new Promise((resolve, reject) => {
            const loginSession = session.fromPartition('boldsign-auth-' + Date.now(), { cache: false });
            
            this.currentSession.window = new BrowserWindow({
                width: 600,
                height: 800,
                title: `BoldSign Login - ${userEmail}`,
                webPreferences: { nodeIntegration: false, session: loginSession }
            });

            const handleRedirect = async (navEvent, urlStr) => {
                if (urlStr.includes(appConfig.boldSign.redirectUri)) {
                    navEvent.preventDefault();
                    try {
                        const parsedUrl = new URL(urlStr);
                        const code = parsedUrl.searchParams.get('code');
                        if (code) {
                            const result = await this.exchangeCode(code, this.currentSession.email);
                            resolve({ success: true, email: result.email, message: `Login success (${result.email})` });
                        } else {
                            const error = parsedUrl.searchParams.get('error_description') || 'No auth code found';
                            reject(new Error(error));
                        }
                    } catch (err) { reject(err); }
                    finally { if (this.currentSession.window) this.currentSession.window.close(); }
                }
            };

            this.currentSession.window.webContents.on('will-redirect', handleRedirect);
            this.currentSession.window.webContents.on('will-navigate', handleRedirect);
            this.currentSession.window.loadURL(authUrl);
            
            this.currentSession.window.on('closed', () => {
                this.currentSession.window = null;
                resolve({ success: false, message: 'Login window closed' });
            });
        });
    }

    async exchangeCode(code, userEmail) {
        if (!this.currentSession.verifier) throw new Error('NO_VERIFIER');
        const emailToStore = userEmail || this.currentSession.email;

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('client_id', appConfig.boldSign.authClientId);
            if (appConfig.boldSign.authClientSecret) {
                params.append('client_secret', appConfig.boldSign.authClientSecret);
            }
            params.append('code', code);
            params.append('code_verifier', this.currentSession.verifier);
            params.append('redirect_uri', appConfig.boldSign.redirectUri);

            const response = await axios.post(appConfig.boldSign.tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const tokenData = {
                ...response.data,
                expiresAt: Date.now() + (response.data.expires_in * 1000)
            };

            const settings = settingsService.getSettings();
            const userTokens = settings.userTokens || {};
            userTokens[emailToStore] = tokenData;
            settingsService.saveSettings({ userTokens });

            this.currentSession.verifier = null;
            this.currentSession.email = null;

            return { success: true, email: emailToStore };
        } catch (error) {
            console.error('[BoldSign] Exchange error:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new BoldSignAuthService();
