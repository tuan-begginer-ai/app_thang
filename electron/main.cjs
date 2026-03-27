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
  setImmediate(() => cleanLegacyTokens());

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

// --- Settings & Auth Config ---
const SETTINGS_FILE = path.join(app.getPath('userData'), 'boldsign-settings.json');

function saveSettings(data) {
  const current = getSettings();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...current, ...data }, null, 2));
}

function getSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch (e) {
      return { authMethod: 'client_credentials' };
    }
  }
  return { authMethod: 'client_credentials' };
}

// IPC handlers for settings
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (event, data) => saveSettings(data));

// Migrate: Xóa các token cũ có key 'default', 'unknown' hoặc các chuỗi UUID không phải email
function cleanLegacyTokens() {
  const settings = getSettings();
  const tokens = settings.userTokens || {};
  let changed = false;
  
  Object.keys(tokens).forEach(key => {
    // Nếu key không chứa @, có thể là UUID cũ từ lần trước
    if (key === 'default' || key === 'unknown' || !key.includes('@')) {
      delete tokens[key];
      changed = true;
      console.log(`[BoldSign] Đã dọn dẹp token không hợp lệ: "${key}"`);
    }
  });

  if (changed) saveSettings({ userTokens: tokens });
}

// PKCE Helpers
const crypto = require('crypto');
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}
function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Global variable to store current session verifier (needs security but OK for test)
let currentCodeVerifier = null;
let currentAuthEmail = null; // Store which doctor is trying to log in
let currentAuthWindow = null;

// --- BoldSign API Dispatcher ---
async function getBoldSignAccessToken(userEmail) {
  const settings = getSettings();
  if (settings.authMethod === 'authorization_code') {
    if (!userEmail) throw new Error('DOCTOR_EMAIL_REQUIRED');
    return await getBoldSignAuthCodeToken(userEmail);
  }
  return await getBoldSignClientCredentialsToken();
}

async function getBoldSignClientCredentialsToken() {
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

async function getBoldSignAuthCodeToken(userEmail) {
  const settings = getSettings();
  const tokens = settings.userTokens || {};
  let userTokenData = tokens[userEmail];

  if (!userTokenData) {
    throw new Error(`USER_NOT_LOGGED_IN`);
  }

  if (userTokenData && userTokenData.expiresAt > Date.now()) {
    return userTokenData.access_token;
  }

  if (userTokenData?.refresh_token) {
    try {
      return await refreshAuthCodeToken(userEmail, userTokenData.refresh_token);
    } catch (e) {
      console.log(`Refresh failed for ${userEmail}, needs login`, e.message);
    }
  }

  throw new Error(`AUTH_CODE_LOGIN_REQUIRED`);
}

async function refreshAuthCodeToken(userEmail, refreshToken) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  const authClientId = process.env.VITE_BOLDSIGN_AUTH_CLIENT_ID || process.env.VITE_BOLDSIGN_CLIENT_ID;
  params.append('client_id', authClientId);
  if (process.env.VITE_BOLDSIGN_AUTH_CLIENT_SECRET || process.env.VITE_BOLDSIGN_CLIENT_SECRET) {
    params.append('client_secret', process.env.VITE_BOLDSIGN_AUTH_CLIENT_SECRET || process.env.VITE_BOLDSIGN_CLIENT_SECRET);
  }
  params.append('refresh_token', refreshToken);

  const response = await axios.post(
    'https://account.boldsign.com/connect/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const tokenData = {
    ...response.data,
    expiresAt: Date.now() + response.data.expires_in * 1000
  };

  const settings = getSettings();
  const userTokens = settings.userTokens || {};
  userTokens[userEmail] = tokenData;

  saveSettings({ userTokens });
  return tokenData.access_token;
}

