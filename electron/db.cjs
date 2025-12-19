const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'patients.db');

    console.log('Database path:', dbPath);

    db = new Database(dbPath);

    // Create tables
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

    // Migration to add treatment_history if it doesn't exist (for existing databases)
    try {
        const columns = db.prepare("PRAGMA table_info(patients)").all();
        const hasTreatmentHistory = columns.some(col => col.name === 'treatment_history');
        if (!hasTreatmentHistory) {
            db.exec("ALTER TABLE patients ADD COLUMN treatment_history TEXT");
        }
    } catch (e) {
        console.error("Migration error:", e);
    }
}

function parsePatient(patient) {
    if (!patient) return patient;
    const result = { ...patient };
    if (result.treatment_history) {
        try {
            result.treatmentHistory = JSON.parse(result.treatment_history);
        } catch (e) {
            console.error("Error parsing treatment history", e);
            result.treatmentHistory = null;
        }
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

function getPatients() {
    const stmt = db.prepare('SELECT * FROM patients ORDER BY created_at DESC');
    return stmt.all().map(parsePatient);
}

function searchPatients(query) {
    if (!query) return getPatients();
    const stmt = db.prepare(`
        SELECT * FROM patients 
        WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?
        ORDER BY created_at DESC
    `);
    const search = `%${query}%`;
    return stmt.all(search, search, search).map(parsePatient);
}

function getPatient(id) {
    const stmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    return parsePatient(stmt.get(id));
}

function addPatient(patient) {
    const data = stringifyPatient(patient);
    const stmt = db.prepare(`
        INSERT INTO patients (name, dob, gender, address, phone, occupation, history, diagnosis, treatment, treatment_history)
        VALUES (@name, @dob, @gender, @address, @phone, @occupation, @history, @diagnosis, @treatment, @treatment_history)
    `);

    const info = stmt.run(data);
    return { id: info.lastInsertRowid, ...patient };
}

function updatePatient(id, patient) {
    const data = stringifyPatient(patient);
    const stmt = db.prepare(`
        UPDATE patients 
        SET name = @name, 
            dob = @dob, 
            gender = @gender, 
            address = @address, 
            phone = @phone, 
            occupation = @occupation, 
            history = @history, 
            diagnosis = @diagnosis,
            treatment = @treatment,
            treatment_history = @treatment_history,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `);

    const info = stmt.run({ ...data, id });
    return info.changes > 0;
}

function deletePatient(id) {
    const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
}

module.exports = {
    initDatabase,
    getPatients,
    searchPatients,
    getPatient,
    addPatient,
    updatePatient,
    deletePatient
};
