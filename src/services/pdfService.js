import jsPDF from 'jspdf';

/**
 * Service to handle PDF generation and export for patients.
 */
export const pdfService = {
    /**
     * Exports a patient template to a downloadable PDF File.
     */
    async exportPDF(templateRef, patientName) {
        if (!templateRef.current) return;

        try {
            const { toPng } = await import('html-to-image');
            
            // Wait for fonts to be ready to avoid layout shifts due to fallback fonts
            await document.fonts.ready;
            // Short delay to ensure any dynamic layout settles
            await new Promise(resolve => setTimeout(resolve, 200));

            const options = {
                cacheBust: true,
                pixelRatio: 2, 
                backgroundColor: '#f9f5f2'
            };

            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a5',
                compress: true 
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

                // Using 'PNG' for better text layout stability
                pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }

            pdf.save(`DieuTri_${patientName || 'BenhNhan'}.pdf`);
            return true;
        } catch (err) {
            console.error("PDF Export Error:", err);
            throw new Error("Lỗi xuất PDF: " + err.message);
        }
    },

    /**
     * Generates a Base64 string for the patient template (for BoldSign integration).
     */
    async generatePDFBase64(templateRef) {
        if (!templateRef.current) return null;

        try {
            const { toPng } = await import('html-to-image');
            await document.fonts.ready;
            
            const options = { 
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#f9f5f2'
            };

            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const pageSelectors = ['.paper-a5', '.paper-a5-page2'];
            for (let i = 0; i < pageSelectors.length; i++) {
                const element = templateRef.current.querySelector(pageSelectors[i]);
                if (!element) continue;

                const dataUrl = await toPng(element, options);
                if (i > 0) pdf.addPage();

                const imgWidth = 297; 
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;
                const imgHeight = (elementHeight * imgWidth) / elementWidth;

                pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }

            return pdf.output('datauristring');
        } catch (err) {
            console.error("Generate PDF Base64 Error:", err);
            return null;
        }
    }
};
