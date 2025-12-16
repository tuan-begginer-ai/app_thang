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
        </div>
    );
};

export default PatientForm;
