const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const XLSX = require('xlsx');
const fs = require('fs');

let db;

/**
 * Initializes the SQLite database and runs initial migrations.
 */
function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'patients.db');

    console.log('[DB] Database path:', dbPath);
    db = new Database(dbPath);

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dob TEXT,
            gender TEXT,
            address TEXT,
            phone TEXT,
            occupation TEXT,
            history TEXT,
            diagnosis TEXT,
            treatment TEXT,
            treatment_history TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.exec(createTableQuery);

    // Initial Migration: Check for treatment_history column
    try {
        const columns = db.prepare("PRAGMA table_info(patients)").all();
        const hasTreatmentHistory = columns.some(col => col.name === 'treatment_history');
        if (!hasTreatmentHistory) {
            db.exec("ALTER TABLE patients ADD COLUMN treatment_history TEXT");
        }
    } catch (e) {
        console.error("[DB] Migration error:", e.message);
    }
}

let syncTimeout = null;

/**
 * Syncs Database data to an Excel file on the user's desktop.
 * Uses a debounce (2s) and setTimeout to avoid blocking and redundant writes.
 */
function syncToExcelAsync() {
    if (syncTimeout) clearTimeout(syncTimeout);

    syncTimeout = setTimeout(() => {
        try {
            console.log('[DB] Starting debounced Excel sync...');
            const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();

            const excelData = patients.map(p => {
                const baseInfo = {
                    'ID': p.id,
                    'Họ và tên': p.name,
                    'Năm sinh': p.dob,
                    'Giới tính': p.gender,
                    'Điện thoại': p.phone,
                    'Địa chỉ': p.address,
                    'Nghề nghiệp': p.occupation,
                    'Tiền sử bệnh': p.history,
                    'Chẩn đoán': p.diagnosis,
                    'Kế hoạch điều trị': p.treatment,
                    'Ngày tạo': p.created_at,
                    'Cập nhật cuối': p.updated_at
                };

                let history = [];
                try {
                    if (p.treatment_history) history = JSON.parse(p.treatment_history);
                } catch (e) {
                    // console.warn(`[DB] Error parsing history for patient ID ${p.id}`);
                }

                // Standardizing to max 11 visits as per user original design
                for (let i = 0; i < 11; i++) {
                    const visit = history[i] || {};
                    const visitNum = i + 1;
                    baseInfo[`Lần ${visitNum} - Ngày`] = visit.date || '';
                    baseInfo[`Lần ${visitNum} - Nội dung`] = visit.diagnosis || '';
                    baseInfo[`Lần ${visitNum} - Bác sĩ`] = visit.doctor || '';
                    baseInfo[`Lần ${visitNum} - Thành tiền`] = visit.price || '';
                    baseInfo[`Lần ${visitNum} - Ghi chú`] = visit.note || '';
                }
                return baseInfo;
            });

            const ws = XLSX.utils.json_to_sheet(excelData);
            ws['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, 
                { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }
            ];
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "DanhSachBenhNhan");

            const desktopPath = app.getPath('desktop');
            const excelPath = path.join(desktopPath, 'DanhSach_BenhNhan_DoctorApp.xlsx');

            // Quick check if file is open (exclusive lock)
            if (fs.existsSync(excelPath)) {
                try {
                    fs.accessSync(excelPath, fs.constants.W_OK);
                } catch (e) {
                    console.warn('[DB] Excel file is open, skipping auto-sync.');
                    return;
                }
            }

            XLSX.writeFile(wb, excelPath);
            console.log('[DB] Excel sync SUCCESSful');
        } catch (error) {
            console.error('[DB] Excel sync FAILED:', error.message);
        } finally {
            syncTimeout = null;
        }
    }, 2000); // 2s Debounce
}

/**
 * Parsing helpers for Database <-> UI Patient conversion
 */
function parsePatient(patient) {
    if (!patient) return patient;
    const result = { ...patient };
    if (result.treatment_history) {
        try { result.treatmentHistory = JSON.parse(result.treatment_history); }
        catch (e) { result.treatmentHistory = []; }
    }
    return result;
}

function stringifyPatient(patient) {
    const result = { ...patient };
    if (result.treatmentHistory) {
        result.treatment_history = JSON.stringify(result.treatmentHistory);
    }
    return result;
}

/**
 * Database CRUD Operations
 */
function getPatients() {
    return db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all().map(parsePatient);
}

function searchPatients(query) {
    if (!query) return getPatients();
    const searchParam = `%${query}%`;
    const stmt = db.prepare(`
        SELECT * FROM patients 
        WHERE LOWER(name) LIKE LOWER(?) 
           OR LOWER(phone) LIKE LOWER(?) 
           OR LOWER(address) LIKE LOWER(?)
        ORDER BY created_at DESC
    `);
    return stmt.all(searchParam, searchParam, searchParam).map(parsePatient);
}

function findPatientByName(name) {
    const stmt = db.prepare('SELECT * FROM patients WHERE LOWER(name) = LOWER(?)');
    return parsePatient(stmt.get(name));
}

function addPatient(patient) {
    const data = stringifyPatient(patient);
    const stmt = db.prepare(`
        INSERT INTO patients (name, dob, gender, address, phone, occupation, history, diagnosis, treatment, treatment_history)
        VALUES (@name, @dob, @gender, @address, @phone, @occupation, @history, @diagnosis, @treatment, @treatment_history)
    `);

    const info = stmt.run(data);
    const result = { id: info.lastInsertRowid, ...patient };
    
    // Non-blocking sync check
    const desktopPath = app.getPath('desktop');
    const excelPath = path.join(desktopPath, 'DanhSach_BenhNhan_DoctorApp.xlsx');
    let excelError = null;
    if (fs.existsSync(excelPath)) {
        try { fs.accessSync(excelPath, fs.constants.W_OK); }
        catch (e) { excelError = "File Excel đang mở trên Desktop. Không thể cập nhật."; }
    }

    syncToExcelAsync();
    return { ...result, excelError };
}

function updatePatient(id, patient) {
    const data = stringifyPatient(patient);
    const stmt = db.prepare(`
        UPDATE patients 
        SET name = @name, dob = @dob, gender = @gender, address = @address, phone = @phone, 
            occupation = @occupation, history = @history, diagnosis = @diagnosis,
            treatment = @treatment, treatment_history = @treatment_history,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `);

    const info = stmt.run({ ...data, id });
    const success = info.changes > 0;
    
    let excelError = null;
    if (success) {
        const desktopPath = app.getPath('desktop');
        const excelPath = path.join(desktopPath, 'DanhSach_BenhNhan_DoctorApp.xlsx');
        if (fs.existsSync(excelPath)) {
            try { fs.accessSync(excelPath, fs.constants.W_OK); }
            catch (e) { excelError = "File Excel đang mở trên Desktop. Không thể cập nhật."; }
        }
        syncToExcelAsync();
    }
    return { success, excelError };
}

function deletePatient(id) {
    const info = db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    const success = info.changes > 0;
    if (success) syncToExcelAsync();
    return success;
}

module.exports = {
    initDatabase,
    getPatients,
    searchPatients,
    findPatientByName,
    addPatient,
    updatePatient,
    deletePatient
};
