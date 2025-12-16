const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
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
// Moved outside createWindow to avoid adding multiple listeners
ipcMain.on('print-to-paper', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        // printBackground: true ensures the pink color prints
        win.webContents.print({ printBackground: true, silent: false }, (success, errorType) => {
            if (!success) console.log("Print failed:", errorType);
        });
    }
});

// --- Database Integration ---
const db = require('./db.cjs');

// Initialize DB
db.initDatabase();

// IPC Handlers for Database
ipcMain.handle('db-get-patients', () => {
    return db.getPatients();
});

ipcMain.handle('db-search-patients', (event, query) => {
    return db.searchPatients(query);
});

ipcMain.handle('db-add-patient', (event, patient) => {
    return db.addPatient(patient);
});

ipcMain.handle('db-update-patient', (event, { id, patient }) => {
    return db.updatePatient(id, patient);
});

ipcMain.handle('db-delete-patient', (event, id) => {
    return db.deletePatient(id);
});
// -----------------------------

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
