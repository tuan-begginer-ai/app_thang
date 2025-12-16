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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.exec(createTableQuery);
}

function getPatients() {
    const stmt = db.prepare('SELECT * FROM patients ORDER BY created_at DESC');
    return stmt.all();
}

function searchPatients(query) {
    if (!query) return getPatients();
    const stmt = db.prepare(`
        SELECT * FROM patients 
        WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?
        ORDER BY created_at DESC
    `);
    const search = `%${query}%`;
    return stmt.all(search, search, search);
}

function getPatient(id) {
    const stmt = db.prepare('SELECT * FROM patients WHERE id = ?');
    return stmt.get(id);
}

function addPatient(patient) {
    const stmt = db.prepare(`
        INSERT INTO patients (name, dob, gender, address, phone, occupation, history, diagnosis, treatment)
        VALUES (@name, @dob, @gender, @address, @phone, @occupation, @history, @diagnosis, @treatment)
    `);

    const info = stmt.run(patient);
    return { id: info.lastInsertRowid, ...patient };
}

function updatePatient(id, patient) {
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
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `);

    const info = stmt.run({ ...patient, id });
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
