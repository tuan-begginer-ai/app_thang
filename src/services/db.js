let ipcRenderer;

try {
    if (window.require) {
        ipcRenderer = window.require('electron').ipcRenderer;
    }
} catch (e) {
    console.warn('Electron IPC not available. Database features will be disabled.');
}

const invokeOrMock = (channel, ...args) => {
    if (ipcRenderer) {
        return ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`Mock DB call: ${channel}`, args);
    return Promise.resolve([]); // Return empty result or appropriate mock
};

export const dbService = {
    getPatients: () => invokeOrMock('db-get-patients'),
    searchPatients: (query) => invokeOrMock('db-search-patients', query),
    addPatient: (patient) => invokeOrMock('db-add-patient', patient),
    updatePatient: (id, patient) => invokeOrMock('db-update-patient', { id, patient }),
    deletePatient: (id) => invokeOrMock('db-delete-patient', id)
};
