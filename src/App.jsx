import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import PatientForm from './components/PatientForm';
import PrintTemplate from './components/PrintTemplate';
import PatientManager from './components/PatientManager';
import SignatureRequest from './components/SignatureRequest';
import BoldSignTest from './components/BoldSignTest';
import BoldSignCallback from './components/BoldSignCallback';

import { dbService } from './services/db';
import { pdfService } from './services/pdfService';
import { usePatientData } from './hooks/usePatientData';

/**
 * Main Application Component
 * Coordinates between Patient Management, Form Entry, and Print Preview.
 */
function App() {
    // Check if we are in the callback route
    if (window.location.pathname === '/boldsign/callback' || window.location.search.includes('code=')) {
        return <BoldSignCallback />;
    }

    const {
        patientData,
        isSaving,
        handleFormChange,
        handleNewPatient,
        handleSelectPatient,
        savePatient
    } = usePatientData(dbService);

    const [isManagerOpen, setManagerOpen] = useState(false);
    const templateRef = useRef(null);

    /**
     * Handles patient data persistence and UI feedback.
     */
    const onSave = async () => {
        try {
            const { success, cancelled, excelError } = await savePatient();
            if (cancelled) return;

            if (success) {
                if (excelError) {
                    alert(`Đã lưu vào Database, nhưng KHÔNG THỂ cập nhật file Excel.\n\nLý do: ${excelError}\n\n(Vui lòng Đóng file patients.xlsx nếu đang mở và thử Lưu lại)`);
                } else {
                    alert('Lưu dữ liệu thành công!');
                }
            }
        } catch (error) {
            alert(error.message || 'Có lỗi hệ thống khi lưu dữ liệu!');
        }
    };

    /**
     * Orchestrates PDF export via pdfService.
     */
    const onExportPDF = async () => {
        try {
            await pdfService.exportPDF(templateRef, patientData.name);
        } catch (error) {
            alert(error.message);
        }
    };

    /**
     * Inter-Process Communication (IPC) for Electron Menu Actions
     */
    useEffect(() => {
        if (!window.dbAPI) return;

        const handlePrint = () => window.dbAPI.send('print-to-paper');
        window.dbAPI.on('menu-action-print', handlePrint);

        return () => {
            window.dbAPI.removeListener('menu-action-print', handlePrint);
        };
    }, []);

    return (
        <div className="app-container">
            <div className="toolbar" style={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(5px)'
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
                    onClick={onSave}
                    disabled={isSaving}
                    style={btnStyle(isSaving ? '#cccccc' : '#007bff')}
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                    onClick={onExportPDF}
                    style={btnStyle('#28a745')}
                >
                    Xuất PDF
                </button>
            </div>

            <Layout
                formSection={
                    <>
                        <PatientForm data={patientData} onChange={handleFormChange} />
                        <SignatureRequest 
                            patientName={patientData.name || 'Bệnh nhân'} 
                            getPdfBase64={() => pdfService.generatePDFBase64(templateRef)} 
                        />
                    </>
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

            {/* BoldSign Test Component floating at bottom right */}
            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10000 }}>
                <BoldSignTest />
            </div>
        </div>
    );
}

const btnStyle = (bg) => ({
    width: '65px',
    height: '28px',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export default App;
