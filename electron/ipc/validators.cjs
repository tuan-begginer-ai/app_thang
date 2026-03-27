/**
 * Lightweight validators for IPC handlers.
 * Ensures data passed from renderer is in the correct format before processing.
 */

function validatePatient(p) {
    if (!p || typeof p !== 'object') throw new Error('Dữ liệu bệnh nhân không hợp lệ (Invalid patient object)');
    
    // Name is required
    if (!p.name || typeof p.name !== 'string' || p.name.trim().length === 0) {
        throw new Error('Tên bệnh nhân là bắt buộc');
    }
    if (p.name.length > 200) throw new Error('Tên quá dài');

    // Phone (optional but must be valid format if present)
    if (p.phone && !/^[\d\s\-+()]{0,30}$/.test(p.phone)) {
        throw new Error('Số điện thoại không hợp lệ');
    }

    // DOB (allow empty or string)
    if (p.dob && typeof p.dob !== 'string') throw new Error('Năm sinh phải là chuỗi');

    // Gender 
    const validGenders = ['Nam', 'Nữ', 'Khác', ''];
    if (p.gender && !validGenders.includes(p.gender)) {
        throw new Error('Giới tính không hợp lệ');
    }
}

function validateId(id) {
    const num = Number(id);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error('ID không hợp lệ');
    }
}

function validateEmail(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email không hợp lệ');
    }
}

function validateSettings(data) {
    if (!data || typeof data !== 'object') throw new Error('Settings data must be an object');
    
    // Whitelist allowed keys to prevent injection
    const allowedKeys = ['authMethod', 'userTokens', 'authCodeToken', 'accessToken', 'doctorName', 'clinicName', 'address', 'phone'];
    const keys = Object.keys(data);
    for (const key of keys) {
        if (!allowedKeys.includes(key)) {
            throw new Error(`Trường cài đặt "${key}" không được phép`);
        }
    }
}

module.exports = {
    validatePatient,
    validateId,
    validateEmail,
    validateSettings
};
