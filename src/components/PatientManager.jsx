import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import '../styles/PatientManager.css';

const PatientManager = ({ isOpen, onClose, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const loadPatients = async (query = '') => {
        setLoading(true);
        try {
            const result = await dbService.searchPatients(query);
            setPatients(result);
        } catch (error) {
            console.error("Failed to load patients", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadPatients();
            setSearch('');
        }
    }, [isOpen]);

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearch(value);
        loadPatients(value);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Bạn có chắc muốn xóa bệnh nhân này?')) {
            await dbService.deletePatient(id);
            loadPatients(search);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="patient-manager-overlay" onClick={onClose}>
            <div className="patient-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Danh sách bệnh nhân</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SĐT, địa chỉ..."
                            value={search}
                            onChange={handleSearch}
                            autoFocus
                        />
                    </div>

                    {loading ? (
                        <div className="loading">Đang tải...</div>
                    ) : (
                        <table className="patient-list">
                            <thead>
                                <tr>
                                    <th>Họ tên</th>
                                    <th>Năm sinh</th>
                                    <th>SĐT</th>
                                    <th>Ngày tạo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.length > 0 ? (
                                    patients.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td>{p.dob}</td>
                                            <td>{p.phone}</td>
                                            <td>{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <button
                                                    className="action-btn select-btn"
                                                    onClick={() => onSelectPatient(p)}
                                                >
                                                    Chọn
                                                </button>
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={(e) => handleDelete(e, p.id)}
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-results">
                                            Không tìm thấy dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientManager;
