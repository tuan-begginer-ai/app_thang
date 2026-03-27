const { contextBridge, ipcRenderer } = require('electron')

// Expose BoldSign API
contextBridge.exposeInMainWorld('boldSignAPI', {
    testConnection: (payload) => ipcRenderer.invoke('boldsign:test-connection', payload),
    sendForSignature: (payload) => ipcRenderer.invoke('boldsign:send-for-signature', payload),
    checkStatus: (payload) => ipcRenderer.invoke('boldsign:check-status', payload),
    downloadSigned: (payload) => ipcRenderer.invoke('boldsign:download-signed', payload),
    createEmbeddedRequest: (payload) => ipcRenderer.invoke('boldsign:create-embedded-request', payload),
    startLogin: (payload) => ipcRenderer.invoke('boldsign:start-login', payload),
    exchangeCode: (code) => ipcRenderer.invoke('boldsign:exchange-code', code),
    getLoggedInUsers: () => ipcRenderer.invoke('boldsign:get-logged-in-users'),
    logoutUser: (email) => ipcRenderer.invoke('boldsign:logout-user', email),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (data) => ipcRenderer.invoke('settings:save', data),
})

// Expose Database API to maintain compatibility with existing code
contextBridge.exposeInMainWorld('dbAPI', {
    invoke: (channel, ...args) => {
        const validChannels = [
            'db-get-patients',
            'db-search-patients',
            'db-add-patient',
            'db-update-patient',
            'db-delete-patient'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    send: (channel, ...args) => {
        if (channel === 'print-to-paper') {
            ipcRenderer.send(channel, ...args);
        }
    },
    on: (channel, func) => {
        if (channel === 'menu-action-print') {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    removeListener: (channel, func) => {
        if (channel === 'menu-action-print') {
            ipcRenderer.removeListener(channel, func);
        }
    }
})
