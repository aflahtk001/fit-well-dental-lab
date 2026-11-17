const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dbManager = require('./database.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 980,
    minHeight: 700,
    title: 'Fit Well Dental Lab - Desktop Billing Software',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error('DID_FAIL_LOAD:', code, desc, url);
  });
  mainWindow.webContents.on('console-message', (e, level, msg, line, src) => {
    console.log(`[RENDERER CONSOLE ${level}]`, msg, `(${src}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    console.error('RENDER_PROCESS_GONE:', details);
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC Handlers
function setupIpcHandlers() {
  // Doctors
  ipcMain.handle('doctors:get', async () => {
    try {
      return { success: true, data: dbManager.getDoctors() };
    } catch (err) {
      console.error('Error fetching doctors:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doctors:add', async (_event, data) => {
    try {
      const result = dbManager.addDoctor(data);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error adding doctor:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doctors:update', async (_event, data) => {
    try {
      const result = dbManager.updateDoctor(data);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error updating doctor:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('doctors:delete', async (_event, id) => {
    try {
      dbManager.deleteDoctor(id);
      return { success: true };
    } catch (err) {
      console.error('Error deleting doctor:', err);
      return { success: false, error: err.message };
    }
  });

  // Clinics
  ipcMain.handle('clinics:get', async () => {
    try {
      return { success: true, data: dbManager.getClinics() };
    } catch (err) {
      console.error('Error fetching clinics:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('clinics:add', async (_event, data) => {
    try {
      const result = dbManager.addClinic(data);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error adding clinic:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('clinics:update', async (_event, data) => {
    try {
      const result = dbManager.updateClinic(data);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error updating clinic:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('clinics:delete', async (_event, id) => {
    try {
      dbManager.deleteClinic(id);
      return { success: true };
    } catch (err) {
      console.error('Error deleting clinic:', err);
      return { success: false, error: err.message };
    }
  });

  // Receipts
  ipcMain.handle('receipts:getNextBillNumber', async () => {
    try {
      const nextNum = dbManager.getNextBillNumber();
      return { success: true, data: nextNum };
    } catch (err) {
      console.error('Error fetching next bill number:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('receipts:save', async (_event, receiptData) => {
    try {
      const result = dbManager.saveReceipt(receiptData);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error saving receipt:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('receipts:update', async (_event, receiptData) => {
    try {
      const result = dbManager.updateReceipt(receiptData);
      return { success: true, data: result };
    } catch (err) {
      console.error('Error updating receipt:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('receipts:get', async () => {
    try {
      return { success: true, data: dbManager.getReceipts() };
    } catch (err) {
      console.error('Error fetching receipts:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('receipts:getById', async (_event, id) => {
    try {
      return { success: true, data: dbManager.getReceiptById(id) };
    } catch (err) {
      console.error('Error fetching receipt:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('receipts:delete', async (_event, id) => {
    try {
      dbManager.deleteReceipt(id);
      return { success: true };
    } catch (err) {
      console.error('Error deleting receipt:', err);
      return { success: false, error: err.message };
    }
  });

  // Print
  ipcMain.handle('receipts:print', async () => {
    if (!mainWindow) return { success: false, error: 'No active window' };
    return new Promise((resolve) => {
      mainWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  // Monthly Reports
  ipcMain.handle('reports:getMonthly', async (_event, params) => {
    try {
      const data = dbManager.getMonthlyReport(params);
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching monthly report:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:saveCsv', async (_event, { defaultFileName, content }) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Monthly Report CSV',
        defaultPath: defaultFileName || 'Monthly_Report.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      console.error('Error saving CSV file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:savePdf', async (_event, options = {}) => {
    try {
      if (!mainWindow) return { success: false, error: 'No active window' };
      const defaultFileName = typeof options === 'string' ? options : (options.defaultFileName || 'Document.pdf');
      const dialogTitle = options.title || (defaultFileName.startsWith('Receipt_') ? 'Save Receipt PDF' : 'Save Monthly Report PDF');
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: dialogTitle,
        defaultPath: defaultFileName,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      const pdfBuffer = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { marginType: 'none' },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (err) {
      console.error('Error saving PDF file:', err);
      return { success: false, error: err.message };
    }
  });

  // DB Info
  ipcMain.handle('app:getDbInfo', async () => {
    return {
      dbPath: dbManager.getDbPath(),
    };
  });
}

app.whenReady().then(() => {
  dbManager.initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
