import { useState } from 'react';

const INITIAL_PATIENT_DATA = {
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
};

/**
 * Custom hook to manage patient data and operations.
 * Implements logic for loading, saving, and updating patient information.
 */
export const usePatientData = (dbService) => {
    const [patientData, setPatientData] = useState(INITIAL_PATIENT_DATA);
    const [isSaving, setIsSaving] = useState(false);

    const handleFormChange = (name, value) => {
        setPatientData(prev => ({ ...prev, [name]: value }));
    };

    const handleNewPatient = () => {
        setPatientData(INITIAL_PATIENT_DATA);
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
    };

    const savePatient = async () => {
        if (!patientData.name) {
            throw new Error('Vui lòng nhập tên bệnh nhân!');
        }

        setIsSaving(true);
        try {
            let targetId = patientData.id;

            // If new patient, check if name exists in DB
            if (!targetId) {
                const existing = await dbService.searchPatients(patientData.name);
                const match = existing.find(p => p.name.trim().toLowerCase() === patientData.name.trim().toLowerCase());

                if (match) {
                    if (!window.confirm(`Bệnh nhân "${patientData.name}" đã có hồ sơ. Bạn có muốn CẬP NHẬT vào hồ sơ cũ không?`)) {
                        return { success: false, cancelled: true };
                    }
                    targetId = match.id;
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

            return { success: true, excelError: response?.excelError };
        } catch (error) {
            console.error("Save Error:", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        patientData,
        isSaving,
        handleFormChange,
        handleNewPatient,
        handleSelectPatient,
        savePatient
    };
};
