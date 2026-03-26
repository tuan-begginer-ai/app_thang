const invokeOrMock = (channel, ...args) => {
    if (window.dbAPI) {
        return window.dbAPI.invoke(channel, ...args);
    }
    console.warn(`Mock DB call or Electron API not available: ${channel}`, args);
    return Promise.resolve([]);
};

export const dbService = {
    getPatients: () => invokeOrMock('db-get-patients'),
    searchPatients: (query) => invokeOrMock('db-search-patients', query),
    addPatient: (patient) => invokeOrMock('db-add-patient', patient),
    updatePatient: (id, patient) => invokeOrMock('db-update-patient', { id, patient }),
    deletePatient: (id) => invokeOrMock('db-delete-patient', id)
};
