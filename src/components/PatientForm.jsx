import React from 'react';
import '../styles/PatientForm.css';

/**
 * Functional component for Patient Information Entry.
 * Keeps original UI structure with optimized code quality and data handling.
 */
const PatientForm = ({ data, onChange }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange(name, value);
    };

    /**
     * Updates a specific cell in the treatment history table.
     */
    const updateHistoryRow = (index, field, value) => {
        const newHistory = [...(data.treatmentHistory || [])];
        if (!newHistory[index]) newHistory[index] = {};
        newHistory[index] = { ...newHistory[index], [field]: value };
        onChange('treatmentHistory', newHistory);
    };

    // Table Column Definitions for easier maintenance
    const tableColumns = [
        { label: 'Ngày', field: 'date', width: '15%', placeholder: 'dd/mm' },
        { label: 'Chuẩn đoán & Điều trị', field: 'diagnosis', width: '40%' },
        { label: 'Bác sĩ', field: 'doctor', width: '15%' },
        { label: 'Thành tiền', field: 'price', width: '15%' },
        { label: 'Ghi chú', field: 'note', width: '15%' },
    ];

    return (
        <div className="patient-form">
            <h2>Thông tin bệnh nhân</h2>

            <div className="form-group">
                <label>Họ và tên</label>
                <input
                    type="text"
                    name="name"
                    value={data.name}
                    onChange={handleChange}
                    placeholder="Nhập họ tên..."
                />
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Năm sinh</label>
                    <input
                        type="text"
                        name="dob"
                        value={data.dob}
                        onChange={handleChange}
                        placeholder="YYYY HOẶC dd/mm/yyyy"
                    />
                </div>
                <div className="form-group half">
                    <label>Giới tính</label>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                name="gender"
                                value="Nam"
                                checked={data.gender === 'Nam'}
                                onChange={handleChange}
                            /> Nam
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="gender"
                                value="Nữ"
                                checked={data.gender === 'Nữ'}
                                onChange={handleChange}
                            /> Nữ
                        </label>
                    </div>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group half">
                    <label>Điện thoại (ĐT)</label>
                    <input
                        type="text"
                        name="phone"
                        value={data.phone || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group half">
                    <label>Nghề nghiệp</label>
                    <input
                        type="text"
                        name="occupation"
                        value={data.occupation || ''}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Địa chỉ</label>
                <textarea
                    name="address"
                    value={data.address}
                    onChange={handleChange}
                    rows="2"
                ></textarea>
            </div>

            <div className="form-group">
                <label>Tiền sử bệnh</label>
                <textarea
                    name="history"
                    value={data.history}
                    onChange={handleChange}
                    rows="2"
                ></textarea>
            </div>

            <div className="form-group">
                <label>Chẩn đoán</label>
                <textarea
                    name="diagnosis"
                    value={data.diagnosis}
                    onChange={handleChange}
                    rows="3"
                ></textarea>
            </div>

            <div className="form-group">
                <label>Kế hoạch điều trị</label>
                <textarea
                    name="treatment"
                    value={data.treatment}
                    onChange={handleChange}
                    rows="4"
                ></textarea>
            </div>

            {/* Treatment History Input Table */}
            <div className="form-group">
                <label>Chi tiết điều trị (Page 2)</label>
                <div className="history-table-container">
                    <table className="history-table">
                        <thead>
                            <tr>
                                {tableColumns.map(col => (
                                    <th key={col.field} width={col.width}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.treatmentHistory || Array(11).fill({})).map((row, index) => (
                                <tr key={index}>
                                    {tableColumns.map(col => (
                                        <td key={col.field}>
                                            <input
                                                type="text"
                                                value={row[col.field] || ''}
                                                onChange={(e) => updateHistoryRow(index, col.field, e.target.value)}
                                                placeholder={col.placeholder || ''}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PatientForm;
