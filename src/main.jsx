import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Graceful fallback for browser preview when outside Electron
if (typeof window !== 'undefined' && !window.api) {
  const getStorage = (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  };
  const setStorage = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  const defaultDoctors = [
    { id: 1, name: 'Dr. Gokul, M.D.S.', clinic_name: 'Gokul Dental Clinic' },
    { id: 2, name: 'Dr. Vaishnavi, M.D.S.', clinic_name: 'Gokul Dental Clinic' },
    { id: 3, name: 'Dr. Shivaponappan, M.D.S.', clinic_name: 'Senthil Dental Clinic' },
    { id: 4, name: 'Dr. Narendran, M.D.S.', clinic_name: 'Maran Dental Clinic' },
    { id: 5, name: 'Dr. Shahila, M.D.S.', clinic_name: 'Annu Dental Clinic' },
    { id: 6, name: 'Dr. Neelakandan, M.D.S.', clinic_name: 'Ramachandra Dental Clinic' },
    { id: 7, name: 'Dr. Robert Jayachandran', clinic_name: 'Ramachandra Dental Clinic' },
    { id: 8, name: 'Dr. Muthu Vignesh, M.D.S.', clinic_name: 'Muthu Dental Clinic' },
    { id: 9, name: 'Dr. Sadhuriya, M.D.S.', clinic_name: 'Saravana Dental Clinic' },
    { id: 10, name: 'Dr. Gurusanth, M.D.S.', clinic_name: 'Sridar Dental Clinic' },
    { id: 11, name: 'Dr. Nijin, M.D.S.', clinic_name: 'Yahweh Dental Clinic' },
    { id: 12, name: 'Dr. Vijay, M.D.S.', clinic_name: 'Lakshmi Dental Clinic' },
    { id: 13, name: 'Dr. Priyadarshini, M.D.S.', clinic_name: 'MS Dental Clinic' },
    { id: 14, name: 'Dr. Arivendran, M.D.S.', clinic_name: 'Vaigai Dental Clinic' },
    { id: 15, name: 'Dr. Prabhakaran, M.D.S.', clinic_name: 'JK Dental Clinic' },
    { id: 16, name: 'Dr. Jeeva Pandi, M.D.S.', clinic_name: 'RR Dental Clinic' },
    { id: 17, name: 'Dr. Sai Ram, M.D.S.', clinic_name: 'Sai Dental Clinic' },
    { id: 18, name: 'Dr. Senthil, M.D.S.', clinic_name: 'Om Muruga Dental Clinic' },
    { id: 19, name: 'Dr. Mayuri, M.D.S.', clinic_name: 'PVM Dental Clinic' },
    { id: 20, name: 'Dr. Priyanka, M.D.S.', clinic_name: 'Ocean Dental Clinic' },
    { id: 21, name: 'Dr. Raja, M.D.S.', clinic_name: 'Valan Dental Clinic' },
    { id: 22, name: 'Dr. Selvamuthukumar, M.D.S.', clinic_name: 'Thaiailnayaki Dental Clinic' },
  ];

  const defaultClinics = [
    { id: 1, name: 'Gokul Dental Clinic', doctor_name: 'Dr. Gokul, M.D.S., Dr. Vaishnavi, M.D.S.' },
    { id: 2, name: 'Senthil Dental Clinic', doctor_name: 'Dr. Shivaponappan, M.D.S.' },
    { id: 3, name: 'Maran Dental Clinic', doctor_name: 'Dr. Narendran, M.D.S.' },
    { id: 4, name: 'Annu Dental Clinic', doctor_name: 'Dr. Shahila, M.D.S.' },
    { id: 5, name: 'Ramachandra Dental Clinic', doctor_name: 'Dr. Neelakandan, M.D.S., Dr. Robert Jayachandran' },
    { id: 6, name: 'Muthu Dental Clinic', doctor_name: 'Dr. Muthu Vignesh, M.D.S.' },
    { id: 7, name: 'Saravana Dental Clinic', doctor_name: 'Dr. Sadhuriya, M.D.S.' },
    { id: 8, name: 'Sridar Dental Clinic', doctor_name: 'Dr. Gurusanth, M.D.S.' },
    { id: 9, name: 'Yahweh Dental Clinic', doctor_name: 'Dr. Nijin, M.D.S.' },
    { id: 10, name: 'Lakshmi Dental Clinic', doctor_name: 'Dr. Vijay, M.D.S.' },
    { id: 11, name: 'MS Dental Clinic', doctor_name: 'Dr. Priyadarshini, M.D.S.' },
    { id: 12, name: 'Vaigai Dental Clinic', doctor_name: 'Dr. Arivendran, M.D.S.' },
    { id: 13, name: 'JK Dental Clinic', doctor_name: 'Dr. Prabhakaran, M.D.S.' },
    { id: 14, name: 'RR Dental Clinic', doctor_name: 'Dr. Jeeva Pandi, M.D.S.' },
    { id: 15, name: 'Sai Dental Clinic', doctor_name: 'Dr. Sai Ram, M.D.S.' },
    { id: 16, name: 'Om Muruga Dental Clinic', doctor_name: 'Dr. Senthil, M.D.S.' },
    { id: 17, name: 'PVM Dental Clinic', doctor_name: 'Dr. Mayuri, M.D.S.' },
    { id: 18, name: 'Ocean Dental Clinic', doctor_name: 'Dr. Priyanka, M.D.S.' },
    { id: 19, name: 'Valan Dental Clinic', doctor_name: 'Dr. Raja, M.D.S.' },
    { id: 20, name: 'Thaiailnayaki Dental Clinic', doctor_name: 'Dr. Selvamuthukumar, M.D.S.' },
  ];

  const normalizeWorkItem = (item) => {
    if (!item) return null;
    const workItem = (item.work_item ?? item.workItem ?? '').trim();
    const teethNumber = (item.teeth_number ?? item.teethNumber ?? '').trim();
    return {
      ...item,
      workItem,
      work_item: workItem,
      teethNumber,
      teeth_number: teethNumber,
      unit: Number(item.unit) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
    };
  };

  const normalizeReceipt = (r) => {
    if (!r) return null;
    const rawItems = Array.isArray(r.workItems) ? r.workItems : [];
    const workItems = rawItems.map(normalizeWorkItem);
    const billNumber = (r.bill_number ?? r.billNumber ?? '').trim();
    const jobNumber = (r.job_number ?? r.jobNumber ?? '').trim();
    const doctorName = (r.doctor_name ?? r.doctorName ?? '').trim();
    const clinicName = (r.clinic_name ?? r.clinicName ?? '').trim();
    const patientName = (r.patient_name ?? r.patientName ?? '').trim();
    const totalAmount = Number(r.total_amount ?? r.totalAmount) || 0;
    return {
      ...r,
      billNumber,
      bill_number: billNumber,
      jobNumber,
      job_number: jobNumber,
      doctorName,
      doctor_name: doctorName,
      clinicName,
      clinic_name: clinicName,
      patientName,
      patient_name: patientName,
      totalAmount,
      total_amount: totalAmount,
      workItems,
    };
  };

  const defaultReceipts = [];

  const getStoredReceipts = () => {
    const raw = getStorage('dental_receipts', defaultReceipts);
    return (raw || []).map(normalizeReceipt);
  };

  window.api = {
    getDoctors: async () => ({ success: true, data: getStorage('dental_doctors', defaultDoctors) }),
    addDoctor: async (name) => {
      const docs = getStorage('dental_doctors', defaultDoctors);
      const newDoc = { id: Date.now(), name };
      docs.push(newDoc);
      setStorage('dental_doctors', docs);
      return { success: true, data: newDoc };
    },
    deleteDoctor: async (id) => {
      let docs = getStorage('dental_doctors', defaultDoctors);
      docs = docs.filter((d) => d.id !== id);
      setStorage('dental_doctors', docs);
      return { success: true };
    },
    getClinics: async () => ({ success: true, data: getStorage('dental_clinics', defaultClinics) }),
    addClinic: async (name) => {
      const cls = getStorage('dental_clinics', defaultClinics);
      const newCl = { id: Date.now(), name };
      cls.push(newCl);
      setStorage('dental_clinics', cls);
      return { success: true, data: newCl };
    },
    deleteClinic: async (id) => {
      let cls = getStorage('dental_clinics', defaultClinics);
      cls = cls.filter((c) => c.id !== id);
      setStorage('dental_clinics', cls);
      return { success: true };
    },
    getReceipts: async () => ({ success: true, data: getStoredReceipts() }),
    getNextBillNumber: async () => {
      const recs = getStoredReceipts();
      let maxNum = 4999;
      for (const r of recs) {
        const raw = String(r.bill_number ?? r.billNumber ?? '').replace(/,/g, '').trim();
        const num = parseInt(raw, 10);
        if (!isNaN(num) && String(num) === raw) {
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      return { success: true, data: String(maxNum + 1) };
    },
    getReceiptById: async (id) => {
      const recs = getStoredReceipts();
      const rec = recs.find((r) => r.id === id);
      return { success: Boolean(rec), data: rec };
    },
    saveReceipt: async (receiptData) => {
      const recs = getStoredReceipts();
      let billNum = (receiptData.billNumber ?? receiptData.bill_number ?? '').trim();
      if (!billNum) {
        let maxNum = 4999;
        for (const r of recs) {
          const raw = String(r.bill_number ?? r.billNumber ?? '').replace(/,/g, '').trim();
          const num = parseInt(raw, 10);
          if (!isNaN(num) && String(num) === raw) {
            if (num > maxNum) maxNum = num;
          }
        }
        billNum = String(maxNum + 1);
      }
      const newRec = normalizeReceipt({
        ...receiptData,
        billNumber: billNum,
        bill_number: billNum,
        id: Date.now()
      });
      recs.unshift(newRec);
      setStorage('dental_receipts', recs);
      return { success: true, data: newRec, receiptId: newRec.id, billNumber: billNum };
    },
    updateReceipt: async (receiptData) => {
      const recs = getStoredReceipts();
      const updated = normalizeReceipt(receiptData);
      const idx = recs.findIndex((r) => r.id === receiptData.id);
      if (idx !== -1) recs[idx] = updated;
      setStorage('dental_receipts', recs);
      return { success: true, data: updated };
    },
    deleteReceipt: async (id) => {
      let recs = getStoredReceipts();
      recs = recs.filter((r) => r.id !== id);
      setStorage('dental_receipts', recs);
      return { success: true };
    },
    printReceipt: async () => {
      window.print();
      return { success: true };
    },
    getMonthlyReport: async ({ filterType, name, year, month }) => {
      const recs = getStoredReceipts();
      const monthStr = String(month).padStart(2, '0');
      const monthPattern = `${year}-${monthStr}`;
      const filtered = recs.filter((r) => {
        const matchesName =
          filterType === 'doctor'
            ? (r.doctor_name || r.doctorName) === name
            : (r.clinic_name || r.clinicName) === name;
        const matchesDate = r.date?.startsWith(monthPattern) || r.date?.startsWith(`${year}-${month}`);
        return matchesName && matchesDate;
      });
      return { success: true, data: filtered };
    },
    saveReportCsv: async () => ({ success: true }),
    saveReportPdf: async ({ defaultFileName }) => {
      window.print();
      return { success: true, filePath: defaultFileName || 'Monthly_Report.pdf' };
    },
    getDbInfo: async () => ({ success: true, data: { count: 4 } }),
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
