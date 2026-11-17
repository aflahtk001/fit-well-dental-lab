const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { app } = require('electron');

const INITIAL_SEED_DATA = [
  { doctor: 'Dr. Gokul, M.D.S.', clinic: 'Gokul Dental Clinic' },
  { doctor: 'Dr. Vaishnavi, M.D.S.', clinic: 'Gokul Dental Clinic' },
  { doctor: 'Dr. Shivaponappan, M.D.S.', clinic: 'Senthil Dental Clinic' },
  { doctor: 'Dr. Narendran, M.D.S.', clinic: 'Maran Dental Clinic' },
  { doctor: 'Dr. Shahila, M.D.S.', clinic: 'Annu Dental Clinic' },
  { doctor: 'Dr. Neelakandan, M.D.S.', clinic: 'Ramachandra Dental Clinic' },
  { doctor: 'Dr. Robert Jayachandran', clinic: 'Ramachandra Dental Clinic' },
  { doctor: 'Dr. Muthu Vignesh, M.D.S.', clinic: 'Muthu Dental Clinic' },
  { doctor: 'Dr. Sadhuriya, M.D.S.', clinic: 'Saravana Dental Clinic' },
  { doctor: 'Dr. Gurusanth, M.D.S.', clinic: 'Sridar Dental Clinic' },
  { doctor: 'Dr. Nijin, M.D.S.', clinic: 'Yahweh Dental Clinic' },
  { doctor: 'Dr. Vijay, M.D.S.', clinic: 'Lakshmi Dental Clinic' },
  { doctor: 'Dr. Priyadarshini, M.D.S.', clinic: 'MS Dental Clinic' },
  { doctor: 'Dr. Arivendran, M.D.S.', clinic: 'Vaigai Dental Clinic' },
  { doctor: 'Dr. Prabhakaran, M.D.S.', clinic: 'JK Dental Clinic' },
  { doctor: 'Dr. Jeeva Pandi, M.D.S.', clinic: 'RR Dental Clinic' },
  { doctor: 'Dr. Sai Ram, M.D.S.', clinic: 'Sai Dental Clinic' },
  { doctor: 'Dr. Senthil, M.D.S.', clinic: 'Om Muruga Dental Clinic' },
  { doctor: 'Dr. Mayuri, M.D.S.', clinic: 'PVM Dental Clinic' },
  { doctor: 'Dr. Priyanka, M.D.S.', clinic: 'Ocean Dental Clinic' },
  { doctor: 'Dr. Raja, M.D.S.', clinic: 'Valan Dental Clinic' },
  { doctor: 'Dr. Selvamuthukumar, M.D.S.', clinic: 'Thaiailnayaki Dental Clinic' },
];

let db = null;

