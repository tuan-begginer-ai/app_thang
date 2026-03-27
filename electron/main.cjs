const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./logger.cjs');

// Config & Services
const appConfig = require('./config/appConfig.cjs');
const settingsService = require('./services/settingsService.cjs');
const db = require('./db.cjs');
const autoUpdateService = require('./services/autoUpdateService.cjs');
const backupService = require('./services/backupService.cjs');

// IPC Handlers
const { registerDbHandlers } = require('./ipc/dbHandlers.cjs');
const { registerBoldSignHandlers } = require('./ipc/boldSignHandlers.cjs');
const { registerSettingsHandlers } = require('./ipc/settingsHandlers.cjs');

/**
 * Main Window Factory
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const isDev = appConfig.env === 'development';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Restriction: Disable navigation out of the application
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Debug: Log renderer console to terminal
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [L${level}] ${message}`);
  });
}

/**
 * Application Menu Factory
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Tạo mới (New)', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        {
          label: 'In phiếu (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.send('menu-action-print');
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
        ...(appConfig.env === 'development' ? [{ role: 'toggleDevTools' }] : []),
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

/**
 * Bootstrap the application
 */
app.whenReady().then(() => {
  const isDev = appConfig.env === 'development';
  // 1. Set Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // 🔍 IMPORTANT: Only apply our hard CSP to our own app. 
    // Applying it to external domains (like app.boldsign.com) will break them!
    const isAppRequest = details.url.startsWith('http://localhost') || 
                        details.url.startsWith('file://');
    
    if (!isAppRequest) {
      return callback({ responseHeaders: details.responseHeaders });
    }

    const csp = [
      "default-src 'self';",
      // Vite and React Refresh need 'unsafe-inline' and 'unsafe-eval' in dev
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""};`,
      // Allow Google Fonts and Vite styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "img-src 'self' data: blob: http://localhost:*; ",
      // Vite HMR uses WebSockets (ws://localhost:*)
      "connect-src 'self' http://localhost:* ws://localhost:* https://api.boldsign.com https://account.boldsign.com https://fonts.googleapis.com https://fonts.gstatic.com;",
      "frame-src https://app.boldsign.com;",
      // Google Fonts actual files are on gstatic
      "font-src 'self' data: https://fonts.gstatic.com"
    ].join(" ");

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // Initialize Database
  db.initDatabase();

  // Register all IPC Handlers
  registerDbHandlers(ipcMain);
  registerBoldSignHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);

  // Background Tasks
  setImmediate(() => settingsService.cleanLegacyTokens());

  // Show UI
  createWindow();
  createMenu();

  // 1. Initialize AutoUpdate (only production)
  autoUpdateService.init();

  // 2. Schedule Backup (24h)
  backupService.schedule();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Basic IPC - Printing
ipcMain.on('print-to-paper', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.print({ printBackground: true, silent: false }, (success, errorType) => {
      if (!success) logger.warn("Lỗi khi in (Print failed):", { errorType });
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
