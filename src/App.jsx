import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import PatientForm from './components/PatientForm';
import PrintTemplate from './components/PrintTemplate';
import PatientManager from './components/PatientManager';
import { dbService } from './services/db';
// import ToothChart from './components/ToothChart';
import jsPDF from 'jspdf';

function App() {
    const [patientData, setPatientData] = useState({
        id: null,
        name: '',
        dob: '',
        gender: 'Nam',
        address: '',
        phone: '',
        occupation: '',
        history: '',
        diagnosis: '',
        treatment: '',
        treatmentHistory: Array(11).fill({ date: '', diagnosis: '', doctor: '', price: '', note: '' })
    });

    const [isManagerOpen, setManagerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const templateRef = useRef(null);

    const handleFormChange = (name, value) => {
        setPatientData(prev => ({ ...prev, [name]: value }));
    };

    const handleNewPatient = () => {
        setPatientData({
            id: null,
            name: '',
            dob: '',
            gender: 'Nam',
            address: '',
            phone: '',
            occupation: '',
            history: '',
            diagnosis: '',
            treatment: '',
            treatmentHistory: Array(11).fill({ date: '', diagnosis: '', doctor: '', price: '', note: '' })
        });
    };

    const handleSavePatient = async () => {
        if (!patientData.name) {
            alert('Vui lòng nhập tên bệnh nhân!');
            return;
        }

        setIsSaving(true);
        try {
            let saved;
            if (patientData.id) {
                await dbService.updatePatient(patientData.id, patientData);
                saved = patientData;
                alert('Cập nhật thành công!');
            } else {
                saved = await dbService.addPatient(patientData);
                setPatientData(prev => ({ ...prev, id: saved.id }));
                alert('Lưu mới thành công!');
            }
        } catch (error) {
            console.error(error);
            alert('Có lỗi khi lưu dữ liệu!');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectPatient = (patient) => {
        // Ensure treatmentHistory has 11 rows if it's missing or short
        const history = patient.treatmentHistory || [];
        const paddedHistory = [...history];
        while (paddedHistory.length < 11) {
            paddedHistory.push({ date: '', diagnosis: '', doctor: '', price: '', note: '' });
        }

        setPatientData({
            ...patient,
            treatmentHistory: paddedHistory
        });
        setManagerOpen(false);
    };

    // IPC Listener for Menu Actions
    useEffect(() => {
        // Only run in Electron environment
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const handlePrintCall = () => ipcRenderer.send('print-to-paper');
                ipcRenderer.on('menu-action-print', handlePrintCall);
                return () => {
                    ipcRenderer.removeListener('menu-action-print', handlePrintCall);
                };
            } catch (e) {
                console.warn('Electron IPC not available', e);
            }
        }
    }, []);

    const handleExportPDF = async () => {
        if (!templateRef.current) return;

        try {
            const { toJpeg } = await import('html-to-image');

            // Configuration for quality and size
            const options = {
                quality: 0.95,
                cacheBust: true,
                pixelRatio: 1.5 // Balanced between quality and size
            };

            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a5'
            });

            // List of pages to capture
            const pageSelectors = ['.paper-a5', '.paper-a5-page2'];

            for (let i = 0; i < pageSelectors.length; i++) {
                const element = templateRef.current.querySelector(pageSelectors[i]);
                if (!element) continue;

                const dataUrl = await toJpeg(element, options);

                if (i > 0) pdf.addPage();

                const imgWidth = 210; // A5 Landscape Width
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;
                const imgHeight = (elementHeight * imgWidth) / elementWidth;

                pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight);
            }

            pdf.save(`DieuTri_${patientData.name || 'BenhNhan'}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Lỗi xuất PDF: " + err.message);
        }
    };

    return (
        <div className="app-container">
            <div className="toolbar" style={{
                position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', gap: '10px'
            }}>
                <button
                    onClick={() => setManagerOpen(true)}
                    style={btnStyle('#17a2b8')}
                >
                    Danh sách
                </button>
                <button
                    onClick={handleNewPatient}
                    style={btnStyle('#6c757d')}
                >
                    Tạo mới
                </button>
                <button
                    onClick={handleSavePatient}
                    disabled={isSaving}
                    style={btnStyle(isSaving ? '#cccccc' : '#007bff')}
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                    onClick={handleExportPDF}
                    style={btnStyle('#28a745')}
                >
                    Xuất PDF
                </button>
            </div>

            <Layout
                formSection={
                    <PatientForm data={patientData} onChange={handleFormChange} />
                }
                previewSection={
                    <PrintTemplate ref={templateRef} data={patientData} />
                }
            />

            <PatientManager
                isOpen={isManagerOpen}
                onClose={() => setManagerOpen(false)}
                onSelectPatient={handleSelectPatient}
            />
        </div>
    );
}

const btnStyle = (bg) => ({
    padding: '10px 20px',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
});

export default App;