function getDbPath() {
  const userDataPath = (app && typeof app.getPath === 'function')
    ? app.getPath('userData')
    : path.join(process.cwd(), 'database');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'dental_lab.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  console.log('Initializing SQLite database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      clinic_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      doctor_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL,
      date TEXT NOT NULL,
      job_number TEXT,
      doctor_name TEXT NOT NULL,
      clinic_name TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      signature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipt_work_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      work_item TEXT NOT NULL,
      teeth_number TEXT,
      unit REAL NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing databases
  try {
    const doctorCols = db.pragma('table_info(doctors)');
    if (!doctorCols.some((c) => c.name === 'clinic_name')) {
      db.exec('ALTER TABLE doctors ADD COLUMN clinic_name TEXT DEFAULT ""');
    }
    const clinicCols = db.pragma('table_info(clinics)');
    if (!clinicCols.some((c) => c.name === 'doctor_name')) {
      db.exec('ALTER TABLE clinics ADD COLUMN doctor_name TEXT DEFAULT ""');
    }
  } catch (err) {
    console.error('Migration warning (ignored):', err);
  }

  // Purge legacy dummy entries and temporary test receipts
  try {
    const DUMMY_DOCTOR_NAMES = [
      'Dr. Sarah Jenkins',
      'Dr. Sarah Mitchell',
      'Dr. Arvind Swaminathan',
      'Dr. Michael Chang',
    ];
    const DUMMY_CLINIC_NAMES = [
      'Smile Dental Clinic',
      'Smile Care Dental Clinic',
      'Apex Multispeciality Dental Hospital',
      'City Dental Center',
      'Apex Multispeciality Dental',
      'Smile Studio',
      'City Dental Care',
    ];

    const delDoc = db.prepare('DELETE FROM doctors WHERE name = ? COLLATE NOCASE');
    for (const d of DUMMY_DOCTOR_NAMES) {
      delDoc.run(d);
    }

    const delClin = db.prepare('DELETE FROM clinics WHERE name = ? COLLATE NOCASE');
    for (const c of DUMMY_CLINIC_NAMES) {
      delClin.run(c);
    }

    // Initialize db_meta table to track system migrations
    db.exec(`
      CREATE TABLE IF NOT EXISTS db_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // One-time wipe of initial development/temporary receipts so fresh installs are 100% clean
    const cleanedMeta = db.prepare("SELECT value FROM db_meta WHERE key = 'v1_production_ready_cleaned'").get();
    if (!cleanedMeta) {
      db.exec(`
        DELETE FROM receipt_work_items;
        DELETE FROM receipts;
        INSERT OR REPLACE INTO db_meta (key, value) VALUES ('v1_production_ready_cleaned', '1');
      `);
    }
  } catch (cleanErr) {
    console.error('Data cleanup error (ignored):', cleanErr.message);
  }

  // Seed initial list of 22 dentists and dental clinics
  try {
    const insertDoc = db.prepare(`
      INSERT INTO doctors (name, clinic_name)
      VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET clinic_name = excluded.clinic_name WHERE (clinic_name IS NULL OR clinic_name = '') AND excluded.clinic_name != ''
    `);
    const insertClinic = db.prepare(`
      INSERT INTO clinics (name, doctor_name)
      VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET doctor_name = excluded.doctor_name WHERE (doctor_name IS NULL OR doctor_name = '') AND excluded.doctor_name != ''
    `);

    // Group clinics with multiple practitioners (e.g., Gokul Dental Clinic, Ramachandra Dental Clinic)
    const clinicDocMap = new Map();
    for (const item of INITIAL_SEED_DATA) {
      if (item.clinic) {
        const list = clinicDocMap.get(item.clinic) || [];
        if (item.doctor && !list.includes(item.doctor)) {
          list.push(item.doctor);
        }
        clinicDocMap.set(item.clinic, list);
      }
    }

    const seedTx = db.transaction(() => {
      for (const item of INITIAL_SEED_DATA) {
        if (item.doctor) {
          insertDoc.run(item.doctor.trim(), (item.clinic || '').trim());
        }
      }
      for (const [clinicName, docs] of clinicDocMap.entries()) {
        insertClinic.run(clinicName.trim(), docs.join(', ').trim());
      }
    });

    seedTx();
  } catch (seedErr) {
    console.error('Seed initial data error (ignored):', seedErr.message);
  }

  console.log('Database initialized successfully.');
  return db;
}

function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

// Doctors operations
function getDoctors() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, name, clinic_name, created_at FROM doctors ORDER BY name ASC');
  return stmt.all();
}

function addDoctor(nameOrData, maybeClinicName) {
  const db = getDatabase();
  let name = '';
  let clinicName = '';

  if (typeof nameOrData === 'object' && nameOrData !== null) {
    name = (nameOrData.name || '').trim();
    clinicName = (nameOrData.clinicName ?? nameOrData.clinic_name ?? '').trim();
  } else {
    name = (nameOrData || '').trim();
    clinicName = (maybeClinicName || '').trim();
  }

  if (!name) {
    throw new Error('Doctor name is required.');
  }

  // If clinicName is provided, ensure clinic exists in clinics table too
  if (clinicName) {
    const existingClinic = db.prepare('SELECT id, doctor_name FROM clinics WHERE name = ? COLLATE NOCASE').get(clinicName);
    if (!existingClinic) {
      db.prepare('INSERT INTO clinics (name, doctor_name) VALUES (?, ?)').run(clinicName, name);
    } else if (!existingClinic.doctor_name || existingClinic.doctor_name.trim() === '') {
      db.prepare('UPDATE clinics SET doctor_name = ? WHERE id = ?').run(name, existingClinic.id);
    }
  }

  const existing = db.prepare('SELECT id, clinic_name FROM doctors WHERE name = ? COLLATE NOCASE').get(name);
  if (existing) {
    if (clinicName) {
      db.prepare('UPDATE doctors SET clinic_name = ? WHERE id = ?').run(clinicName, existing.id);
    }
    return { id: existing.id, name, clinic_name: clinicName || existing.clinic_name };
  }

  const stmt = db.prepare('INSERT INTO doctors (name, clinic_name) VALUES (?, ?)');
  const result = stmt.run(name, clinicName);
  return { id: result.lastInsertRowid, name, clinic_name: clinicName };
}

function updateDoctor({ id, name, clinicName }) {
  const db = getDatabase();
  const trimmedName = (name || '').trim();
  const trimmedClinic = (clinicName || '').trim();
  if (!id) throw new Error('Doctor ID is required for update.');
  if (!trimmedName) throw new Error('Doctor name is required.');

  if (trimmedClinic) {
    const existingClinic = db.prepare('SELECT id FROM clinics WHERE name = ? COLLATE NOCASE').get(trimmedClinic);
    if (!existingClinic) {
      db.prepare('INSERT INTO clinics (name) VALUES (?)').run(trimmedClinic);
    }
  }

  db.prepare('UPDATE doctors SET name = ?, clinic_name = ? WHERE id = ?').run(trimmedName, trimmedClinic, id);
  return { id, name: trimmedName, clinic_name: trimmedClinic };
}

function deleteDoctor(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM doctors WHERE id = ?');
  return stmt.run(id);
}

// Clinics operations
function getClinics() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, name, doctor_name, created_at FROM clinics ORDER BY name ASC');
  return stmt.all();
}

function addClinic(nameOrData, maybeDoctorName) {
  const db = getDatabase();
  let name = '';
  let doctorName = '';

  if (typeof nameOrData === 'object' && nameOrData !== null) {
    name = (nameOrData.name || '').trim();
    doctorName = (nameOrData.doctorName ?? nameOrData.doctor_name ?? '').trim();
  } else {
    name = (nameOrData || '').trim();
    doctorName = (maybeDoctorName || '').trim();
  }

  if (!name) {
    throw new Error('Clinic name is required.');
  }

  // If doctorName is provided, link or add doctor
  if (doctorName) {
    const existingDoc = db.prepare('SELECT id, clinic_name FROM doctors WHERE name = ? COLLATE NOCASE').get(doctorName);
    if (existingDoc) {
      db.prepare('UPDATE doctors SET clinic_name = ? WHERE id = ?').run(name, existingDoc.id);
    } else {
      db.prepare('INSERT INTO doctors (name, clinic_name) VALUES (?, ?)').run(doctorName, name);
    }
  }

  const existing = db.prepare('SELECT id, doctor_name FROM clinics WHERE name = ? COLLATE NOCASE').get(name);
  if (existing) {
    if (doctorName) {
      db.prepare('UPDATE clinics SET doctor_name = ? WHERE id = ?').run(doctorName, existing.id);
    }
    return { id: existing.id, name, doctor_name: doctorName || existing.doctor_name };
  }

  const stmt = db.prepare('INSERT INTO clinics (name, doctor_name) VALUES (?, ?)');
  const result = stmt.run(name, doctorName);
  return { id: result.lastInsertRowid, name, doctor_name: doctorName };
}

function updateClinic({ id, name, doctorName }) {
  const db = getDatabase();
  const trimmedName = (name || '').trim();
  const trimmedDoc = (doctorName || '').trim();
  if (!id) throw new Error('Clinic ID is required for update.');
  if (!trimmedName) throw new Error('Clinic name is required.');

  if (trimmedDoc) {
    const existingDoc = db.prepare('SELECT id, clinic_name FROM doctors WHERE name = ? COLLATE NOCASE').get(trimmedDoc);
    if (existingDoc) {
      db.prepare('UPDATE doctors SET clinic_name = ? WHERE id = ?').run(trimmedName, existingDoc.id);
    } else {
      db.prepare('INSERT INTO doctors (name, clinic_name) VALUES (?, ?)').run(trimmedDoc, trimmedName);
    }
  }

  db.prepare('UPDATE clinics SET name = ?, doctor_name = ? WHERE id = ?').run(trimmedName, trimmedDoc, id);
  return { id, name: trimmedName, doctor_name: trimmedDoc };
}

function deleteClinic(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM clinics WHERE id = ?');
  return stmt.run(id);
}

// Normalization helpers for consistent camelCase and snake_case API shapes
function normalizeWorkItem(item) {
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
}

function normalizeReceipt(r, rawItems = []) {
  if (!r) return null;
  const workItems = (rawItems || []).map(normalizeWorkItem);
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
}

// Receipts operations
function getNextBillNumber() {
  const db = getDatabase();
  const rows = db.prepare('SELECT bill_number FROM receipts').all();
  let maxNum = 4999;
  for (const r of rows) {
    const raw = String(r.bill_number ?? '').replace(/,/g, '').trim();
    const num = parseInt(raw, 10);
    if (!isNaN(num) && String(num) === raw) {
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return String(maxNum + 1);
}

function saveReceipt(receiptData) {
  const db = getDatabase();

  const insertReceipt = db.prepare(`
    INSERT INTO receipts (
      bill_number, date, job_number, doctor_name, clinic_name, patient_name, total_amount, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO receipt_work_items (
      receipt_id, work_item, teeth_number, unit, rate, amount
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const saveTx = db.transaction((data) => {
    let billNum = (data.billNumber ?? data.bill_number ?? '').trim();
    if (!billNum) {
      billNum = getNextBillNumber();
    }
    const jobNum = (data.jobNumber ?? data.job_number ?? '').trim();
    const docName = (data.doctorName ?? data.doctor_name ?? '').trim();
    const clinName = (data.clinicName ?? data.clinic_name ?? '').trim();
    const patName = (data.patientName ?? data.patient_name ?? '').trim();
    const totAmount = Number(data.totalAmount ?? data.total_amount) || 0;

    const result = insertReceipt.run(
      billNum,
      data.date || new Date().toISOString().split('T')[0],
      jobNum,
      docName,
      clinName,
      patName,
      totAmount,
      (data.signature || '').trim()
    );

    const receiptId = result.lastInsertRowid;

    // Auto-save doctor to directory if new
    if (docName) {
      try {
        const existingDoc = db.prepare('SELECT id, clinic_name FROM doctors WHERE name = ? COLLATE NOCASE').get(docName);
        if (!existingDoc) {
          db.prepare('INSERT INTO doctors (name, clinic_name) VALUES (?, ?)').run(docName, clinName);
        } else if (clinName && (!existingDoc.clinic_name || existingDoc.clinic_name.trim() === '')) {
          db.prepare('UPDATE doctors SET clinic_name = ? WHERE id = ?').run(clinName, existingDoc.id);
        }
      } catch (e) {}
    }

    // Auto-save clinic to directory if new
    if (clinName) {
      try {
        const existingClin = db.prepare('SELECT id, doctor_name FROM clinics WHERE name = ? COLLATE NOCASE').get(clinName);
        if (!existingClin) {
          db.prepare('INSERT INTO clinics (name, doctor_name) VALUES (?, ?)').run(clinName, docName);
        } else if (docName && (!existingClin.doctor_name || existingClin.doctor_name.trim() === '')) {
          db.prepare('UPDATE clinics SET doctor_name = ? WHERE id = ?').run(docName, existingClin.id);
        }
      } catch (e) {}
    }

    if (Array.isArray(data.workItems)) {
      for (const item of data.workItems) {
        insertItem.run(
          receiptId,
          ((item.workItem ?? item.work_item) || '').trim(),
          ((item.teethNumber ?? item.teeth_number) || '').trim(),
          Number(item.unit) || 0,
          Number(item.rate) || 0,
          Number(item.amount) || 0
        );
      }
    }

    return { receiptId, billNumber: billNum };
  });

  const txResult = saveTx(receiptData);
  return { success: true, receiptId: txResult.receiptId, billNumber: txResult.billNumber };
}

function getReceipts() {
  const db = getDatabase();
  const receipts = db.prepare('SELECT * FROM receipts ORDER BY id DESC').all();
  const getItems = db.prepare('SELECT * FROM receipt_work_items WHERE receipt_id = ?');

  return receipts.map(r => normalizeReceipt(r, getItems.all(r.id)));
}

function getReceiptById(id) {
  const db = getDatabase();
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
  if (!receipt) return null;
  const items = db.prepare('SELECT * FROM receipt_work_items WHERE receipt_id = ?').all(id);
  return normalizeReceipt(receipt, items);
}

function deleteReceipt(id) {
  const db = getDatabase();
  return db.prepare('DELETE FROM receipts WHERE id = ?').run(id);
}

function updateReceipt(receiptData) {
  const db = getDatabase();

  const updateStmt = db.prepare(`
    UPDATE receipts SET
      bill_number = ?, date = ?, job_number = ?, doctor_name = ?,
      clinic_name = ?, patient_name = ?, total_amount = ?, signature = ?
    WHERE id = ?
  `);

  const deleteItems = db.prepare('DELETE FROM receipt_work_items WHERE receipt_id = ?');

  const insertItem = db.prepare(`
    INSERT INTO receipt_work_items (
      receipt_id, work_item, teeth_number, unit, rate, amount
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateTx = db.transaction((data) => {
    const billNum = (data.billNumber ?? data.bill_number ?? '').trim();
    const jobNum = (data.jobNumber ?? data.job_number ?? '').trim();
    const docName = (data.doctorName ?? data.doctor_name ?? '').trim();
    const clinName = (data.clinicName ?? data.clinic_name ?? '').trim();
    const patName = (data.patientName ?? data.patient_name ?? '').trim();
    const totAmount = Number(data.totalAmount ?? data.total_amount) || 0;

    updateStmt.run(
      billNum,
      data.date || new Date().toISOString().split('T')[0],
      jobNum,
      docName,
      clinName,
      patName,
      totAmount,
      (data.signature || '').trim(),
      data.id
    );

    deleteItems.run(data.id);

    if (Array.isArray(data.workItems)) {
      for (const item of data.workItems) {
        insertItem.run(
          data.id,
          ((item.workItem ?? item.work_item) || '').trim(),
          ((item.teethNumber ?? item.teeth_number) || '').trim(),
          Number(item.unit) || 0,
          Number(item.rate) || 0,
          Number(item.amount) || 0
        );
      }
    }
  });

  updateTx(receiptData);
  return { success: true };
}

// Monthly Reports operations
function getMonthlyReport({ filterType, name, year, month }) {
  const db = getDatabase();
  const monthStr = String(month).padStart(2, '0');
  const monthPattern = `${year}-${monthStr}%`;

  let query = 'SELECT * FROM receipts WHERE date LIKE ?';
  const params = [monthPattern];

  if (filterType === 'doctor' && name) {
    const docRow = db.prepare('SELECT clinic_name FROM doctors WHERE name = ? COLLATE NOCASE').get(name);
    const linkedClinic = (docRow?.clinic_name || '').trim();
    if (linkedClinic) {
      query += " AND (LOWER(TRIM(doctor_name)) = LOWER(TRIM(?)) OR (LOWER(TRIM(clinic_name)) = LOWER(TRIM(?)) AND (doctor_name = '' OR doctor_name IS NULL OR LOWER(TRIM(doctor_name)) = LOWER(TRIM(?)))))";
      params.push(name, linkedClinic, name);
    } else {
      query += ' AND LOWER(TRIM(doctor_name)) = LOWER(TRIM(?))';
      params.push(name);
    }
  } else if (filterType === 'clinic' && name) {
    const clinRow = db.prepare('SELECT doctor_name FROM clinics WHERE name = ? COLLATE NOCASE').get(name);
    let linkedDoc = (clinRow?.doctor_name || '').trim();
    if (!linkedDoc) {
      const docMatch = db.prepare('SELECT name FROM doctors WHERE clinic_name = ? COLLATE NOCASE LIMIT 1').get(name);
      if (docMatch?.name) linkedDoc = docMatch.name.trim();
    }
    if (linkedDoc) {
      query += " AND (LOWER(TRIM(clinic_name)) = LOWER(TRIM(?)) OR (LOWER(TRIM(doctor_name)) = LOWER(TRIM(?)) AND (clinic_name = '' OR clinic_name IS NULL OR LOWER(TRIM(clinic_name)) = LOWER(TRIM(?)))))";
      params.push(name, linkedDoc, name);
    } else {
      query += ' AND LOWER(TRIM(clinic_name)) = LOWER(TRIM(?))';
      params.push(name);
    }
  }

  query += ' ORDER BY date ASC, id ASC';

  const receipts = db.prepare(query).all(...params);
  const getItems = db.prepare('SELECT * FROM receipt_work_items WHERE receipt_id = ?');

  return receipts.map(r => normalizeReceipt(r, getItems.all(r.id)));
}

module.exports = {
  initDatabase,
  getDoctors,
  addDoctor,
  updateDoctor,
  deleteDoctor,
  getClinics,
  addClinic,
  updateClinic,
  deleteClinic,
  saveReceipt,
  updateReceipt,
  getNextBillNumber,
  getReceipts,
  getReceiptById,
  deleteReceipt,
  getMonthlyReport,
  getDbPath,
  getDatabase,
};
