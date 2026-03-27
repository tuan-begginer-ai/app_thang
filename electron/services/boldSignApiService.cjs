const axios = require('axios');
const fs = require('fs');
const { dialog } = require('electron');
const appConfig = require('../config/appConfig.cjs');
const authService = require('./boldSignAuthService.cjs');

/**
 * Service to interact with the BoldSign REST API.
 */
class BoldSignApiService {
    /**
     * Common helper for authenticated API requests.
     */
    async request(method, path, data = null, options = {}) {
        const { doctorEmail, headers, ...axiosOptions } = options;
        const token = await authService.getAccessToken(doctorEmail);

        const config = {
            method,
            url: `${appConfig.boldSign.apiBaseUrl}${path}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json',
                ...headers
            },
            ...axiosOptions
        };

        if (data) config.data = data;
        return await axios(config);
    }

    async testConnection(userEmail) {
        try {
            const result = await this.request('get', '/document/list?pageSize=5', null, { doctorEmail: userEmail });
            return {
                success: true,
                message: 'Connection successful!',
                documentCount: result.data.result?.length ?? 0
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message
            };
        }
    }

    async sendForSignature(payload) {
        try {
            let base64Pdf = payload.pdfBase64;
            if (!base64Pdf && payload.pdfPath) {
                base64Pdf = fs.readFileSync(payload.pdfPath).toString('base64');
            }

            // Clean base64
            if (base64Pdf?.includes(',')) base64Pdf = base64Pdf.split(',')[1];
            if (!base64Pdf) throw new Error('PDF base64 content is required');

            const safePatientName = (payload.patientName || 'BenhNhan').trim() || 'BenhNhan';
            const safeDoctorName = (payload.doctorName || 'Bac Si').trim() || 'Bac Si';

            const requestBody = {
                Title: `Phieu kham - ${safePatientName}`,
                Message: `Please sign for patient ${safePatientName}.`,
                Files: [{
                    Base64: `data:application/pdf;base64,${base64Pdf}`,
                    FileName: `phieu-kham-${safePatientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
                }],
                Signers: [{
                    Name: safeDoctorName,
                    EmailAddress: payload.doctorEmail,
                    SignerType: 'Signer',
                    FormFields: [
                        {
                            Id: 'DoctorNameFixed',
                            FieldType: 'TextBox',
                            Value: safeDoctorName,
                            PageNumber: 1,
                            Bounds: { X: 123, Y: 375, Width: 200, Height: 25 },
                            IsReadOnly: true,
                            ValidationType: 'None',
                            Font: 'Helvetica',
                            FontSize: 13,
                            IsBold: true
                        },
                        {
                            Id: 'BacSiSignature',
                            FieldType: 'Signature',
                            PageNumber: 1,
                            Bounds: { X: 123, Y: 400, Width: 200, Height: 65 },
                            IsRequired: true
                        },
                        {
                            Id: 'NgayKy',
                            FieldType: 'DateSigned',
                            PageNumber: 1,
                            Bounds: { X: 123, Y: 470, Width: 200, Height: 40 },
                            IsRequired: true
                        }
                    ]
                }],
                ExpiryDays: 7
            };

            const response = await this.request('post', '/document/send', requestBody, { doctorEmail: payload.doctorEmail });
            return { success: true, documentId: response.data.documentId, message: `Sent to ${payload.doctorEmail}` };
        } catch (error) {
            console.error('[BoldSign API] Error sending for signature:', error.response?.data || error.message);
            
            let apiMessage = error.message;
            if (error.response?.data) {
                const data = error.response.data;
                apiMessage = data.message || (data.errors ? JSON.stringify(data.errors) : JSON.stringify(data));
            }
            return { success: false, message: `BoldSign API Error: ${apiMessage}` };
        }
    }

    async createEmbeddedRequest(payload) {
        try {
            let base64Pdf = payload.pdfBase64;
            if (!base64Pdf && payload.pdfPath) base64Pdf = fs.readFileSync(payload.pdfPath).toString('base64');
            if (base64Pdf?.includes(',')) base64Pdf = base64Pdf.split(',')[1];

            const requestBody = {
                Title: `Phiếu khám - ${payload.patientName}`,
                Message: `Please sign for patient ${payload.patientName}.`,
                SendViewOption: 'PreparePage',
                ShowToolbar: true,
                RedirectUrl: payload.redirectUrl || 'https://boldsign.com',
                Files: [{ Base64: `data:application/pdf;base64,${base64Pdf}`, FileName: `phieu-kham-${payload.patientName}.pdf` }],
                Signers: [{ Name: payload.doctorName, EmailAddress: payload.doctorEmail, SignerType: 'Signer' }],
                ExpiryDays: 7
            };

            const response = await this.request('post', '/document/createEmbeddedRequestUrl', requestBody, { doctorEmail: payload.doctorEmail });
            return { success: true, documentId: response.data.documentId, sendUrl: response.data.sendUrl };
        } catch (error) {
            console.error('[BoldSign API] Error creating embedded request:', error.response?.data || error.message);
            const apiMessage = error.response?.data?.errors 
                ? JSON.stringify(error.response.data.errors) 
                : (error.response?.data?.message || error.message);
            return { success: false, message: `BoldSign API Error: ${apiMessage}` };
        }
    }

    async checkStatus(documentId, doctorEmail) {
        const response = await this.request('get', `/document/properties?documentId=${documentId}`, null, { doctorEmail });
        const doc = response.data;
        return { success: true, status: doc.status, signerStatus: doc.signerStatus ?? doc.signerDetails?.[0]?.status };
    }

    async downloadSigned(documentId, doctorEmail) {
        const response = await this.request('get', `/document/download?documentId=${documentId}`, null, {
            doctorEmail,
            responseType: 'arraybuffer'
        });

        const { filePath } = await dialog.showSaveDialog({
            title: 'Lưu phiếu khám đã ký',
            defaultPath: `signed_document_${documentId}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, Buffer.from(response.data));
            return { success: true, savedTo: filePath };
        }
        return { success: false, message: 'Cancelled save' };
    }
}

module.exports = new BoldSignApiService();