// Handlers for Auth flow
ipcMain.handle('boldsign:start-login', async (event, payload) => {
  const userEmailFromUI = payload?.userEmail?.trim();
  if (!userEmailFromUI) {
    return { success: false, message: 'Vui lòng nhập email trước khi đăng nhập.' };
  }

  currentCodeVerifier = generateCodeVerifier();
  currentAuthEmail = userEmailFromUI; // Lưu email do người dùng nhập
  const codeChallenge = generateCodeChallenge(currentCodeVerifier);

  const authClientId = process.env.VITE_BOLDSIGN_AUTH_CLIENT_ID || process.env.VITE_BOLDSIGN_CLIENT_ID;
  const redirectUri = `http://localhost:5173`;
  
  console.log(`[BoldSign] Đang mở cửa sổ đăng nhập cho [${userEmailFromUI}]...`);

  const authUrl = `https://account.boldsign.com/connect/authorize?response_type=code&client_id=${authClientId}&scope=BoldSign.Documents.All%20offline_access%20openid%20profile%20email&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=electron_login&prompt=login&login_hint=${encodeURIComponent(userEmailFromUI)}`;

  if (currentAuthWindow) {
    currentAuthWindow.close();
    currentAuthWindow = null;
  }

  return new Promise((resolve, reject) => {
    const loginSession = require('electron').session.fromPartition('boldsign-auth-' + Date.now(), { cache: false });
    
    currentAuthWindow = new BrowserWindow({
      width: 600,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        session: loginSession
      }
    });

    const handleRedirect = async (navEvent, urlStr) => {
      console.log('[BoldSign] Kiểm tra URL redirect:', urlStr);
      if (urlStr.includes('localhost:5173') || urlStr.includes('127.0.0.1:5173')) {
        navEvent.preventDefault();
        try {
          const parsedUrl = new URL(urlStr);
          const code = parsedUrl.searchParams.get('code');
          if (code) {
            console.log('[BoldSign] Đã nhận Authorization Code, đang đổi token...');
            const result = await exchangeCodeInternal(code, currentAuthEmail);
            resolve({ success: true, email: result.email, message: `Đăng nhập thành công (${result.email})` });
          } else {
            const error = parsedUrl.searchParams.get('error_description') || 'Không có authorization code';
            console.warn('[BoldSign] Lỗi login:', error);
            reject(new Error(error));
          }
        } catch (err) {
          console.error('[BoldSign] Lỗi xử lý callback:', err.message);
          reject(err);
        } finally {
          if (currentAuthWindow) currentAuthWindow.close();
        }
      }
    };

    currentAuthWindow.webContents.on('will-redirect', handleRedirect);
    currentAuthWindow.webContents.on('will-navigate', handleRedirect);

    currentAuthWindow.loadURL(authUrl);
    currentAuthWindow.on('closed', () => {
      currentAuthWindow = null;
      resolve({ success: false, message: 'Cửa sổ đăng nhập đã đóng' });
    });
  });
});

async function exchangeCodeInternal(code, userEmail) {
  if (!currentCodeVerifier) throw new Error('NO_VERIFIER');
  const emailToStore = userEmail || currentAuthEmail;
  if (!emailToStore) throw new Error('NO_USER_EMAIL: Email chưa được cung cấp.');

  try {
    const authClientId = process.env.VITE_BOLDSIGN_AUTH_CLIENT_ID || process.env.VITE_BOLDSIGN_CLIENT_ID;
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', authClientId);
    if (process.env.VITE_BOLDSIGN_AUTH_CLIENT_SECRET || process.env.VITE_BOLDSIGN_CLIENT_SECRET) {
      params.append('client_secret', process.env.VITE_BOLDSIGN_AUTH_CLIENT_SECRET || process.env.VITE_BOLDSIGN_CLIENT_SECRET);
    }
    params.append('code', code);
    params.append('code_verifier', currentCodeVerifier);
    params.append('redirect_uri', `http://localhost:5173`);

    const response = await axios.post(
      'https://account.boldsign.com/connect/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokenData = {
      ...response.data,
      expiresAt: Date.now() + response.data.expires_in * 1000
    };

    // Dùng email do người dùng cung cấp làm key lưu token
    console.log('[BoldSign] ✅ Lưu token với key:', emailToStore);
    const settings = getSettings();
    const userTokens = settings.userTokens || {};
    userTokens[emailToStore] = tokenData;
    saveSettings({ userTokens });

    currentCodeVerifier = null;
    currentAuthEmail = null;

    return { success: true, email: emailToStore };
  } catch (error) {
    console.error('Exchange error:', error.response?.data || error.message);
    throw error;
  }
}

// Bọc lộ ra cho frontend nếu frontend tự gửi exchange-code (Trường hợp Web)
ipcMain.handle('boldsign:exchange-code', async (event, code) => {
  return await exchangeCodeInternal(code);
});

ipcMain.handle('boldsign:get-logged-in-users', () => {
  const settings = getSettings();
  const tokens = settings.userTokens || {};
  return Object.keys(tokens);
});

ipcMain.handle('boldsign:logout-user', (event, email) => {
  const settings = getSettings();
  const tokens = settings.userTokens || {};
  if (tokens[email]) {
    delete tokens[email];
    saveSettings({ userTokens: tokens });
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('boldsign:test-connection', async (event, payload) => {
  try {
    const userEmail = payload?.userEmail;
    const token = await getBoldSignAccessToken(userEmail);
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
    // Ưu tiên dùng doctorEmail để lấy token cho đúng bác sĩ đó
    const userEmail = payload.doctorEmail;
    const token = await getBoldSignAccessToken(userEmail);

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
              id: 'DoctorNameFixed',
              name: 'Họ tên Bác sĩ',
              fieldType: 'TextBox',
              value: payload.doctorName, // Tên từ App truyền vào
              pageNumber: 1,
              bounds: {
                x: 123,
                y: 375, // Nằm phía trên chữ ký (chữ ký bắt đầu từ 400)
                width: 200,
                height: 25
              },
              isReadOnly: true,
              font: { fontSize: 13, isBold: true }
            },
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
    const userEmail = payload.doctorEmail;
    const token = await getBoldSignAccessToken(userEmail);

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
ipcMain.handle('boldsign:check-status', async (event, { documentId, doctorEmail }) => {
  try {
    const userEmail = doctorEmail;
    const token = await getBoldSignAccessToken(userEmail);

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
ipcMain.handle('boldsign:download-signed', async (event, { documentId, doctorEmail }) => {
  try {
    const userEmail = doctorEmail;
    const token = await getBoldSignAccessToken(userEmail);

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
