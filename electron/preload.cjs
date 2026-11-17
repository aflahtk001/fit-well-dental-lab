const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Doctors
  getDoctors: () => ipcRenderer.invoke('doctors:get'),
  addDoctor: (data) => ipcRenderer.invoke('doctors:add', data),
  updateDoctor: (data) => ipcRenderer.invoke('doctors:update', data),
  deleteDoctor: (id) => ipcRenderer.invoke('doctors:delete', id),

  // Clinics
  getClinics: () => ipcRenderer.invoke('clinics:get'),
  addClinic: (data) => ipcRenderer.invoke('clinics:add', data),
  updateClinic: (data) => ipcRenderer.invoke('clinics:update', data),
  deleteClinic: (id) => ipcRenderer.invoke('clinics:delete', id),

  // Receipts
  getNextBillNumber: () => ipcRenderer.invoke('receipts:getNextBillNumber'),
  saveReceipt: (receiptData) => ipcRenderer.invoke('receipts:save', receiptData),
  updateReceipt: (receiptData) => ipcRenderer.invoke('receipts:update', receiptData),
  getReceipts: () => ipcRenderer.invoke('receipts:get'),
  getReceiptById: (id) => ipcRenderer.invoke('receipts:getById', id),
  deleteReceipt: (id) => ipcRenderer.invoke('receipts:delete', id),

  // Printing
  printReceipt: () => ipcRenderer.invoke('receipts:print'),

  // Reports & Receipts Export
  getMonthlyReport: (params) => ipcRenderer.invoke('reports:getMonthly', params),
  saveReportCsv: (data) => ipcRenderer.invoke('reports:saveCsv', data),
  saveReportPdf: (data) => ipcRenderer.invoke('reports:savePdf', data),
  saveReceiptPdf: (data) => ipcRenderer.invoke('reports:savePdf', data),

  // Info
  getDbInfo: () => ipcRenderer.invoke('app:getDbInfo'),
});
