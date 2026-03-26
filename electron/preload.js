const { contextBridge, ipcRenderer } = require('electron')

// Expose BoldSign API
contextBridge.exposeInMainWorld('boldSignAPI', {
    testConnection: () => ipcRenderer.invoke('boldsign:test-connection'),
    sendForSignature: (payload) => ipcRenderer.invoke('boldsign:send-for-signature', payload),
    checkStatus: (documentId) => ipcRenderer.invoke('boldsign:check-status', { documentId }),
    downloadSigned: (documentId) => ipcRenderer.invoke('boldsign:download-signed', { documentId }),
    createEmbeddedRequest: (payload) => ipcRenderer.invoke('boldsign:create-embedded-request', payload),
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
