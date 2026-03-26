import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import PatientForm from './components/PatientForm';
import PrintTemplate from './components/PrintTemplate';
import PatientManager from './components/PatientManager';
import SignatureRequest from './components/SignatureRequest';
import { dbService } from './services/db';
import BoldSignTest from './components/BoldSignTest';
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
            let targetId = patientData.id;

            // Nếu là bệnh nhân mới (chưa có id), kiểm tra xem tên đã tồn tại trong DB chưa
            if (!targetId) {
                const existing = await dbService.searchPatients(patientData.name);
                const match = existing.find(p => p.name.trim().toLowerCase() === patientData.name.trim().toLowerCase());

                if (match) {
                    if (window.confirm(`Bệnh nhân "${patientData.name}" đã có hồ sơ. Bạn có muốn CẬP NHẬT vào hồ sơ cũ không?`)) {
                        targetId = match.id;
                    } else {
                        setIsSaving(false);
                        return;
                    }
                }
            }

            let response;
            if (targetId) {
                response = await dbService.updatePatient(targetId, patientData);
                setPatientData(prev => ({ ...prev, id: targetId }));
            } else {
                response = await dbService.addPatient(patientData);
                if (response && response.id) {
                    setPatientData(prev => ({ ...prev, id: response.id }));
                }
            }

            // Kiểm tra lỗi Excel từ phản hồi của backend
            if (response && response.excelError) {
                alert(`Đã lưu vào Database, nhưng KHÔNG THỂ cập nhật file Excel.\n\nLý do: ${response.excelError}\n\n(Vui lòng Đóng file patients.xlsx nếu đang mở và thử Lưu lại)`);
            } else {
                alert('Lưu dữ liệu thành công!');
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert('Có lỗi hệ thống khi lưu dữ liệu!');
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
        if (window.dbAPI) {
            try {
                const handlePrintCall = () => window.dbAPI.send('print-to-paper');
                window.dbAPI.on('menu-action-print', handlePrintCall);
                return () => {
                    window.dbAPI.removeListener('menu-action-print', handlePrintCall);
                };
            } catch (e) {
                console.warn('Electron IPC not available', e);
            }
        }
    }, []);

    const handleExportPDF = async () => {
        if (!templateRef.current) return;

        try {
            const { toPng } = await import('html-to-image');

            // Configuration for maximum sharpness
            const options = {
                cacheBust: true,
                pixelRatio: 3, // High resolution (3x)
                backgroundColor: '#f9f5f2' // Ensure consistent background
            };

            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a5'
            });

            const pageSelectors = ['.paper-a5', '.paper-a5-page2'];
            for (let i = 0; i < pageSelectors.length; i++) {
                const element = templateRef.current.querySelector(pageSelectors[i]);
                if (!element) continue;

                const dataUrl = await toPng(element, options);
                if (i > 0) pdf.addPage();

                const imgWidth = 210;
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;
                const imgHeight = (elementHeight * imgWidth) / elementWidth;

                pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
            }

            pdf.save(`DieuTri_${patientData.name || 'BenhNhan'}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Lỗi xuất PDF: " + err.message);
        }
    };

    const generatePDFBase64 = async () => {
        if (!templateRef.current) return null;

        try {
            const { toPng } = await import('html-to-image');
            const options = { 
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#f9f5f2'
            };

            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a4'
            });

            const pageSelectors = ['.paper-a5', '.paper-a5-page2'];
            for (let i = 0; i < pageSelectors.length; i++) {
                const element = templateRef.current.querySelector(pageSelectors[i]);
                if (!element) continue;

                const dataUrl = await toPng(element, options);
                if (i > 0) pdf.addPage();

                const imgWidth = 297; // A4 Landscape Width
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;
                const imgHeight = (elementHeight * imgWidth) / elementWidth;

                pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
            }

            const base64 = pdf.output('datauristring');
            return base64;
        } catch (err) {
            console.error("Generate PDF Base64 Error:", err);
            return null;
        }
    };

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
                    <>
                        <PatientForm data={patientData} onChange={handleFormChange} />
                        <SignatureRequest 
                            patientName={patientData.name || 'Bệnh nhân'} 
                            getPdfBase64={generatePDFBase64} 
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
