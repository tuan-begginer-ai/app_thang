const db = require('../db.cjs');
const { validatePatient, validateId } = require('./validators.cjs');

/**
 * Registers IPC handlers for Database operations.
 */
function registerDbHandlers(ipcMain) {
    // 1. Get all patients
    ipcMain.handle('db-get-patients', () => {
        try { return db.getPatients(); }
        catch (e) {
            console.error('[DB IPC] Error in db-get-patients:', e.message);
            throw new Error('Không thể lấy danh sách bệnh nhân.');
        }
    });

    // 2. Search patients
    ipcMain.handle('db-search-patients', (event, query) => {
        try {
            // Minimal sanitization for SQL Like query
            if (typeof query !== 'string') throw new Error('Query must be a string');
            return db.searchPatients(query.slice(0, 100)); // Limit length
        }
        catch (e) {
            console.error('[DB IPC] Error in db-search-patients:', e.message);
            throw new Error('Lỗi tìm kiếm bệnh nhân.');
        }
    });

    // 3. Add a new patient
    ipcMain.handle('db-add-patient', (event, patient) => {
        try {
            validatePatient(patient);
            return db.addPatient(patient);
        }
        catch (e) {
            console.error('[DB IPC] Error in db-add-patient:', e.message);
            throw new Error(e.message);
        }
    });

    // 4. Update existing patient
    ipcMain.handle('db-update-patient', (event, { id, patient }) => {
        try {
            validateId(id);
            validatePatient(patient);
            return db.updatePatient(id, patient);
        }
        catch (e) {
            console.error('[DB IPC] Error in db-update-patient:', e.message);
            throw new Error(e.message);
        }
    });

    // 5. Delete patient
    ipcMain.handle('db-delete-patient', (event, id) => {
        try {
            validateId(id);
            return db.deletePatient(id);
        }
        catch (e) {
            console.error('[DB IPC] Error in db-delete-patient:', e.message);
            throw new Error('Lỗi khi xóa bệnh nhân.');
        }
    });
}

module.exports = { registerDbHandlers };
