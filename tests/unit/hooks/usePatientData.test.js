import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePatientData } from '../../../src/hooks/usePatientData';

describe('usePatientData Hook', () => {
    let mockDbService;

    beforeEach(() => {
        mockDbService = {
            searchPatients: vi.fn().mockResolvedValue([]),
            addPatient: vi.fn(),
            updatePatient: vi.fn(),
        };
        vi.clearAllMocks();
    });

    it('should initialize with default data', () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        expect(result.current.patientData.name).toBe('');
        expect(result.current.patientData.treatmentHistory.length).toBe(11);
    });

    it('should handle name changes', () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        act(() => {
            result.current.handleFormChange('name', 'John Doe');
        });
        expect(result.current.patientData.name).toBe('John Doe');
    });

    it('should throw error when saving without a name', async () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        await expect(result.current.savePatient()).rejects.toThrow('Vui lòng nhập tên bệnh nhân!');
    });

    it('should call addPatient for a new patient', async () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        
        act(() => {
            result.current.handleFormChange('name', 'New Patient');
        });

        mockDbService.addPatient.mockResolvedValue({ id: 99 });

        let saveResult;
        await act(async () => {
            saveResult = await result.current.savePatient();
        });

        expect(mockDbService.addPatient).toHaveBeenCalled();
        expect(result.current.patientData.id).toBe(99);
        expect(saveResult.success).toBe(true);
    });

    it('should call updatePatient for an existing patient', async () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        
        act(() => {
            result.current.handleSelectPatient({ id: 50, name: 'Old Patient', treatmentHistory: [] });
        });

        mockDbService.updatePatient.mockResolvedValue({ success: true });

        await act(async () => {
            await result.current.savePatient();
        });

        expect(mockDbService.updatePatient).toHaveBeenCalledWith(50, expect.any(Object));
    });

    it('should pad short treatment history to 11 rows when selecting patient', () => {
        const { result } = renderHook(() => usePatientData(mockDbService));
        
        act(() => {
            result.current.handleSelectPatient({ name: 'Short History', treatmentHistory: [{ date: 'Today' }] });
        });

        expect(result.current.patientData.treatmentHistory.length).toBe(11);
        expect(result.current.patientData.treatmentHistory[0].date).toBe('Today');
        expect(result.current.patientData.treatmentHistory[10].date).toBe('');
    });
});
