import React from 'react';
import '../styles/PatientForm.css';

const PatientForm = ({ data, onChange }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange(name, value);
    };

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
                                <th width="15%">Ngày</th>
                                <th width="40%">Chuẩn đoán & Điều trị</th>
                                <th width="15%">Bác sĩ</th>
                                <th width="15%">Thành tiền</th>
                                <th width="15%">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.treatmentHistory || Array(11).fill({})).map((row, index) => (
                                <tr key={index}>
                                    <td>
                                        <input
                                            type="text"
                                            value={row.date || ''}
                                            onChange={(e) => {
                                                const newHistory = [...(data.treatmentHistory || [])];
                                                if (!newHistory[index]) newHistory[index] = {};
                                                newHistory[index] = { ...newHistory[index], date: e.target.value };
                                                onChange('treatmentHistory', newHistory);
                                            }}
                                            placeholder="dd/mm"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={row.diagnosis || ''}
                                            onChange={(e) => {
                                                const newHistory = [...(data.treatmentHistory || [])];
                                                if (!newHistory[index]) newHistory[index] = {};
                                                newHistory[index] = { ...newHistory[index], diagnosis: e.target.value };
                                                onChange('treatmentHistory', newHistory);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={row.doctor || ''}
                                            onChange={(e) => {
                                                const newHistory = [...(data.treatmentHistory || [])];
                                                if (!newHistory[index]) newHistory[index] = {};
                                                newHistory[index] = { ...newHistory[index], doctor: e.target.value };
                                                onChange('treatmentHistory', newHistory);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={row.price || ''}
                                            onChange={(e) => {
                                                const newHistory = [...(data.treatmentHistory || [])];
                                                if (!newHistory[index]) newHistory[index] = {};
                                                newHistory[index] = { ...newHistory[index], price: e.target.value };
                                                onChange('treatmentHistory', newHistory);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={row.note || ''}
                                            onChange={(e) => {
                                                const newHistory = [...(data.treatmentHistory || [])];
                                                if (!newHistory[index]) newHistory[index] = {};
                                                newHistory[index] = { ...newHistory[index], note: e.target.value };
                                                onChange('treatmentHistory', newHistory);
                                            }}
                                        />
                                    </td>
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
