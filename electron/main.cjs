const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Tạo mới (New)',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },
        {
          label: 'In phiếu (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-action-print');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Thoát' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC Listener for printing request from Renderer
ipcMain.on('print-to-paper', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.print({ printBackground: true, silent: false }, (success, errorType) => {
      if (!success) console.log("Print failed:", errorType);
    });
  }
});

// --- Database Integration ---
const db = require('./db.cjs');
db.initDatabase();
db.syncToExcel();

ipcMain.handle('db-get-patients', () => db.getPatients());
ipcMain.handle('db-search-patients', (event, query) => db.searchPatients(query));
ipcMain.handle('db-add-patient', (event, patient) => db.addPatient(patient));
ipcMain.handle('db-update-patient', (event, { id, patient }) => db.updatePatient(id, patient));
ipcMain.handle('db-delete-patient', (event, id) => db.deletePatient(id));

// --- BoldSign API ---
async function getBoldSignToken() {
  const params = new URLSearchParams()
  params.append('grant_type', 'client_credentials')
  params.append('client_id', process.env.VITE_BOLDSIGN_CLIENT_ID)
  params.append('client_secret', process.env.VITE_BOLDSIGN_CLIENT_SECRET)
  params.append('scope', 'BoldSign.Documents.All')

  const response = await axios.post(
    'https://account.boldsign.com/connect/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return response.data.access_token
}

ipcMain.handle('boldsign:test-connection', async () => {
  try {
    const token = await getBoldSignToken()
    const result = await axios.get(
      'https://api.boldsign.com/v1/document/list?pageSize=5',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return {
      success: true,
      message: 'Kết nối thành công!',
      documentCount: result.data.result?.length ?? 0
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    }
  }
});

// Create Signature Request
ipcMain.handle('boldsign:send-for-signature', async (event, payload) => {
  try {
    const token = await getBoldSignToken()

    let base64Pdf = payload.pdfBase64;
    if (!base64Pdf && payload.pdfPath) {
      const pdfBuffer = fs.readFileSync(payload.pdfPath);
      base64Pdf = pdfBuffer.toString('base64');
    }

    // Clean base64: Remove any existing data-uri prefix to avoid issues with jsPDF's filename attribute
    if (base64Pdf.includes(',')) {
      base64Pdf = base64Pdf.split(',')[1];
    }

    const requestBody = {
      title: `Phiếu khám - ${payload.patientName}`,
      message: `Kính gửi Bác sĩ ${payload.doctorName}, vui lòng ký xác nhận phiếu khám bệnh nhân ${payload.patientName}.`,
      files: [
        {
          base64: `data:application/pdf;base64,${base64Pdf}`,
          fileName: `phieu-kham-${payload.patientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        }
      ],
      signers: [
        {
          name: payload.doctorName,
          emailAddress: payload.doctorEmail,
          signerType: 'Signer',
          formFields: [
            {
              id: 'BacSiSignature',
              name: 'Chữ ký Bác sĩ',
              fieldType: 'Signature',
              pageNumber: 1,
              bounds: {
                x: 123,
                y: 400,
                width: 200,
                height: 65
              },
              isRequired: true
            },
            {
              id: 'NgayKy',
              name: 'Ngày ký',
              fieldType: 'DateSigned',
              pageNumber: 1,
              bounds: {
                x: 123,
                y: 470,
                width: 200,
                height: 40
              },
              isRequired: true
            }
          ]
        }
      ],
      expiryDays: 7,
      reminderSettings: {
        enableAutoReminder: true,
        reminderDays: 2,
        reminderCount: 3
      }
    }

    const response = await axios.post(
      'https://api.boldsign.com/v1/document/send',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      }
    )

    return {
      success: true,
      documentId: response.data.documentId,
      message: `Đã gửi phiếu khám tới email ${payload.doctorEmail}`
    }

  } catch (error) {
    const errorData = error.response?.data;
    console.error('BoldSign 422 Error Details:', JSON.stringify(errorData, null, 2));

    let errorMessage = error.message;
    if (errorData) {
      if (errorData.errors) {
        errorMessage = Object.entries(errorData.errors)
          .map(([key, val]) => `${key}: ${val}`)
          .join('; ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    }

    return {
      success: false,
      message: errorMessage
    }
  }
})

// Create Embedded Request (Prepare Page)
ipcMain.handle('boldsign:create-embedded-request', async (event, payload) => {
  try {
    const token = await getBoldSignToken()

    let base64Pdf = payload.pdfBase64;
    if (!base64Pdf && payload.pdfPath) {
      const pdfBuffer = fs.readFileSync(payload.pdfPath);
      base64Pdf = pdfBuffer.toString('base64');
    }

    if (base64Pdf && base64Pdf.includes(',')) {
      base64Pdf = base64Pdf.split(',')[1];
    }

    const requestBody = {
      title: `Phiếu khám - ${payload.patientName}`,
      message: `Vui lòng ký xác nhận phiếu khám bệnh nhân ${payload.patientName}.`,

      // ── Embedded Request options ──────────────────────
      sendViewOption: 'PreparePage',
      showToolbar: true,
      showSendButton: true,
      showSaveButton: true,
      showPreviewButton: true,
      showNavigationButtons: false,

      // RedirectUrl is often required for embedded requests
      redirectUrl: 'https://boldsign.com',

      files: [{
        base64: `data:application/pdf;base64,${base64Pdf}`,
        fileName: `phieu-kham-${payload.patientName}.pdf`
      }],

      signers: [{
        name: payload.doctorName,
        emailAddress: payload.doctorEmail,
        signerType: 'Signer',
        locale: 'EN'
      }],

      expiryDays: 7
    }

    const response = await axios.post(
      'https://api.boldsign.com/v1/document/createEmbeddedRequestUrl',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      }
    )

    return {
      success: true,
      documentId: response.data.documentId,
      sendUrl: response.data.sendUrl
    }

  } catch (error) {
    const errorData = error.response?.data;
    console.error('BoldSign Embedded Error:', JSON.stringify(errorData, null, 2));

    let errorMessage = error.message;
    if (errorData) {
      if (errorData.errors) {
        errorMessage = Object.entries(errorData.errors)
          .map(([key, val]) => `${key}: ${val}`)
          .join('; ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    }

    return {
      success: false,
      message: errorMessage,
      detail: errorData
    }
  }
})

// Check status
ipcMain.handle('boldsign:check-status', async (event, { documentId }) => {
  try {
    const token = await getBoldSignToken()

    const response = await axios.get(
      `https://api.boldsign.com/v1/document/properties?documentId=${documentId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    const doc = response.data
    return {
      success: true,
      status: doc.status,
      signerStatus: doc.signerDetails?.[0]?.status
    }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// Download signed PDF
ipcMain.handle('boldsign:download-signed', async (event, { documentId }) => {
  try {
    const token = await getBoldSignToken();

    const response = await axios.get(
      `https://api.boldsign.com/v1/document/download?documentId=${documentId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      }
    );

    // Show save dialog to user
    const { filePath } = await dialog.showSaveDialog({
      title: 'Lưu phiếu khám đã ký',
      defaultPath: `signed_document_${documentId}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, Buffer.from(response.data));
      return { success: true, savedTo: filePath };
    }
    return { success: false, message: 'Đã hủy lưu file' };

  } catch (error) {
    return { success: false, message: error.message };
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
